import { useCallback, useMemo, useState } from "react";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import {
  ADDRESS_TYPES,
  clampPrecision,
  DEFAULT_FORM,
  toNullableString,
  validateField,
  validateForm,
} from "./formUtils.js";
import { writeStoredAddress } from "../../utils/storage";

export default function AddressForm({
  className = "form address-form",
  submitLabel = "Save address",
  submittingLabel = "Saving address...",
  onSuccess,
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setFieldValue = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      const message = validateField(field, value ?? "");
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (field) => (event) => {
      const value = event?.target?.value ?? "";
      setFieldValue(field, value);
    },
    [setFieldValue]
  );

  const handleBlur = useCallback((field) => {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setTouched({});
    setErrors({});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setTouched((prev) => ({
      ...prev,
      ...Object.keys(DEFAULT_FORM).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    }));

    if (Object.keys(validationErrors).length > 0) {
      toast.warning({
        title: "Please check the form",
        message: "Some fields need your attention before we can save this address.",
      });
      return;
    }

    const latitude = clampPrecision(form.latitude);
    const longitude = clampPrecision(form.longitude);

    if (latitude == null || longitude == null) {
      toast.warning({
        title: "Invalid coordinates",
        message: "Latitude and longitude must be numeric values.",
      });
      return;
    }

    const requestBody = {
      address_label: form.addressLabel.trim(),
      address_type: form.addressType,
      address_line_1: form.addressLine1.trim(),
      address_line_2: toNullableString(form.addressLine2),
      town: toNullableString(form.town),
      governorate: toNullableString(form.governorate),
      country: form.country.trim(),
      road_number: toNullableString(form.roadNumber),
      latitude,
      longitude,
      additional_directions: toNullableString(form.additionalDirections),
    };

    setSubmitting(true);

    try {
      const response = await authenticatedFetch.requestJson("/users/me/addresses", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const addressPayload = response?.address ?? response ?? null;
      if (!addressPayload || typeof addressPayload !== "object") {
        throw new Error("Address payload missing in response");
      }

      try {
        writeStoredAddress(addressPayload);
      } catch (storageError) {
        console.warn("Failed to save address locally", storageError);
        toast.warning({
          title: "Saved but not cached",
          message: "The address was created, but we could not store it locally.",
        });
      }

      toast.success({
        title: "Address saved",
        message: "Your default address is now ready to use.",
      });

      resetForm();

      if (typeof onSuccess === "function") {
        await onSuccess(addressPayload);
      }
    } catch (error) {
      console.error("Failed to create address", error);

      const status = error?.status ?? null;
      const payloadMessage =
        error?.payload?.error ?? error?.payload?.message ?? error?.payload?.detail ?? null;

      toast.error({
        title: "Could not save address",
        message:
          payloadMessage ??
          (status === 401
            ? "Your session expired. Please sign in again."
            : "Please try again or contact support if the issue persists."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = useMemo(() => (touchedField, errorField) => {
    if (touchedField && errorField) {
      return "input input-invalid";
    }
    return "input";
  }, []);

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label className="label">
          <span>Address label</span>
          <input
            type="text"
            className={fieldClass(touched.addressLabel, errors.addressLabel)}
            value={form.addressLabel}
            onChange={handleChange("addressLabel")}
            onBlur={() => handleBlur("addressLabel")}
            placeholder="Home, Work, etc."
            minLength={2}
            required
          />
          {touched.addressLabel && errors.addressLabel ? (
            <small className="field-error">{errors.addressLabel}</small>
          ) : null}
        </label>

        <label className="label">
          <span>Address type</span>
          <select
            className={fieldClass(touched.addressType, errors.addressType)}
            value={form.addressType}
            onChange={handleChange("addressType")}
            onBlur={() => handleBlur("addressType")}
            required
          >
            {ADDRESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {touched.addressType && errors.addressType ? (
            <small className="field-error">{errors.addressType}</small>
          ) : null}
        </label>

        <label className="label">
          <span>Address line 1</span>
          <input
            type="text"
            className={fieldClass(touched.addressLine1, errors.addressLine1)}
            value={form.addressLine1}
            onChange={handleChange("addressLine1")}
            onBlur={() => handleBlur("addressLine1")}
            placeholder="123 Main Street"
            minLength={2}
            required
          />
          {touched.addressLine1 && errors.addressLine1 ? (
            <small className="field-error">{errors.addressLine1}</small>
          ) : null}
        </label>

        <label className="label">
          <span>Address line 2</span>
          <input
            type="text"
            className="input"
            value={form.addressLine2}
            onChange={handleChange("addressLine2")}
            onBlur={() => handleBlur("addressLine2")}
            placeholder="Apartment, suite, unit, etc."
          />
        </label>

        <label className="label">
          <span>Town</span>
          <input
            type="text"
            className="input"
            value={form.town}
            onChange={handleChange("town")}
            onBlur={() => handleBlur("town")}
            placeholder="Neighborhood or town"
          />
        </label>

        <label className="label">
          <span>Governorate</span>
          <input
            type="text"
            className="input"
            value={form.governorate}
            onChange={handleChange("governorate")}
            onBlur={() => handleBlur("governorate")}
            placeholder="Governorate or state"
          />
        </label>

        <label className="label">
          <span>Country</span>
          <input
            type="text"
            className={fieldClass(touched.country, errors.country)}
            value={form.country}
            onChange={handleChange("country")}
            onBlur={() => handleBlur("country")}
            placeholder="e.g. Bahrain"
            required
          />
          {touched.country && errors.country ? (
            <small className="field-error">{errors.country}</small>
          ) : null}
        </label>

        <label className="label">
          <span>Road number</span>
          <input
            type="text"
            className={fieldClass(touched.roadNumber, errors.roadNumber)}
            value={form.roadNumber}
            onChange={handleChange("roadNumber")}
            onBlur={() => handleBlur("roadNumber")}
            placeholder="Road number (digits first)"
            inputMode="numeric"
          />
          {touched.roadNumber && errors.roadNumber ? (
            <small className="field-error">{errors.roadNumber}</small>
          ) : null}
        </label>

        <label className="label">
          <span>Latitude</span>
          <input
            type="number"
            className={fieldClass(touched.latitude, errors.latitude)}
            value={form.latitude}
            onChange={handleChange("latitude")}
            onBlur={() => handleBlur("latitude")}
            placeholder="26.066700"
            required
            step="any"
            min="-90"
            max="90"
          />
          {touched.latitude && errors.latitude ? (
            <small className="field-error">{errors.latitude}</small>
          ) : (
            <small className="field-hint">
              Use decimal degrees. Negative values represent the southern hemisphere.
            </small>
          )}
        </label>

        <label className="label">
          <span>Longitude</span>
          <input
            type="number"
            className={fieldClass(touched.longitude, errors.longitude)}
            value={form.longitude}
            onChange={handleChange("longitude")}
            onBlur={() => handleBlur("longitude")}
            placeholder="50.557700"
            required
            step="any"
            min="-180"
            max="180"
          />
          {touched.longitude && errors.longitude ? (
            <small className="field-error">{errors.longitude}</small>
          ) : (
            <small className="field-hint">
              Use decimal degrees. Negative values represent the western hemisphere.
            </small>
          )}
        </label>

        <label className="label label-span">
          <span>Additional directions</span>
          <textarea
            className="input"
            value={form.additionalDirections}
            onChange={handleChange("additionalDirections")}
            onBlur={() => handleBlur("additionalDirections")}
            placeholder="Landmarks, parking tips, delivery notes, etc."
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}


