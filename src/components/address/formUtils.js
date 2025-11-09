export const STORAGE_KEY = "default:address";

export const ADDRESS_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
];

export const DEFAULT_FORM = Object.freeze({
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

export const toNullableString = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const isNumeric = (value) => {
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

export const clampPrecision = (value, fractionDigits = 8) => {
  if (!isNumeric(value)) {
    return null;
  }
  const parsed = parseFloat(value);
  return Number(parsed.toFixed(fractionDigits));
};

export const validateField = (field, value) => {
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

export const validateForm = (form) => {
  const errors = {};
  Object.entries(form).forEach(([field, value]) => {
    const error = validateField(field, typeof value === "string" ? value : String(value ?? ""));
    if (error) {
      errors[field] = error;
    }
  });
  return errors;
};


