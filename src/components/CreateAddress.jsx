import { useCallback, useMemo, useState } from "react";
import withAuth from "../hoc/withAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../hooks/useToast.jsx";

const ADDRESS_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
];

const DEFAULT_FORM = Object.freeze({
  addressLabel: "",
  addressType: ADDRESS_TYPES[0].value,
  addressLine1: "",
  addressLine2: "",
  town: "",
  governorate: "",
  country: "",
  roadNumber: "",
  latitude: "",
  longitude: "",
  additionalDirections: "",
});

const STORAGE_KEY = "default:address";

const toNullableString = (value) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const isNumeric = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "string") {
    return false;
  }
  if (!value) {
    return false;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed);
};

const clampPrecision = (value, fractionDigits = 8) => {
  if (!isNumeric(value)) {
    return null;
  }
  const parsed = parseFloat(value);
  return Number(parsed.toFixed(fractionDigits));
};

const validateField = (field, value) => {
  switch (field) {
    case "addressLabel": {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        return "Label must be at least 2 characters.";
      }
      return null;
    }
    case "addressType": {
      if (!ADDRESS_TYPES.some((t) => t.value === value)) {
        return "Choose one of the available address types.";
      }
      return null;
    }
    case "addressLine1": {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        return "Address line 1 must be at least 2 characters.";
      }
      return null;
    }
    case "country": {
      if (value.trim().length === 0) {
        return "Country is required.";
      }
      return null;
    }
    case "latitude": {
      if (!isNumeric(value)) {
        return "Latitude must be a number.";
      }
      const numeric = parseFloat(value);
      if (numeric < -90 || numeric > 90) {
        return "Latitude must be between -90 and 90.";
      }
      return null;
    }
    case "longitude": {
      if (!isNumeric(value)) {
        return "Longitude must be a number.";
      }
      const numeric = parseFloat(value);
      if (numeric < -180 || numeric > 180) {
        return "Longitude must be between -180 and 180.";
      }
      return null;
    }
    case "roadNumber": {
      if (!value) {
        return null;
      }
      const trimmed = value.trim();
      if (trimmed && !/^\d+[A-Za-z0-9-]*$/.test(trimmed)) {
        return "Road number should start with digits.";
      }
      return null;
    }
    default:
      return null;
  }
};

const validateForm = (form) => {
  const errors = {};
  Object.entries(form).forEach(([field, value]) => {
    const error = validateField(field, typeof value === "string" ? value : String(value ?? ""));
    if (error) {
      errors[field] = error;
    }
  });
  return errors;
};

const CreateAddress = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const requirementItems = useMemo(
    () => [
      {
        id: "label",
        title: "Address label",
        body: "Use at least 2 characters so you can recognise the location later (e.g. \"Home\" or \"Office\").",
      },
      {
        id: "type",
        title: "Address type",
        body: "Select whether this is a house, apartment, or office. This must match one of the supported options.",
      },
      {
        id: "line1",
        title: "Address line 1",
        body: "Provide the primary street address with at least 2 characters.",
      },
      {
        id: "country",
        title: "Country",
        body: "Country is mandatory so we can route your requests correctly.",
      },
      {
        id: "coordinates",
        title: "Latitude & Longitude",
        body: "Enter decimal coordinates between -90 and 90 for latitude, and -180 to 180 for longitude.",
      },
      {
        id: "optional",
        title: "Optional fields",
        body: "You can add town, governorate, road number, and additional directions to help providers find you faster.",
      },
    ],
    []
  );

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
    setTouched((prev) => ({ ...prev, ...Object.keys(DEFAULT_FORM).reduce((acc, key) => ({ ...acc, [key]: true }), {}) }));

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
      const response = await authenticatedFetch.requestJson(
        "/users/me/addresses",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const addressPayload = response?.address ?? response ?? null;
      if (!addressPayload || typeof addressPayload !== "object") {
        throw new Error("Address payload missing in response");
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addressPayload));
        }
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
    } catch (error) {
      console.error("Failed to create address", error);

      const status = error?.status ?? null;
      const payloadMessage = error?.payload?.error ?? error?.payload?.message ?? error?.payload?.detail ?? null;

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

  return (
    <section className="page address-page">
      <header className="page-header">
        <h1>Create your default address</h1>
        <p className="page-subtitle">
          Fill in the details below. We validate everything before sending it to keep your profile consistent with the backend requirements.
        </p>
      </header>

      <aside className="info-box" aria-label="Address input requirements">
        <h2>What we need from you</h2>
        <ul>
          {requirementItems.map((item) => (
            <li key={item.id}>
              <strong>{item.title}:</strong> {item.body}
            </li>
          ))}
        </ul>
      </aside>

      <form className="form address-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label className="label">
            <span>Address label</span>
            <input
              type="text"
              className="input"
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
              className="input"
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
              className="input"
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
              className="input"
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
              className="input"
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
              className={`input${touched.latitude && errors.latitude ? " input-invalid" : ""}`}
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
              <small className="field-hint">Use decimal degrees. Negative values represent the southern hemisphere.</small>
            )}
          </label>

          <label className="label">
            <span>Longitude</span>
            <input
              type="number"
              className={`input${touched.longitude && errors.longitude ? " input-invalid" : ""}`}
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
              <small className="field-hint">Use decimal degrees. Negative values represent the western hemisphere.</small>
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
            {submitting ? "Saving address..." : "Save address"}
          </button>
        </div>
      </form>
    </section>
  );
};

const ProtectedCreateAddress = withAuth(CreateAddress);

export default ProtectedCreateAddress;

