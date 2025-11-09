import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import {
  ADDRESS_TYPES,
  clampPrecision,
  DEFAULT_FORM,
  toNullableString,
  validateField,
} from "./formUtils.js";

const normaliseString = (value) => String(value ?? "").trim();

const mapAddressToForm = (address) => {
  if (!address) {
    return { ...DEFAULT_FORM };
  }

  const asString = (value) => (value == null ? "" : String(value));

  return {
    addressLabel: asString(address.address_label),
    addressType: asString(address.address_type) || ADDRESS_TYPES[0].value,
    addressLine1: asString(address.address_line_1),
    addressLine2: asString(address.address_line_2),
    town: asString(address.town),
    governorate: asString(address.governorate),
    country: asString(address.country),
    roadNumber: asString(address.road_number),
    latitude: asString(address.latitude),
    longitude: asString(address.longitude),
    additionalDirections: asString(address.additional_directions),
  };
};

const buildTouchedSnapshot = () =>
  Object.keys(DEFAULT_FORM).reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {}
  );

export default function EditAddressForm({ address, onSuccess, className = "form address-form" }) {
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [form, setForm] = useState(() => mapAddressToForm(address));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const addressSignature = useMemo(() => {
    if (!address) {
      return "none";
    }
    const id = address.id ?? "none";
    const updated = address.updated_at ?? address.updatedAt ?? "";
    return `${id}:${updated}`;
  }, [address]);

  useEffect(() => {
    if (!address) {
      setForm({ ...DEFAULT_FORM });
      setErrors({});
      setTouched({});
      return;
    }

    setForm(mapAddressToForm(address));
    setErrors({});
    setTouched({});
  }, [addressSignature, address]);

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

  const computePatchPayload = useCallback(() => {
    if (!address) {
      return { payload: {}, validationErrors: { form: "Address not loaded yet." } };
    }

    const payload = {};
    const validationErrors = {};

    const ensureValid = (field) => {
      const error = validateField(field, form[field] ?? "");
      if (error) {
        validationErrors[field] = error;
        return false;
      }
      return true;
    };

    const assignIfChanged = (field, key, { nullable = false, trim = true, required = false } = {}) => {
      const formValueRaw = form[field] ?? "";
      const formValue = trim ? normaliseString(formValueRaw) : String(formValueRaw ?? "");
      const originalRaw = address[key] ?? "";
      const originalValue = trim ? normaliseString(originalRaw) : String(originalRaw ?? "");

      if (nullable) {
        const nextNullable = toNullableString(formValueRaw);
        const originalNullable = toNullableString(originalRaw);
        if (nextNullable !== originalNullable) {
          if (!ensureValid(field) && !required) {
            return;
          }
          payload[key] = nextNullable;
        }
        return;
      }

      if (formValue !== originalValue) {
        if (!ensureValid(field)) {
          return;
        }
        payload[key] = required || formValue.length > 0 ? formValue : formValueRaw;
      }
    };

    assignIfChanged("addressLabel", "address_label", { required: true });
    assignIfChanged("addressType", "address_type", { required: true, trim: false });
    assignIfChanged("addressLine1", "address_line_1", { required: true });
    assignIfChanged("country", "country", { required: true });
    assignIfChanged("town", "town", { nullable: true });
    assignIfChanged("governorate", "governorate", { nullable: true });
    assignIfChanged("roadNumber", "road_number", { nullable: true, trim: false });
    assignIfChanged("addressLine2", "address_line_2", { nullable: true });
    assignIfChanged("additionalDirections", "additional_directions", { nullable: true });

    const originalLatitude =
      address.latitude == null ? null : clampPrecision(address.latitude);
    const originalLongitude =
      address.longitude == null ? null : clampPrecision(address.longitude);
    const nextLatitude = clampPrecision(form.latitude);
    const nextLongitude = clampPrecision(form.longitude);

    if (form.latitude !== "" && nextLatitude == null) {
      validationErrors.latitude = "Latitude must be a number.";
    } else if (nextLatitude == null) {
      validationErrors.latitude = "Latitude is required.";
    } else if (nextLatitude !== originalLatitude) {
      if (nextLatitude < -90 || nextLatitude > 90) {
        validationErrors.latitude = "Latitude must be between -90 and 90.";
      } else {
        payload.latitude = nextLatitude;
      }
    }

    if (form.longitude !== "" && nextLongitude == null) {
      validationErrors.longitude = "Longitude must be a number.";
    } else if (nextLongitude == null) {
      validationErrors.longitude = "Longitude is required.";
    } else if (nextLongitude !== originalLongitude) {
      if (nextLongitude < -180 || nextLongitude > 180) {
        validationErrors.longitude = "Longitude must be between -180 and 180.";
      } else {
        payload.longitude = nextLongitude;
      }
    }

    return { payload, validationErrors };
  }, [address, form]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { payload, validationErrors } = computePatchPayload();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched((prev) => ({
        ...prev,
        ...buildTouchedSnapshot(),
      }));
      toast.warning({
        title: "Please check the form",
        message: "Some fields need your attention before we can update this address.",
      });
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast.info({
        title: "No changes detected",
        message: "Update a field before saving.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await authenticatedFetch.requestJson(`/users/me/addresses/${address.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const updatedAddress = response?.address ?? response ?? null;
      if (!updatedAddress) {
        throw new Error("Missing address payload from update response.");
      }

      toast.success({
        title: "Address updated",
        message: "Your address changes are saved.",
      });

      setForm(mapAddressToForm(updatedAddress));
      setErrors({});
      setTouched({});

      if (typeof onSuccess === "function") {
        await onSuccess(updatedAddress);
      }
    } catch (error) {
      console.error("Failed to update address", error);
      const status = error?.status ?? null;
      const payloadMessage =
        error?.payload?.error ?? error?.payload?.message ?? error?.payload?.detail ?? null;

      toast.error({
        title: "Could not update address",
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

  if (!address) {
    return null;
  }

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
          {submitting ? "Saving changes..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}


