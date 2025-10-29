import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useApiFetch } from "../hooks/useApiFetch.jsx";

const defaultFormState = Object.freeze({
  full_name: "",
  phone: "",
  nationality: "",
  date_of_birth: "",
  gender: "male",
  is_verified: true,
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

const tryParseJson = async (response) => {
  if (!response) return null;
  const contentType = response.headers?.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return response.json().catch(() => null);
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { accessToken, setAccessToken, setUser } = useAuth();
  const { putJson } = useApiFetch();

  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    setError(null);
  }, [accessToken, navigate]);

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
      const response = await putJson("/users/me/onboarding", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });

      if (!response?.ok) {
        const payload = await tryParseJson(response);
        const message = parseErrorMessage(
          response?.status,
          payload,
          "Failed to complete onboarding"
        );

        if (response?.status === 401) {
          setAccessToken(null);
          navigate("/login", { replace: true });
          return;
        }

        throw new Error(message);
      }

      const payload = await tryParseJson(response);
      const nextToken = payload?.access_token ?? accessToken;
      const nextUser = payload?.user;

      setAccessToken(nextToken);

      if (nextUser !== undefined) {
        setUser(nextUser ?? null);
      }

      setForm(() => ({ ...defaultFormState }));
      navigate("/dashboard", { replace: true });
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

        <label
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <input
            type="checkbox"
            name="is_verified"
            checked={form.is_verified}
            onChange={onChange}
          />
          <span>Account is verified</span>
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

