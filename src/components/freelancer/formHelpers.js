const isRecord = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

export const URL_FIELD_CONFIG = [
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

export const INITIAL_FORM_VALUES = {
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

export const createEmptyFreelancerFormValues = () => ({
  ...INITIAL_FORM_VALUES,
});

export const normaliseOptionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normaliseCertificationsInput = (value) => {
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

export const isValidUrlString = (value) => {
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

const toStringOrEmpty = (value) => {
  if (value == null) {
    return "";
  }
  return String(value);
};

export const mapFreelancerToFormValues = (profile) => {
  if (!isRecord(profile)) {
    return createEmptyFreelancerFormValues();
  }

  const certifications =
    Array.isArray(profile.certifications) && profile.certifications.length > 0
      ? profile.certifications.map(toStringOrEmpty).join("\n")
      : "";

  const resolved = {
    isAcceptingOrders: Boolean(profile.is_accepting_orders),
    isPublic: Boolean(profile.is_public),
    bio: toStringOrEmpty(profile.bio),
    yearsOfExperience:
      profile.years_of_experience == null
        ? ""
        : String(profile.years_of_experience),
    certifications,
  };

  URL_FIELD_CONFIG.forEach(({ name, payloadKey }) => {
    resolved[name] = toStringOrEmpty(profile[payloadKey]);
  });

  return { ...INITIAL_FORM_VALUES, ...resolved };
};

export const mapFormValuesToPayload = (values) => {
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

export const validateFreelancerForm = (values) => {
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

  return errors;
};


