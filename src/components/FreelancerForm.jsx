import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../hooks/useToast.jsx";
import {
  FILE_UPLOAD_CONFIG,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  createEmptyFreelancerFormValues,
  mapFormValuesToPayload,
  validateFreelancerForm,
  isValidFileType,
  isValidFileSize,
  formatFileSize,
  getPresignedUrl,
  uploadFileToS3,
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

// File Upload Component with drag & drop
const FileUploadZone = ({
  config,
  file,
  uploadedUrl,
  uploadProgress,
  uploadError,
  isUploading,
  onFileSelect,
  onRemove,
  disabled,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles?.length > 0) {
        onFileSelect(droppedFiles[0]);
      }
    },
    [disabled, isUploading, onFileSelect]
  );

  const handleInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const hasPreview = file || uploadedUrl;
  const isImage = file?.type?.startsWith("image/") || uploadedUrl?.match(/\.(jpg|jpeg|png|webp|heic)$/i);

  return (
    <div className="group relative">
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragOver
            ? "border-violet-400 bg-violet-50/80 scale-[1.02]"
            : hasPreview
            ? "border-emerald-300 bg-emerald-50/50"
            : "border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30"
          }
          ${disabled || isUploading ? "cursor-not-allowed opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {/* Upload Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeDasharray={`${uploadProgress}, 100`}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-600">
                {uploadProgress}%
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">Uploading...</p>
          </div>
        )}

        {/* Preview or Upload Prompt */}
        <div className="p-6">
          {hasPreview ? (
            <div className="flex items-center gap-4">
              {isImage ? (
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-inner">
                  <img
                    src={file ? URL.createObjectURL(file) : uploadedUrl}
                    alt={config.label}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl">
                  📄
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {file?.name || config.label}
                </p>
                {file && (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Uploaded
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 text-4xl">{config.icon}</div>
              <p className="text-base font-semibold text-slate-900">{config.label}</p>
              <p className="mt-1 text-sm text-slate-500">{config.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Drag & drop or click to upload</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                JPEG, PNG, WebP, HEIC or PDF • Max {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {uploadError}
        </p>
      )}

      {/* Remove Button */}
      {hasPreview && !isUploading && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Progress Step Indicator
const StepIndicator = ({ currentStep, totalSteps = 3 }) => {
  const steps = [
    { number: 1, label: "Profile", description: "Basic info & documents" },
    { number: 2, label: "Services", description: "What you offer" },
    { number: 3, label: "Schedule", description: "Your availability" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {steps.slice(0, totalSteps).map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`
                flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300
                ${currentStep === step.number
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                  : currentStep > step.number
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-500"
                }
              `}
            >
              {currentStep > step.number ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700 hidden sm:block">{step.label}</p>
            <p className="text-[10px] text-slate-500 hidden sm:block">{step.description}</p>
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`
                mx-2 h-0.5 w-8 sm:w-16 transition-all duration-300
                ${currentStep > step.number ? "bg-emerald-500" : "bg-slate-200"}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
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

  // File upload states
  const [uploadStates, setUploadStates] = useState({});

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

  // File upload handler
  const handleFileSelect = useCallback(
    async (config, file) => {
      const { name, urlField, apiFileName } = config;

      // Validate file
      if (!isValidFileType(file)) {
        setUploadStates((prev) => ({
          ...prev,
          [name]: { error: "Invalid file type. Please use JPEG, PNG, WebP, HEIC or PDF." },
        }));
        return;
      }

      if (!isValidFileSize(file)) {
        setUploadStates((prev) => ({
          ...prev,
          [name]: { error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.` },
        }));
        return;
      }

      // Start upload
      setUploadStates((prev) => ({
        ...prev,
        [name]: { file, progress: 0, isUploading: true, error: null },
      }));

      try {
        // Get presigned URL
        setUploadStates((prev) => ({
          ...prev,
          [name]: { ...prev[name], progress: 20 },
        }));

        const { presignedUrl } = await getPresignedUrl(
          authenticatedFetch,
          file,
          apiFileName
        );

        // Upload to S3
        setUploadStates((prev) => ({
          ...prev,
          [name]: { ...prev[name], progress: 50 },
        }));

        await uploadFileToS3(presignedUrl, file);

        // Extract the clean S3 URL by removing query parameters from the presigned URL
        // presignedUrl looks like: https://bucket.s3.amazonaws.com/users/123/cpr_front?X-Amz-Algorithm=...
        // We want: https://bucket.s3.amazonaws.com/users/123/cpr_front
        const cleanUrl = presignedUrl.split("?")[0];

        logger.info("File uploaded successfully", {
          fileName: apiFileName,
          cleanUrl,
        });

        // Update form values with the clean URL (no query params)
        setFormValues((prev) => ({
          ...prev,
          [urlField]: cleanUrl,
        }));

        setUploadStates((prev) => ({
          ...prev,
          [name]: { file, progress: 100, isUploading: false, error: null, uploaded: true },
        }));

        toast?.success?.({
          message: `${config.label} uploaded successfully!`,
        });
      } catch (error) {
        logger.error("File upload failed", { error, fileName: apiFileName });
        setUploadStates((prev) => ({
          ...prev,
          [name]: {
            file: null,
            progress: 0,
            isUploading: false,
            error: error?.payload?.error || error?.message || "Upload failed. Please try again.",
          },
        }));
        toast?.error?.({
          message: `Failed to upload ${config.label}`,
        });
      }
    },
    [authenticatedFetch, toast]
  );

  const handleFileRemove = useCallback(
    (config) => {
      const { name, urlField } = config;
      setUploadStates((prev) => ({
        ...prev,
        [name]: { file: null, progress: 0, isUploading: false, error: null, uploaded: false },
      }));
      setFormValues((prev) => ({
        ...prev,
        [urlField]: "",
      }));
    },
    []
  );

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
      <section className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          <p className="text-lg font-medium text-slate-600">Checking your freelancer profile...</p>
        </div>
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

  const isAnyUploading = Object.values(uploadStates).some((state) => state?.isUploading);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 p-8 shadow-2xl shadow-violet-500/25 sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Freelancer Onboarding
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {isScheduleStep
                ? "Set Your Schedule"
                : isServicesStep
                ? "Add Your Services"
                : "Create Your Profile"}
            </h1>
            <p className="max-w-xl text-base text-white/80 sm:text-lg">
              {isScheduleStep
                ? "Define your weekly availability so clients know when they can book you."
                : isServicesStep
                ? "Showcase what you offer so clients can choose the right service."
                : "Complete your profile with documents and professional information to get started."}
            </p>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
          <StepIndicator currentStep={activeStep} />
        </div>

        {/* Schedule Step */}
        {isScheduleStep && (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6 flex items-start gap-4 rounded-2xl bg-emerald-50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                🎉
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Your services are published!</p>
                <p className="text-sm text-emerald-700">
                  Set up your weekly availability so clients know when they can book you.
                </p>
              </div>
            </div>
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
          </div>
        )}

        {/* Services Step */}
        {isServicesStep && (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6 flex items-start gap-4 rounded-2xl bg-violet-50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">
                ✨
              </div>
              <div>
                <p className="font-semibold text-violet-800">Profile created successfully!</p>
                <p className="text-sm text-violet-700">
                  Add at least one service so clients know what you offer.
                </p>
              </div>
            </div>
            {servicesSubmitError && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {servicesSubmitError}
              </div>
            )}
            <FreelancerServicesForm
              onSubmit={handleServicesSubmit}
              isSubmitting={isServicesSubmitting}
            />
          </div>
        )}

        {/* Profile Step (Step 1) */}
        {!isServicesStep && !isScheduleStep && (
          <>
            {/* Notices */}
            {showMissingNotice && (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                  📝
                </div>
                <div>
                  <p className="font-semibold text-amber-800">Complete your freelancer profile</p>
                  <p className="text-sm text-amber-700">
                    We couldn&apos;t find a freelancer profile for your account. Fill out the form below to get started.
                  </p>
                </div>
              </div>
            )}

            {showErrorNotice && (
              <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg">
                  ⚠️
                </div>
                <div>
                  <p className="font-semibold text-red-800">Something went wrong</p>
                  <p className="text-sm text-red-700">
                    {fetchError?.message || "We ran into a problem. Please complete the form below to continue."}
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* Availability Section */}
              <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/50">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg">
                    ⚙️
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Availability Settings</h2>
                    <p className="text-sm text-slate-500">Control how clients find and interact with you</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30">
                    <div>
                      <p className="font-medium text-slate-900">Accept new orders</p>
                      <p className="text-sm text-slate-500">Allow clients to send you booking requests</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="isAcceptingOrders"
                        checked={formValues.isAcceptingOrders}
                        onChange={handleFieldChange}
                        disabled={disableProfileForm}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-violet-500 peer-disabled:opacity-60" />
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30">
                    <div>
                      <p className="font-medium text-slate-900">Public profile</p>
                      <p className="text-sm text-slate-500">Make your profile discoverable by clients</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={formValues.isPublic}
                        onChange={handleFieldChange}
                        disabled={disableProfileForm}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-violet-500 peer-disabled:opacity-60" />
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>
              </div>

              {/* Professional Info Section */}
              <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/50">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-lg">
                    💼
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Professional Information</h2>
                    <p className="text-sm text-slate-500">Tell clients about your experience and skills</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <label htmlFor="years_of_experience" className="block text-sm font-medium text-slate-700">
                      Years of experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="years_of_experience"
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      value={formValues.yearsOfExperience}
                      onChange={handleFieldChange}
                      disabled={disableProfileForm}
                      required
                      inputMode="numeric"
                      placeholder="e.g. 5"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:opacity-60"
                    />
                    {formErrors.yearsOfExperience && (
                      <p className="flex items-center gap-1.5 text-sm text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formErrors.yearsOfExperience}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formValues.bio}
                      onChange={handleFieldChange}
                      disabled={disableProfileForm}
                      placeholder="Tell clients about your experience, specialties, and what makes you unique (minimum 10 characters)..."
                      rows={4}
                      minLength={10}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:opacity-60"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Minimum 10 characters</span>
                      <span>{formValues.bio.length} characters</span>
                    </div>
                    {formErrors.bio && (
                      <p className="flex items-center gap-1.5 text-sm text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formErrors.bio}
                      </p>
                    )}
                  </div>

                  {/* Certifications */}
                  <div className="space-y-2">
                    <label htmlFor="certifications" className="block text-sm font-medium text-slate-700">
                      Certifications
                    </label>
                    <textarea
                      id="certifications"
                      name="certifications"
                      value={formValues.certifications}
                      onChange={handleFieldChange}
                      disabled={disableProfileForm}
                      placeholder="List your certifications, one per line or comma-separated (e.g. First Aid, PMP, Scrum Master)"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:opacity-60"
                    />
                    <p className="text-xs text-slate-400">Separate multiple certifications with commas or new lines</p>
                  </div>
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/50">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg">
                    📄
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Identity Documents</h2>
                    <p className="text-sm text-slate-500">Upload your verification documents securely</p>
                  </div>
                </div>

                <div className="mb-6 flex items-start gap-3 rounded-2xl bg-blue-50 p-4">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Secure & Private</p>
                    <p>Your documents are encrypted and stored securely. We only use them for verification purposes.</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {FILE_UPLOAD_CONFIG.map((config) => {
                    const uploadState = uploadStates[config.name] || {};
                    return (
                      <FileUploadZone
                        key={config.name}
                        config={config}
                        file={uploadState.file}
                        uploadedUrl={formValues[config.urlField]}
                        uploadProgress={uploadState.progress || 0}
                        uploadError={uploadState.error}
                        isUploading={uploadState.isUploading || false}
                        onFileSelect={(file) => handleFileSelect(config, file)}
                        onRemove={() => handleFileRemove(config)}
                        disabled={disableProfileForm}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-end">
                {isAnyUploading && (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading files...
                  </p>
                )}
                <button
                  type="submit"
                  disabled={disableProfileForm || isAnyUploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-xl hover:shadow-violet-500/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating profile...
                    </>
                  ) : (
                    <>
                      Save and continue
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
