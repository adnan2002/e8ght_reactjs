import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { extractFreelancerProfile } from "../utils/freelancer";

const FREELANCER_FORM_LOG_PREFIX = "[FreelancerForm]";

const logger = {
  info: (...args) => {
    console.log(FREELANCER_FORM_LOG_PREFIX, ...args);
  },
  warn: (...args) => {
    console.warn(FREELANCER_FORM_LOG_PREFIX, ...args);
  },
  error: (...args) => {
    console.error(FREELANCER_FORM_LOG_PREFIX, ...args);
  },
};

const normaliseOptionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normaliseCertificationsInput = (value) => {
  const raw = normaliseOptionalString(value);
  if (!raw) {
    return null;
  }

  const entries = raw
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : null;
};

const isValidUrlString = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const URL_FIELD_CONFIG = [
  {
    name: "cprFrontUrl",
    label: "CPR front image URL",
    payloadKey: "cpr_front_url",
  },
  {
    name: "cprBackUrl",
    label: "CPR back image URL",
    payloadKey: "cpr_back_url",
  },
  {
    name: "passportUrl",
    label: "Passport image URL",
    payloadKey: "passport_url",
  },
  {
    name: "selfiePhotoUrl",
    label: "Selfie photo URL",
    payloadKey: "selfie_photo_url",
  },
];

const INITIAL_FORM_VALUES = {
  isAcceptingOrders: false,
  isPublic: false,
  bio: "",
  yearsOfExperience: "",
  certifications: "",
  cprFrontUrl: "",
  cprBackUrl: "",
  passportUrl: "",
  selfiePhotoUrl: "",
};

const mapFormValuesToPayload = (values) => {
  const years = Number.parseInt(values.yearsOfExperience, 10);

  const payload = {
    is_accepting_orders: Boolean(values.isAcceptingOrders),
    is_public: Boolean(values.isPublic),
    bio: normaliseOptionalString(values.bio),
    years_of_experience: Number.isNaN(years) ? 0 : years,
    certifications: normaliseCertificationsInput(values.certifications),
  };

  URL_FIELD_CONFIG.forEach(({ name, payloadKey }) => {
    payload[payloadKey] = normaliseOptionalString(values[name]);
  });

  return payload;
};

const deriveErrorMessage = (candidate, fallback) => {
  if (candidate == null) {
    return fallback;
  }
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate;
  }
  return fallback;
};

