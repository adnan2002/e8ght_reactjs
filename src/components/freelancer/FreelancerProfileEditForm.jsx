import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import {
  URL_FIELD_CONFIG,
  createEmptyFreelancerFormValues,
  mapFormValuesToPayload,
  mapFreelancerToFormValues,
  validateFreelancerForm,
} from "./formHelpers.js";
import { extractFreelancerProfile } from "../../utils/freelancer";

const LOG_PREFIX = "[FreelancerProfileEditForm]";

const logger = {
  info: (...args) => console.log(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
  error: (...args) => console.error(LOG_PREFIX, ...args),
};

const buildTouchedSnapshot = (template) =>
  Object.keys(template).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});

const areArraysEqual = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
};

const areValuesEqual = (left, right) => {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    return areArraysEqual(left, right);
  }

  return left === right;
};

const computeDiffPayload = (currentValues, baselineValues) => {
  const currentPayload = mapFormValuesToPayload(currentValues);
  const baselinePayload = mapFormValuesToPayload(baselineValues);

  return Object.keys(currentPayload).reduce((diff, key) => {
    const nextValue = currentPayload[key];
    const previousValue = baselinePayload[key];

    if (!areValuesEqual(nextValue, previousValue)) {
      diff[key] = nextValue;
    }

    return diff;
  }, {});
};

export default function FreelancerProfileEditForm({
  freelancer,
  onSuccess,
  className = "form freelancer-profile-form",
}) {
  const { setFreelancerProfile, setFreelancerProfileStatus } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [formValues, setFormValues] = useState(() =>
    mapFreelancerToFormValues(freelancer)
  );
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const baselineValuesRef = useRef(
    mapFreelancerToFormValues(freelancer) ?? createEmptyFreelancerFormValues()
  );

  useEffect(() => {
    const nextValues = mapFreelancerToFormValues(freelancer);
    logger.info("Freelancer profile received; updating form state", {
      hasFreelancer: Boolean(freelancer),
      nextValues,
    });
    baselineValuesRef.current =
      nextValues ?? createEmptyFreelancerFormValues();
    setFormValues(nextValues);
    setFormErrors({});
    setTouchedFields({});
  }, [freelancer]);

  const hasChanges = useMemo(() => {
    if (!freelancer) {
      return false;
    }
    const diff = computeDiffPayload(
      formValues,
      baselineValuesRef.current ?? createEmptyFreelancerFormValues()
    );
    return Object.keys(diff).length > 0;
  }, [formValues, freelancer]);

  const handleFieldChange = useCallback((event) => {
    const { name, type, value, checked } = event.target;
    const nextValue = type === "checkbox" ? Boolean(checked) : value;
    logger.info("Field change detected", { field: name, nextValue });
    setFormValues((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  }, []);

  const handleFieldBlur = useCallback((event) => {
    const { name } = event.target;
    setTouchedFields((previous) => ({
      ...previous,
      [name]: true,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!freelancer) {
        logger.warn("Submission blocked because freelancer profile is missing");
        return;
      }

      logger.info("Submission initiated");
      setFormErrors({});

      const validationErrors = validateFreelancerForm(formValues);
      if (Object.keys(validationErrors).length > 0) {
        logger.warn("Validation failed; aborting submission", {
          validationErrors,
        });
        setFormErrors(validationErrors);
        setTouchedFields((previous) => ({
          ...previous,
          ...buildTouchedSnapshot(formValues),
        }));
        toast.warning({
          title: "Please check the form",
          message:
            "Some fields need your attention before we can update your profile.",
        });
        return;
      }

      const diffPayload = computeDiffPayload(
        formValues,
        baselineValuesRef.current
      );

      if (Object.keys(diffPayload).length === 0) {
        logger.info("No changes detected; aborting submission");
        toast.info({
          title: "No changes detected",
          message: "Update a field before saving.",
        });
        return;
      }

      logger.info("Submitting freelancer profile update", {
        payload: diffPayload,
      });

      setSubmitting(true);

      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/",
          {
            method: "PATCH",
            body: JSON.stringify(diffPayload),
          }
        );

        const updatedFreelancer = extractFreelancerProfile(payload);
        if (!updatedFreelancer) {
          throw new Error(
            "Freelancer profile missing from update response payload."
          );
        }

        logger.info("Freelancer profile updated successfully", {
          profileId: updatedFreelancer?.id ?? null,
        });

        const nextBaseline = mapFreelancerToFormValues(updatedFreelancer);
        baselineValuesRef.current = nextBaseline;
        setFormValues(nextBaseline);
        setFormErrors({});
        setTouchedFields({});
        setFreelancerProfile(updatedFreelancer);
        setFreelancerProfileStatus("ready");

        toast.success({
          title: "Profile updated",
          message: "Your freelancer profile changes were saved.",
        });

        if (typeof onSuccess === "function") {
          await onSuccess(updatedFreelancer);
        }
      } catch (error) {
        logger.error("Failed to update freelancer profile", { error });
        const statusCode =
          error?.status ??
          error?.response?.status ??
          error?.payload?.status ??
          null;
        const payloadMessage =
          error?.payload?.error ??
          error?.payload?.message ??
          error?.payload?.detail ??
          error?.message ??
          null;

        toast.error({
          title: "Could not update profile",
          message:
            payloadMessage ??
            (statusCode === 401
              ? "Your session expired. Please sign in again."
              : "Please try again or contact support if the issue persists."),
        });

        if (statusCode === 401 || statusCode === 403) {
          setFreelancerProfile(null);
          setFreelancerProfileStatus("unauthorized");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      authenticatedFetch,
      formValues,
      freelancer,
      onSuccess,
      setFreelancerProfile,
      setFreelancerProfileStatus,
      toast,
    ]
  );

  const disableForm = submitting || !freelancer;

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      <fieldset disabled={disableForm}>
        <legend>Availability</legend>
        <label className="field checkbox">
          <input
            type="checkbox"
            name="isAcceptingOrders"
            checked={Boolean(formValues.isAcceptingOrders)}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
          />
          <span>I am currently accepting new orders</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            name="isPublic"
            checked={Boolean(formValues.isPublic)}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
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
          onBlur={handleFieldBlur}
          required
          inputMode="numeric"
          className={
            touchedFields.yearsOfExperience && formErrors.yearsOfExperience
              ? "input input-invalid"
              : "input"
          }
        />
        {touchedFields.yearsOfExperience && formErrors.yearsOfExperience ? (
          <p className="field-error">{formErrors.yearsOfExperience}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={formValues.bio}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
          placeholder="Tell clients about your experience (minimum 10 characters)."
          minLength={10}
          className={
            touchedFields.bio && formErrors.bio ? "input input-invalid" : "input"
          }
        />
        {touchedFields.bio && formErrors.bio ? (
          <p className="field-error">{formErrors.bio}</p>
        ) : null}
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
          onBlur={handleFieldBlur}
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
            onBlur={handleFieldBlur}
            placeholder="https://example.com/resource"
            inputMode="url"
            className={
              touchedFields[name] && formErrors[name]
                ? "input input-invalid"
                : "input"
            }
          />
          {touchedFields[name] && formErrors[name] ? (
            <p className="field-error">{formErrors[name]}</p>
          ) : null}
        </div>
      ))}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={disableForm}>
          {submitting
            ? "Saving changes…"
            : hasChanges
            ? "Save changes"
            : "No changes to save"}
        </button>
      </div>
    </form>
  );
}


