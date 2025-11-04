import {
  useEffect,
  useLayoutEffect as useEffectLayout,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { isOnboarded } from "../utils/session";
import AddressForm from "./address/AddressForm.jsx";
import { useToast } from "../hooks/useToast.jsx";

const LOG_PREFIX = "[Onboarding]";

const log = (...args) => {
  if (typeof console !== "undefined") {
    console.debug(LOG_PREFIX, ...args);
  }
};

const warn = (...args) => {
  if (typeof console !== "undefined") {
    console.warn(LOG_PREFIX, ...args);
  }
};

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
  log("Parsing error message", { status, hasPayload: Boolean(payload) });
  if (payload) {
    if (typeof payload === "string") {
      log("Error payload is string", { payload });
      return payload;
    }

    const messageCandidates = [
      payload.detail,
      payload.message,
      payload.error_description,
      payload.error,
    ].filter((value) => typeof value === "string" && value.trim().length > 0);

    if (messageCandidates.length > 0) {
      log("Resolved error message from payload", {
        candidate: messageCandidates[0],
      });
      return messageCandidates[0];
    }
  }

  if (status === 401) {
    log("401 encountered while parsing error message");
    return "Your session expired. Please sign in again.";
  }

  log("Falling back to default error message", { fallback });
  return fallback;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { accessToken, user, setAccessToken, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const refreshAttemptRef = useRef(false);
  const [activeStep, setActiveStep] = useState("profile");

  useEffect(() => {
    if (!user) {
      log("No authenticated user detected; redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    if (isOnboarded(user) && activeStep !== "address") {
      log("Authenticated user completed onboarding; redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [activeStep, navigate, user]);

  useEffectLayout(() => {
    log("Effect start", {
      hasAccessToken: Boolean(accessToken),
      hasUser: Boolean(user),
    });

    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
      log("Effect cleanup invoked; cancelling outstanding work");
    };

    if (accessToken && refreshAttemptRef.current) {
      log("Access token detected; resetting refresh attempt flag");
      refreshAttemptRef.current = false;
    }

    const applyUserToForm = (candidate) => {
      if (!candidate) {
        return;
      }

      log("Applying user to form", {
        hasFullName: Boolean(candidate.full_name),
        hasGender: Boolean(candidate.gender),
        hasAvatar: Boolean(candidate.avatar_url),
        role: candidate.role,
      });

      setForm((previous) => {
        const next = {
          ...previous,
          full_name: candidate.full_name ?? previous.full_name,
          gender: candidate.gender ?? previous.gender,
          avatar_url: candidate.avatar_url ?? previous.avatar_url,
          role: candidate.role ?? previous.role,
        };

        if (
          next.full_name === previous.full_name &&
          next.gender === previous.gender &&
          next.avatar_url === previous.avatar_url &&
          next.role === previous.role
        ) {
          log("No changes detected while applying user to form");
          return previous;
        }

        log("Form updated from user payload", {
          nextFullName: next.full_name,
          nextGender: next.gender,
          nextAvatarUrl: Boolean(next.avatar_url),
          nextRole: next.role,
        });
        return next;
      });
    };

    const contextUser = user ?? null;
    if (contextUser) {
      log("User present in context", {
        completedOnboarding: isOnboarded(contextUser),
        role: contextUser.role,
      });
      applyUserToForm(contextUser);

      if (isOnboarded(contextUser) && activeStep !== "address") {
        log("User already completed onboarding; redirecting to dashboard");
        navigate("/dashboard", { replace: true });
        return cleanup;
      }
    }

    const ensureAccessToken = async () => {
      if (cancelled) {
        return null;
      }

      if (accessToken) {
        log("Access token already available; skipping refresh");
        return accessToken;
      }

      if (refreshAttemptRef.current) {
        log("Access token refresh already attempted; skipping");
        return null;
      }

      refreshAttemptRef.current = true;
      log("Attempting to refresh access token for onboarding flow");
      const refreshed = await authenticatedFetch.refreshSession();

      if (cancelled) {
        return null;
      }

      if (!refreshed) {
        log("Access token refresh failed");
        if (!contextUser) {
          log("No user context available; redirecting to login");
          navigate("/login", { replace: true });
        }
        return null;
      }

      log("Access token refreshed for onboarding flow");
      return refreshed;
    };

    const run = async () => {
      const token = await ensureAccessToken();

      if (cancelled) {
        return;
      }

      if (contextUser) {
        log("User already resolved; skipping remote fetch");
        setError(null);
        return;
      }

      if (!token) {
        log("Unable to resolve access token; skipping remote fetch");
        return;
      }

      log("Clearing previous error state");
      setError(null);

      try {
        log("User load initiated");
        const payload = await authenticatedFetch.requestJson(
          "/users/me",
          {
            method: "GET",
            credentials: "include",
          }
        );

        log("Fetched user payload", {
          hasPayload: Boolean(payload),
        });
        const fetchedUser = payload?.user ?? payload ?? null;

        if (!fetchedUser || typeof fetchedUser !== "object") {
          throw new Error("Missing user payload");
        }

        if (cancelled) {
          log("Fetch aborted after cancellation");
          return;
        }

        log("Setting resolved user from API", {
          hasFetchedUser: Boolean(fetchedUser),
        });
        setUser(fetchedUser);
        applyUserToForm(fetchedUser);

        if (isOnboarded(fetchedUser) && activeStep !== "address") {
          log("Fetched user completed onboarding; redirecting to dashboard");
          navigate("/dashboard", { replace: true });
        }
      } catch (loadError) {
        if (!cancelled) {
          warn("Failed to load user", loadError);
          setAccessToken(null);
          setUser(null);
          log("Navigating to login after load failure");
          navigate("/login", { replace: true });
        }
      }
    };

    run();

    return cleanup;
  }, [
    accessToken,
    activeStep,
    authenticatedFetch,
    navigate,
    setAccessToken,
    setUser,
    user,
  ]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    log("Field changed", {
      name,
      type,
      isChecked: type === "checkbox" ? checked : undefined,
    });
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      log("Submission blocked", {
        hasAccessToken: Boolean(accessToken),
        submitting,
      });
      return;
    }

    let activeToken = accessToken;

    if (!activeToken) {
      log("No access token detected before onboarding submission; attempting refresh");
      activeToken = await authenticatedFetch.refreshSession();

      if (!activeToken) {
        log("Unable to refresh access token prior to submission; redirecting to login");
        navigate("/login", { replace: true });
        return;
      }
    }

    log("Starting submission", { form });
    setSubmitting(true);
    setError(null);

    try {
      const payload = await authenticatedFetch.requestJson(
        "/users/me/onboarding",
        {
          method: "PUT",
          credentials: "include",
          body: JSON.stringify(form),
        },
        { tokenOverride: activeToken }
      ).catch(async (error) => {
        const message = parseErrorMessage(
          error.status,
          error.payload,
          "Failed to complete onboarding"
        );
        throw new Error(message);
      });
      log("Submission succeeded", {
        hasPayload: Boolean(payload),
      });
      const nextToken = payload?.access_token ?? accessToken;
      const nextUser = payload?.user;

      setAccessToken(nextToken);
      log("Access token updated after submission", {
        hasNextToken: Boolean(nextToken),
      });

      if (nextUser === null) {
        log("Server cleared user object");
        setUser(null);
      } else {
        let resolvedUser = null;

        if (nextUser !== undefined) {
          log("Using user from payload");
          resolvedUser = { ...nextUser };
        } else if (user && typeof user === "object") {
          log("Merging existing user with form state");
          resolvedUser = { ...user, ...form };
        } else {
          log("Falling back to form state for user");
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

          resolvedUser.completed_onboarding = true;
          resolvedUser.completedOnboarding = true;

          log("Setting resolved user after submission", {
            role: resolvedUser.role,
            completedOnboarding: resolvedUser.completed_onboarding,
          });
          setUser(resolvedUser);
        }
      }

      setForm(() => ({ ...defaultFormState }));
      log("Form reset to default state");

      toast.success({
        title: "Profile saved",
        message: "Great! Now add your address to finish onboarding.",
      });

      setActiveStep("address");
      log("Advancing to address step");
    } catch (submissionError) {
      warn("Submission failed", submissionError);
      const message = submissionError?.message ?? "Failed to complete onboarding";
      setError(message);
      toast.error({
        title: "Onboarding failed",
        message,
      });
    } finally {
      log("Submission finished");
      setSubmitting(false);
    }
  };

  const handleAddressSuccess = async (addressPayload) => {
    log("Address step completed", { hasAddress: Boolean(addressPayload) });

    const resolvedUser = user ? { ...user } : {};
    resolvedUser.completed_onboarding = true;
    resolvedUser.completedOnboarding = true;
    if (addressPayload && typeof resolvedUser === "object") {
      resolvedUser.default_address = addressPayload;
    }

    setUser(resolvedUser);

    toast.success({
      title: "All set",
      message: "Your address is saved. Redirecting to dashboard...",
    });

    navigate("/dashboard", { replace: true });
  };

  const buttonLabel = useMemo(
    () => (submitting ? "Submitting..." : "Next"),
    [submitting]
  );

  log("Rendering onboarding form", {
    submitting,
    hasError: Boolean(error),
    hasAccessToken: Boolean(accessToken),
    activeStep,
  });
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        padding: 24,
      }}
    >
      {activeStep === "profile" ? (
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
      ) : (
        <div style={{ width: "100%", maxWidth: 720 }}>
          <h1 style={{ marginBottom: 16 }}>Add your default address</h1>
          <AddressForm
            className="form address-form"
            submitLabel="Save and finish"
            submittingLabel="Saving address..."
            onSuccess={handleAddressSuccess}
          />
        </div>
      )}
    </div>
  );
}