export default function FreelancerForm() {
  const {
    user,
    freelancerProfile,
    setFreelancerProfile,
    freelancerProfileStatus,
    setFreelancerProfileStatus,
  } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();
  const navigate = useNavigate();
  const [fetchError, setFetchError] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitStatus, setSubmitStatus] = useState("idle");

  const isFreelancer = user?.role === "freelancer";
  const isSubmitting = submitStatus === "submitting";
  const fetchGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    logger.info("FreelancerForm component mounted");
    return () => {
      isMountedRef.current = false;
      logger.info("FreelancerForm component unmounted");
    };
  }, []);

  logger.info("Render cycle", {
    userRole: user?.role ?? null,
    profileStatus: freelancerProfileStatus,
    hasProfile: Boolean(freelancerProfile),
    isLoadingProfile: freelancerProfileStatus === "loading",
    submitStatus,
  });

  const shouldRequestProfile = useMemo(
    () =>
      Boolean(
        isFreelancer &&
          freelancerProfileStatus === "unknown"
      ),
    [freelancerProfileStatus, isFreelancer]
  );

  useEffect(() => {
    logger.info("shouldRequestProfile recalculated", {
      shouldRequestProfile,
      freelancerProfileStatus,
      isFreelancer,
    });
  }, [shouldRequestProfile, freelancerProfileStatus, isFreelancer]);

  useEffect(() => {
    if (!shouldRequestProfile) {
      logger.info(
        "Skipping freelancer profile fetch effect because shouldRequestProfile is false",
        {
          freelancerProfileStatus,
          isFreelancer,
        }
      );
      return;
    }

    const generation = ++fetchGenerationRef.current;
    const fetchFreelancerProfile = async () => {
      logger.info("Initiating freelancer profile fetch request", {
        generation,
      });
      setFetchError(null);
      setFreelancerProfileStatus("loading");

      try {
        const response = await authenticatedFetch("/users/me/freelancer/", {
          method: "GET",
        });

        if (
          !isMountedRef.current ||
          fetchGenerationRef.current !== generation
        ) {
          logger.warn(
            "Freelancer profile fetch resolved for stale generation; ignoring response",
            {
              generation,
              activeGeneration: fetchGenerationRef.current,
            }
          );
          return;
        }

        logger.info("Freelancer profile fetch response received", {
          status: response.status,
        });

        if (response.ok) {
          const payload = await response
            .clone()
            .json()
            .catch((jsonError) => {
              logger.warn("Failed to parse freelancer payload", {
                jsonError,
              });
              return null;
            });

          const profile = extractFreelancerProfile(payload);

          if (profile) {
            logger.info("Freelancer profile retrieved successfully", {
              profileId: profile?.id ?? null,
            });
            setFreelancerProfile(profile);
            setFreelancerProfileStatus("ready");
            navigate("/dashboard/freelancer", { replace: true });
            return;
          }

          logger.warn(
            "Freelancer profile payload missing in successful response"
          );

          setFreelancerProfile(null);
          setFreelancerProfileStatus("missing");
          setFetchError(
            new Error("Freelancer profile payload missing from response.")
          );
          return;
        }

        if (response.status === 401 || response.status === 403) {
          logger.warn(
            "Freelancer profile request unauthorized; redirecting to login",
            { status: response.status }
          );
          setFreelancerProfile(null);
          setFreelancerProfileStatus("unauthorized");
          setFetchError(
            new Error("You must be signed in as a freelancer to continue.")
          );
          return;
        }

        if (response.status === 404) {
          logger.info(
            "Freelancer profile not found (404); marking status as missing"
          );
          setFreelancerProfile(null);
          setFreelancerProfileStatus("missing");
          return;
        }

        logger.error("Unhandled freelancer profile fetch response", {
          status: response.status,
        });
        setFreelancerProfile(null);
        setFreelancerProfileStatus("error");
        setFetchError(
          new Error(`Freelancer profile request failed (${response.status}).`)
        );
      } catch (error) {
        if (
          !isMountedRef.current ||
          fetchGenerationRef.current !== generation
        ) {
          logger.warn(
            "Freelancer profile fetch errored for stale generation; ignoring error",
            {
              generation,
              activeGeneration: fetchGenerationRef.current,
              error,
            }
          );
          return;
        }
        logger.error("Freelancer profile fetch errored", { error });
        setFreelancerProfile(null);
        setFreelancerProfileStatus("error");
        setFetchError(error);
      }
    };

    fetchFreelancerProfile();
  }, [
    authenticatedFetch,
    setFreelancerProfile,
    setFreelancerProfileStatus,
    shouldRequestProfile,
    navigate,
    isFreelancer,
    freelancerProfileStatus,
  ]);

  const handleFieldChange = (event) => {
    const { name, type, value, checked } = event.target;
    const nextValue = type === "checkbox" ? Boolean(checked) : value;
    logger.info("Field change detected", {
      fieldName: name,
      fieldType: type,
      nextValue,
    });
    setFormValues((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  const validateForm = (values) => {
    const errors = {};

    const years = Number.parseInt(values.yearsOfExperience, 10);
    if (Number.isNaN(years) || years < 0) {
      errors.yearsOfExperience = "Years of experience must be zero or greater.";
    }

    const bioValue = normaliseOptionalString(values.bio);
    if (bioValue && bioValue.length < 10) {
      errors.bio = "Bio must contain at least 10 characters.";
    }

    URL_FIELD_CONFIG.forEach(({ name }) => {
      const raw = normaliseOptionalString(values[name]);
      if (raw && !isValidUrlString(raw)) {
        errors[name] = "Please enter a valid http(s) URL.";
      }
    });

    const errorKeys = Object.keys(errors);
    logger.info("Form validation complete", {
      hasErrors: errorKeys.length > 0,
      errorKeys,
    });

    return errors;
  };

  const handleSubmit = async (event) => {
    logger.info("Submit event received");
    event.preventDefault();
    if (isSubmitting) {
      logger.warn("Submission ignored because a submission is already in progress");
      return;
    }

    setSubmitError(null);
    setFormErrors({});
    logger.info("Cleared previous submit errors");

    const validationErrors = validateForm(formValues);
    const validationErrorKeys = Object.keys(validationErrors);
    if (validationErrorKeys.length > 0) {
      logger.warn("Form submission blocked due to validation errors", {
        validationErrorKeys,
      });
      setFormErrors(validationErrors);
      setSubmitStatus("invalid");
      return;
    }

    setSubmitStatus("submitting");
    logger.info("Form submission validated; status set to submitting");

    try {
      const payload = mapFormValuesToPayload(formValues);
      logger.info("Submitting freelancer profile payload", { payload });
      const responsePayload = await authenticatedFetch.requestJson(
        "/users/me/freelancer/",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const createdProfile = extractFreelancerProfile(responsePayload);
      if (!createdProfile) {
        logger.error(
          "Server response missing freelancer profile after submission"
        );
        throw new Error("Freelancer profile missing from server response.");
      }

      logger.info("Freelancer profile submission succeeded", {
        profileId: createdProfile?.id ?? null,
      });
      setFreelancerProfile(createdProfile);
      setFreelancerProfileStatus("ready");
      setFetchError(null);
      setSubmitStatus("success");
      toast?.success?.({
        message: "Freelancer profile created successfully.",
      });
      navigate("/dashboard/freelancer", { replace: true });
      return;
    } catch (error) {
      const statusCode =
        error?.status ??
        error?.response?.status ??
        error?.payload?.status ??
        null;

      logger.error("Freelancer profile submission failed", {
        statusCode,
        error,
      });

      if (statusCode === 401 || statusCode === 403) {
        logger.warn("Submission unauthorized; resetting auth state");
        setFreelancerProfile(null);
        setFreelancerProfileStatus("unauthorized");
        setSubmitStatus("failed");
        return;
      }

      if (statusCode === 404) {
        logger.warn("Submission response 404; marking profile as missing");
        setFreelancerProfile(null);
        setFreelancerProfileStatus("missing");
      } else if (statusCode === 409) {
        logger.warn(
          "Submission response conflict (409); marking status as error"
        );
        setFreelancerProfile(null);
        setFreelancerProfileStatus("error");
      } else if (statusCode && statusCode >= 500) {
        logger.error("Submission response server error", { statusCode });
        setFreelancerProfile(null);
        setFreelancerProfileStatus("error");
      } else {
        logger.warn(
          "Submission failed with unhandled status; marking as missing",
          { statusCode }
        );
        setFreelancerProfile(null);
        setFreelancerProfileStatus("missing");
      }

      const backendMessage =
        error?.payload?.error ??
        error?.payload?.message ??
        error?.message ??
        null;
      const message = deriveErrorMessage(
        backendMessage,
        statusCode === 409
          ? "A freelancer profile already exists for this account."
          : "Unable to create freelancer profile. Please review the information and try again."
      );

      setSubmitError(message);
      toast?.error?.({
        message,
      });
      setSubmitStatus("failed");
    } finally {
      logger.info("Submission handler cleanup starting");
      setSubmitStatus((previous) => {
        if (previous === "success") {
          logger.info("Submit status remains success after cleanup");
          return previous;
        }

        logger.info("Resetting submit status to idle after cleanup", {
          previousStatus: previous,
        });
        return "idle";
      });
    }
  };

  useEffect(() => {
    if (freelancerProfileStatus === "ready" && freelancerProfile) {
      logger.info(
        "Detected ready freelancer profile in status effect; navigating to dashboard",
        {
          profileId: freelancerProfile?.id ?? null,
        }
      );
      navigate("/dashboard/freelancer", { replace: true });
    }
  }, [freelancerProfileStatus, freelancerProfile, navigate]);

  if (!user) {
    logger.info("No authenticated user detected; redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isFreelancer) {
    logger.warn("Authenticated user is not a freelancer; redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  if (freelancerProfileStatus === "unauthorized") {
    logger.warn("Freelancer profile status unauthorized; redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (freelancerProfileStatus === "ready" && freelancerProfile) {
    logger.info(
      "Freelancer profile already ready in render; redirecting to dashboard"
    );
    return <Navigate to="/dashboard/freelancer" replace />;
  }

  if (
    freelancerProfileStatus === "loading" ||
    freelancerProfileStatus === "unknown"
  ) {
    logger.info("Freelancer profile check in progress; showing loading state", {
      status: freelancerProfileStatus,
    });
    return (
      <section className="page freelancer-form">
        <h1>Freelancer Form</h1>
        <p>Checking your freelancer profile...</p>
      </section>
    );
  }

  const showErrorNotice = freelancerProfileStatus === "error";
  const showMissingNotice = freelancerProfileStatus === "missing";
  const disableForm =
    isSubmitting || freelancerProfileStatus === "loading";

  logger.info("Render state flags computed", {
    showErrorNotice,
    showMissingNotice,
    disableForm,
    hasFetchError: Boolean(fetchError),
    hasSubmitError: Boolean(submitError),
  });

  return (
    <section className="page freelancer-form">
      <h1>Freelancer Form</h1>
      {showMissingNotice && (
        <p>
          We couldn't find a freelancer profile for your account. Please
          complete the form below to continue.
        </p>
      )}
      {showErrorNotice && (
        <p>
          We ran into a problem while checking your freelancer profile. Complete
          the form below to finish setting things up.
        </p>
      )}
      {fetchError && showErrorNotice && (
        <p className="notice error">{fetchError.message}</p>
      )}
      {submitError && <p className="notice error">{submitError}</p>}
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={disableForm}>
          <legend>Availability</legend>
          <label className="field checkbox">
            <input
              type="checkbox"
              name="isAcceptingOrders"
              checked={formValues.isAcceptingOrders}
              onChange={handleFieldChange}
            />
            <span>I am currently accepting new orders</span>
          </label>
          <label className="field checkbox">
            <input
              type="checkbox"
              name="isPublic"
              checked={formValues.isPublic}
              onChange={handleFieldChange}
            />
            <span>Make my freelancer profile public</span>
          </label>
        </fieldset>

        <div className="field">
          <label htmlFor="years_of_experience">Years of experience</label>
          <input
            id="years_of_experience"
            name="yearsOfExperience"
            type="number"
            min="0"
            value={formValues.yearsOfExperience}
            onChange={handleFieldChange}
            required
            inputMode="numeric"
          />
          {formErrors.yearsOfExperience && (
            <p className="field-error">{formErrors.yearsOfExperience}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={formValues.bio}
            onChange={handleFieldChange}
            placeholder="Tell clients about your experience (minimum 10 characters)."
            minLength={10}
          />
          {formErrors.bio && <p className="field-error">{formErrors.bio}</p>}
        </div>

        <div className="field">
          <label htmlFor="certifications">
            Certifications (comma or line separated)
          </label>
          <textarea
            id="certifications"
            name="certifications"
            value={formValues.certifications}
            onChange={handleFieldChange}
            placeholder="e.g. First Aid, PMP, Scrum Master"
          />
        </div>

        {URL_FIELD_CONFIG.map(({ name, label }) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              type="url"
              value={formValues[name]}
              onChange={handleFieldChange}
              placeholder="https://example.com/resource"
              inputMode="url"
            />
            {formErrors[name] && (
              <p className="field-error">{formErrors[name]}</p>
            )}
          </div>
        ))}

        <div className="actions">
          <button type="submit" disabled={disableForm}>
            {isSubmitting ? "Submitting…" : "Create Freelancer Profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

