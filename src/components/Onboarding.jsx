import { useLayoutEffect as useEffectLayout, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { readStoredUser } from "../utils/storage";

const defaultFormState = Object.freeze({
  full_name: "",
  phone: "",
  nationality: "",
  date_of_birth: "",
  gender: "female",
  avatar_url: "",
  role: "customer",
});

const parseErrorMessage = (status, payload, fallback) => {
  if (payload) {
    if (typeof payload === "string") {
      return payload;
    }

    const messageCandidates = [
      payload.detail,
      payload.message,
      payload.error_description,
      payload.error,
    ].filter((value) => typeof value === "string" && value.trim().length > 0);

    if (messageCandidates.length > 0) {
      return messageCandidates[0];
    }
  }

  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }

  return fallback;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { accessToken, user, setAccessToken, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffectLayout(() => {
    const applyUserToForm = (user) => {
      if (!user) return;

      setForm((previous) => {
        const next = {
          ...previous,
          full_name: user.full_name ?? previous.full_name,
          gender: user.gender ?? previous.gender,
          avatar_url: user.avatar_url ?? previous.avatar_url,
          role: user.role ?? previous.role,
        };

        if (
          next.full_name === previous.full_name &&
          next.gender === previous.gender &&
          next.avatar_url === previous.avatar_url &&
          next.role === previous.role
        ) {
          return previous;
        }

        return next;
      });
    };

    if (user) {
      applyUserToForm(user);

      if (user.completed_onboarding) {
        navigate("/dashboard", { replace: true });
        return;
      }
    }

    const localUser = user ? null : readStoredUser();

    if (localUser) {
      applyUserToForm(localUser);

      if (localUser.completed_onboarding) {
        navigate("/dashboard", { replace: true });
        return;
      }
    }

    if (!accessToken) {
      if (!user && !localUser) {
        navigate("/login", { replace: true });
      }
      return;
    }

    setError(null);

    if (user || localUser) {
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me",
          {
            method: "GET",
            credentials: "include",
          }
        );
        const fetchedUser = payload?.user ?? payload ?? null;

        if (!fetchedUser || typeof fetchedUser !== "object") {
          throw new Error("Missing user payload");
        }

        if (cancelled) {
          return;
        }

          setUser(fetchedUser);
          applyUserToForm(fetchedUser);

          if (fetchedUser.completed_onboarding) {
            navigate("/dashboard", { replace: true });
          }
      } catch (loadError) {
        if (!cancelled) {
          console.warn("Failed to load user", loadError);
          setAccessToken(null);
          setUser(null);
          navigate("/login", { replace: true });
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authenticatedFetch, navigate, setAccessToken, setUser, user]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!accessToken || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = await authenticatedFetch.requestJson(
        "/users/me/onboarding",
        {
          method: "PUT",
          credentials: "include",
          body: JSON.stringify(form),
        }
      ).catch(async (error) => {
        const message = parseErrorMessage(
          error.status,
          error.payload,
          "Failed to complete onboarding"
        );
        throw new Error(message);
      });
      const nextToken = payload?.access_token ?? accessToken;
      const nextUser = payload?.user;

      setAccessToken(nextToken);

      if (nextUser === null) {
        setUser(null);
      } else {
        let resolvedUser = null;

        if (nextUser !== undefined) {
          resolvedUser = { ...nextUser };
        } else if (user && typeof user === "object") {
          resolvedUser = { ...user, ...form };
        } else {
          resolvedUser = { ...form };
        }

        if (resolvedUser) {
          const fallbackRole =
            typeof resolvedUser.role === "string" && resolvedUser.role.trim().length > 0
              ? resolvedUser.role
              : form.role;
          if (typeof fallbackRole === "string" && fallbackRole.trim().length > 0) {
            resolvedUser.role = fallbackRole.trim();
          }

          resolvedUser.completed_onboarding = true;
          resolvedUser.completedOnboarding = true;

          if (
            typeof resolvedUser.full_name !== "string" ||
            resolvedUser.full_name.trim().length === 0
          ) {
            resolvedUser.full_name = form.full_name;
          }

          if (
            typeof resolvedUser.gender !== "string" ||
            resolvedUser.gender.trim().length === 0
          ) {
            resolvedUser.gender = form.gender;
          }

          if (
            typeof resolvedUser.avatar_url !== "string" ||
            resolvedUser.avatar_url.trim().length === 0
          ) {
            resolvedUser.avatar_url = form.avatar_url;
          }

          setUser(resolvedUser);
        }
      }

      setForm(() => ({ ...defaultFormState }));

      const redirectCandidate = payload?.redirect_to;
      const redirectTo =
        typeof redirectCandidate === "string" ? redirectCandidate.trim() : "";

      if (redirectTo && !redirectTo.toLowerCase().startsWith("/login")) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (submissionError) {
      setError(submissionError?.message ?? "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const buttonLabel = useMemo(
    () => (submitting ? "Submitting..." : "Complete onboarding"),
    [submitting]
  );

  if (!accessToken) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        padding: 24,
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 480 }}>
        <h1 style={{ marginBottom: 16 }}>Complete your profile</h1>

        <label style={{ display: "block", marginBottom: 8 }}>
          Full name
          <input
            required
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            placeholder="John Doe"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Phone
          <input
            required
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="+1234567890"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Nationality
          <input
            required
            name="nationality"
            value={form.nationality}
            onChange={onChange}
            placeholder="Country"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Date of birth
          <input
            required
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Gender
          <select
            required
            name="gender"
            value={form.gender}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Avatar URL
          <input
            required
            type="url"
            name="avatar_url"
            value={form.avatar_url}
            onChange={onChange}
            placeholder="https://..."
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Role
          <select
            required
            name="role"
            value={form.role}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="customer">customer</option>
            <option value="freelancer">freelancer</option>
          </select>
        </label>

        {error && (
          <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: 12,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}

