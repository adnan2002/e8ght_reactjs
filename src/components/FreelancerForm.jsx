import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../hooks/useToast.jsx";
import {
  URL_FIELD_CONFIG,
  createEmptyFreelancerFormValues,
  mapFormValuesToPayload,
  validateFreelancerForm,
} from "./freelancer/formHelpers.js";
import { extractFreelancerProfile } from "../utils/freelancer";
import FreelancerServicesForm from "./FreelancerServicesForm.jsx";
import FreelancerScheduleForm from "./FreelancerScheduleForm.jsx";

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
    setFreelancerServices,
    freelancerProfileStatus,
    setFreelancerProfileStatus,
  } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();
  const navigate = useNavigate();
  const [fetchError, setFetchError] = useState(null);
  const [formValues, setFormValues] = useState(() => createEmptyFreelancerFormValues());
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [activeStep, setActiveStep] = useState(1);
  const [hasCreatedProfile, setHasCreatedProfile] = useState(false);
  const [servicesSubmitStatus, setServicesSubmitStatus] = useState("idle");
  const [servicesSubmitError, setServicesSubmitError] = useState(null);

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
    activeStep,
    hasCreatedProfile,
    servicesSubmitStatus,
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

    const validationErrors = validateFreelancerForm(formValues);
    const validationErrorKeys = Object.keys(validationErrors);
    logger.info("Form validation complete", {
      hasErrors: validationErrorKeys.length > 0,
      errorKeys: validationErrorKeys,
    });

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
      setFreelancerProfileStatus("services_pending");
      setFreelancerServices(null);
      setFetchError(null);
      setSubmitStatus("success");
      setHasCreatedProfile(true);
      setActiveStep(2);
      setServicesSubmitStatus("idle");
      setServicesSubmitError(null);
      toast?.success?.({
        message:
          "Freelancer profile created successfully. Add your services to finish.",
      });
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

  const isServicesSubmitting = servicesSubmitStatus === "submitting";

  const handleServicesSubmit = async (servicesPayload) => {
    logger.info("Services submit event received", {
      activeStep,
      servicesCount: Array.isArray(servicesPayload)
        ? servicesPayload.length
        : null,
    });

    if (activeStep !== 2) {
      logger.warn("Services submission blocked because active step is not 2", {
        activeStep,
      });
      return;
    }

    if (isServicesSubmitting) {
      logger.warn(
        "Services submission ignored because a submission is already in progress"
      );
      return;
    }

    if (!Array.isArray(servicesPayload) || servicesPayload.length === 0) {
      logger.warn("Services submission blocked due to empty payload");
      setServicesSubmitError(
        "Please add at least one service before continuing."
      );
      return;
    }

    setServicesSubmitError(null);
    setServicesSubmitStatus("submitting");

    try {
      const responsePayload = await authenticatedFetch.requestJson(
        "/users/me/freelancer/services/",
        {
          method: "POST",
          body: JSON.stringify(servicesPayload),
        }
      );

      const createdServices = Array.isArray(responsePayload?.services)
        ? responsePayload.services
        : [];

      logger.info("Freelancer services submission succeeded", {
        servicesCount: createdServices.length,
      });

      setFreelancerServices(createdServices);
      setServicesSubmitStatus("success");
      setFreelancerProfileStatus("ready");
      toast?.success?.({
        message:
          createdServices.length === 1
            ? "Service created successfully. Next, set your schedule."
            : "Services created successfully. Next, set your schedule.",
      });
      setActiveStep(3);
    } catch (error) {
      const statusCode =
        error?.status ??
        error?.response?.status ??
        error?.payload?.status ??
        null;

      logger.error("Freelancer services submission failed", {
        statusCode,
        error,
      });

      if (statusCode === 401 || statusCode === 403) {
        setFreelancerProfile(null);
        setFreelancerProfileStatus("unauthorized");
        setFreelancerServices(null);
        setServicesSubmitStatus("failed");
        return;
      }

      if (statusCode === 404) {
        setFreelancerProfileStatus("missing");
      } else if (statusCode === 409) {
        setFreelancerProfileStatus("error");
      } else if (statusCode && statusCode >= 500) {
        setFreelancerProfileStatus("error");
      }

      const backendMessage =
        error?.payload?.error ??
        error?.payload?.message ??
        error?.message ??
        null;

      const message = deriveErrorMessage(
        backendMessage,
        "Unable to save your services. Please review the details and try again."
      );

      setServicesSubmitError(message);
      toast?.error?.({
        message,
      });
      setServicesSubmitStatus("failed");
    } finally {
      setServicesSubmitStatus((previous) => {
        if (previous === "success") {
          return previous;
        }
        if (previous === "failed") {
          return previous;
        }
        return "idle";
      });
    }
  };

  useEffect(() => {
    if (
      freelancerProfileStatus === "ready" &&
      freelancerProfile &&
      !hasCreatedProfile
    ) {
      logger.info(
        "Detected ready freelancer profile in status effect; navigating to dashboard",
        {
          profileId: freelancerProfile?.id ?? null,
        }
      );
      navigate("/dashboard/freelancer", { replace: true });
    }
  }, [
    freelancerProfileStatus,
    freelancerProfile,
    navigate,
    hasCreatedProfile,
  ]);

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

  if (
    freelancerProfileStatus === "ready" &&
    freelancerProfile &&
    !hasCreatedProfile
  ) {
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
  const isServicesStep = activeStep === 2;
  const isScheduleStep = activeStep === 3;
  const disableProfileForm =
    activeStep !== 1 ||
    isSubmitting ||
    freelancerProfileStatus === "loading";

  logger.info("Render state flags computed", {
    showErrorNotice,
    showMissingNotice,
    disableProfileForm,
    isServicesStep,
    hasFetchError: Boolean(fetchError),
    hasSubmitError: Boolean(submitError),
    hasServicesSubmitError: Boolean(servicesSubmitError),
  });

  const stepSubtitle = isScheduleStep
    ? "Step 3 of 3 • Set your weekly schedule"
    : isServicesStep
    ? "Step 2 of 3 • Add your services"
    : "Step 1 of 3 • Create your freelancer profile";

  return (
    <section className="page freelancer-form">
      <header className="page-header">
        <h1>Freelancer Onboarding</h1>
        <p className="page-subtitle">{stepSubtitle}</p>
      </header>

      {isScheduleStep ? (
        <>
          <p>
            Your services are published. Set up your weekly availability so
            clients know when they can book you.
          </p>
          <FreelancerScheduleForm
            onSubmit={(payload) => {
              console.log("[FreelancerForm] Schedule saved", { payload });
              toast?.info?.({
                title: "Schedule saved",
                message:
                  "Schedule data logged to the console. Connect this to your API when ready.",
              });
            }}
          />
        </>
      ) : isServicesStep ? (
        <>
          <p>
            Great work! Your freelancer profile is ready. Add at least one
            service so clients know what you offer.
          </p>
          {servicesSubmitError && (
            <p className="notice error">{servicesSubmitError}</p>
          )}
          <FreelancerServicesForm
            onSubmit={handleServicesSubmit}
            isSubmitting={isServicesSubmitting}
          />
        </>
      ) : (
        <>
          {showMissingNotice && (
            <p>
              We couldn't find a freelancer profile for your account. Please
              complete the form below to continue.
            </p>
          )}
          {showErrorNotice && (
            <p>
              We ran into a problem while checking your freelancer profile.
              Complete the form below to finish setting things up.
            </p>
          )}
          {fetchError && showErrorNotice && (
            <p className="notice error">{fetchError.message}</p>
          )}
          {submitError && <p className="notice error">{submitError}</p>}
          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={disableProfileForm}>
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
              {formErrors.bio && (
                <p className="field-error">{formErrors.bio}</p>
              )}
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
              <button type="submit" disabled={disableProfileForm}>
                {isSubmitting ? "Submitting…" : "Save and continue"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

