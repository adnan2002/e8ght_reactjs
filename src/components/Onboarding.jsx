import {
  useEffect,
  useLayoutEffect as useEffectLayout,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineGlobe,
  HiOutlineCalendar,
  HiOutlinePhotograph,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineBriefcase,
  HiOutlineShoppingBag,
  HiOutlineLocationMarker,
  HiOutlineSparkles,
} from "react-icons/hi";
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

// Step Indicator Component
function StepIndicator({ currentStep }) {
  const steps = [
    { id: "profile", label: "Profile", icon: HiOutlineUser },
    { id: "address", label: "Address", icon: HiOutlineLocationMarker },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="onboarding-steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="onboarding-step-wrapper">
            <div
              className={`onboarding-step ${isCurrent ? "onboarding-step--active" : ""} ${isCompleted ? "onboarding-step--completed" : ""}`}
            >
              <div className="onboarding-step__icon">
                {isCompleted ? <HiOutlineCheck size={20} /> : <Icon size={20} />}
              </div>
              <span className="onboarding-step__label">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`onboarding-step__connector ${isCompleted ? "onboarding-step__connector--completed" : ""}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { accessToken, user, setAccessToken, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
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
        const payload = await authenticatedFetch.requestJson("/users/me", {
          method: "GET",
          credentials: "include",
        });

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

  const handleFieldChange = (field, value) => {
    log("Field changed", { field });
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    if (error) setError(null);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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
      log(
        "No access token detected before onboarding submission; attempting refresh"
      );
      activeToken = await authenticatedFetch.refreshSession();

      if (!activeToken) {
        log(
          "Unable to refresh access token prior to submission; redirecting to login"
        );
        navigate("/login", { replace: true });
        return;
      }
    }

    log("Starting submission", { form });
    setSubmitting(true);
    setError(null);

    try {
      const payload = await authenticatedFetch
        .requestJson(
          "/users/me/onboarding",
          {
            method: "PUT",
            credentials: "include",
            body: JSON.stringify(form),
          },
          { tokenOverride: activeToken }
        )
        .catch(async (error) => {
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
            typeof resolvedUser.role === "string" &&
            resolvedUser.role.trim().length > 0
              ? resolvedUser.role
              : form.role;
          if (
            typeof fallbackRole === "string" &&
            fallbackRole.trim().length > 0
          ) {
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
      const message =
        submissionError?.message ?? "Failed to complete onboarding";
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
      title: "All set!",
      message: "Your address is saved. Redirecting to dashboard...",
    });

    navigate("/dashboard", { replace: true });
  };

  const buttonLabel = useMemo(
    () => (submitting ? "Saving profile..." : "Continue"),
    [submitting]
  );

  log("Rendering onboarding form", {
    submitting,
    hasError: Boolean(error),
    hasAccessToken: Boolean(accessToken),
    activeStep,
  });

  return (
    <div className="auth-page">
      <div className="auth-page__bg"></div>
      <div className="onboarding-container">
        {/* Header with Logo and Welcome */}
        <div className="onboarding-header">
          <div className="onboarding-header__icon">
            <HiOutlineSparkles size={32} />
          </div>
          <h1 className="onboarding-header__title">
            {activeStep === "profile"
              ? "Complete your profile"
              : "Add your address"}
          </h1>
          <p className="onboarding-header__subtitle">
            {activeStep === "profile"
              ? "Tell us a bit about yourself to get started with E8GHT"
              : "Add your default address to help us serve you better"}
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={activeStep} />

        {/* Main Content */}
        <div className="onboarding-content">
          {activeStep === "profile" ? (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="auth-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="8"
                      fill="currentColor"
                      opacity="0.15"
                    />
                    <path
                      d="M8 4v4m0 2.5v.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="auth-form__grid">
                {/* Full Name */}
                <div className="auth-field">
                  <label htmlFor="full_name" className="auth-label">
                    Full Name <span className="required-marker">*</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <HiOutlineUser className="auth-input-icon" />
                    <input
                      id="full_name"
                      type="text"
                      className={`auth-input${touched.full_name && !form.full_name ? " auth-input--error" : ""}`}
                      value={form.full_name}
                      onChange={(e) =>
                        handleFieldChange("full_name", e.target.value)
                      }
                      onBlur={() => handleBlur("full_name")}
                      placeholder="Jane Doe"
                      autoComplete="name"
                      required
                    />
                  </div>
                  {touched.full_name && !form.full_name && (
                    <small className="auth-field-error">
                      Full name is required
                    </small>
                  )}
                </div>

                {/* Phone */}
                <div className="auth-field">
                  <label htmlFor="phone" className="auth-label">
                    Phone Number <span className="required-marker">*</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <HiOutlinePhone className="auth-input-icon" />
                    <input
                      id="phone"
                      type="tel"
                      className={`auth-input${touched.phone && !form.phone ? " auth-input--error" : ""}`}
                      value={form.phone}
                      onChange={(e) =>
                        handleFieldChange("phone", e.target.value)
                      }
                      onBlur={() => handleBlur("phone")}
                      placeholder="+973 1234 5678"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {touched.phone && !form.phone && (
                    <small className="auth-field-error">
                      Phone number is required
                    </small>
                  )}
                </div>

                {/* Nationality */}
                <div className="auth-field">
                  <label htmlFor="nationality" className="auth-label">
                    Nationality <span className="required-marker">*</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <HiOutlineGlobe className="auth-input-icon" />
                    <input
                      id="nationality"
                      type="text"
                      className={`auth-input${touched.nationality && !form.nationality ? " auth-input--error" : ""}`}
                      value={form.nationality}
                      onChange={(e) =>
                        handleFieldChange("nationality", e.target.value)
                      }
                      onBlur={() => handleBlur("nationality")}
                      placeholder="e.g., Bahraini"
                      required
                    />
                  </div>
                  {touched.nationality && !form.nationality && (
                    <small className="auth-field-error">
                      Nationality is required
                    </small>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="auth-field">
                  <label htmlFor="date_of_birth" className="auth-label">
                    Date of Birth <span className="required-marker">*</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <HiOutlineCalendar className="auth-input-icon" />
                    <input
                      id="date_of_birth"
                      type="date"
                      className={`auth-input${touched.date_of_birth && !form.date_of_birth ? " auth-input--error" : ""}`}
                      value={form.date_of_birth}
                      onChange={(e) =>
                        handleFieldChange("date_of_birth", e.target.value)
                      }
                      onBlur={() => handleBlur("date_of_birth")}
                      required
                    />
                  </div>
                  {touched.date_of_birth && !form.date_of_birth && (
                    <small className="auth-field-error">
                      Date of birth is required
                    </small>
                  )}
                </div>
              </div>

              {/* Avatar URL - Full Width */}
              <div className="auth-field auth-field--full">
                <label htmlFor="avatar_url" className="auth-label">
                  Avatar URL <span className="required-marker">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <HiOutlinePhotograph className="auth-input-icon" />
                  <input
                    id="avatar_url"
                    type="url"
                    className={`auth-input${touched.avatar_url && !form.avatar_url ? " auth-input--error" : ""}`}
                    value={form.avatar_url}
                    onChange={(e) =>
                      handleFieldChange("avatar_url", e.target.value)
                    }
                    onBlur={() => handleBlur("avatar_url")}
                    placeholder="https://example.com/your-photo.jpg"
                    required
                  />
                </div>
                {touched.avatar_url && !form.avatar_url && (
                  <small className="auth-field-error">
                    Avatar URL is required
                  </small>
                )}
              </div>

              {/* Gender Selection */}
              <div className="role-selection">
                <p className="role-selection__label">
                  Gender <span className="required-marker">*</span>
                </p>
                <div className="role-selection__options">
                  <button
                    type="button"
                    className={`role-card${form.gender === "female" ? " role-card--active" : ""}`}
                    onClick={() => handleFieldChange("gender", "female")}
                  >
                    <span className="role-card__icon">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="5" />
                        <path d="M12 13v8M9 18h6" />
                      </svg>
                    </span>
                    <span className="role-card__content">
                      <span className="role-card__title">Female</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`role-card${form.gender === "male" ? " role-card--active" : ""}`}
                    onClick={() => handleFieldChange("gender", "male")}
                  >
                    <span className="role-card__icon">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="10" cy="14" r="5" />
                        <path d="M19 5l-5.4 5.4M19 5h-5M19 5v5" />
                      </svg>
                    </span>
                    <span className="role-card__content">
                      <span className="role-card__title">Male</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="role-selection">
                <p className="role-selection__label">
                  How would you like to use E8GHT?{" "}
                  <span className="required-marker">*</span>
                </p>
                <div className="role-selection__options">
                  <button
                    type="button"
                    className={`role-card${form.role === "customer" ? " role-card--active" : ""}`}
                    onClick={() => handleFieldChange("role", "customer")}
                  >
                    <span className="role-card__icon">
                      <HiOutlineShoppingBag size={24} />
                    </span>
                    <span className="role-card__content">
                      <span className="role-card__title">I'm a Customer</span>
                      <span className="role-card__desc">
                        Looking to book services
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`role-card${form.role === "freelancer" ? " role-card--active" : ""}`}
                    onClick={() => handleFieldChange("role", "freelancer")}
                  >
                    <span className="role-card__icon">
                      <HiOutlineBriefcase size={24} />
                    </span>
                    <span className="role-card__content">
                      <span className="role-card__title">I'm a Freelancer</span>
                      <span className="role-card__desc">
                        Want to offer my services
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={submitting}
              >
                <span>{buttonLabel}</span>
                {!submitting && <HiOutlineArrowRight />}
              </button>
            </form>
          ) : (
            <div className="onboarding-address">
              <div className="auth-success" role="status">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="10"
                    cy="10"
                    r="10"
                    fill="currentColor"
                    opacity="0.15"
                  />
                  <path
                    d="M6 10l3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Profile saved successfully!</span>
              </div>
              <AddressForm
                className="form address-form address-form--enhanced"
                submitLabel="Save address & finish"
                submittingLabel="Saving address..."
                onSuccess={handleAddressSuccess}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
