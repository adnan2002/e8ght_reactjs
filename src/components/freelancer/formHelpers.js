const isRecord = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

// File upload field configuration - maps to API's allowed file_name values
export const FILE_UPLOAD_CONFIG = [
  {
    name: "cprFrontFile",
    urlField: "cprFrontUrl",
    payloadKey: "cpr_front_url",
    apiFileName: "cpr_front",
    label: "CPR Front",
    description: "Front side of your CPR card",
    icon: "🪪",
  },
  {
    name: "cprBackFile",
    urlField: "cprBackUrl",
    payloadKey: "cpr_back_url",
    apiFileName: "cpr_back",
    label: "CPR Back",
    description: "Back side of your CPR card",
    icon: "🪪",
  },
  {
    name: "passportFile",
    urlField: "passportUrl",
    payloadKey: "passport_url",
    apiFileName: "passport",
    label: "Passport",
    description: "Your passport document",
    icon: "📘",
  },
  {
    name: "selfiePhotoFile",
    urlField: "selfiePhotoUrl",
    payloadKey: "selfie_photo_url",
    apiFileName: "selfie_photo",
    label: "Selfie Photo",
    description: "A clear photo of yourself",
    icon: "🤳",
  },
];

// Keep URL_FIELD_CONFIG for backwards compatibility
export const URL_FIELD_CONFIG = FILE_UPLOAD_CONFIG.map(({ urlField, payloadKey }) => ({
  name: urlField,
  label: urlField.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
  payloadKey,
}));

// Allowed MIME types for uploads
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

// Maximum file size: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const INITIAL_FORM_VALUES = {
  isAcceptingOrders: false,
  isPublic: false,
  bio: "",
  yearsOfExperience: "",
  certifications: "",
  // File-related fields
  cprFrontUrl: "",
  cprBackUrl: "",
  passportUrl: "",
  selfiePhotoUrl: "",
  // File objects for preview
  cprFrontFile: null,
  cprBackFile: null,
  passportFile: null,
  selfiePhotoFile: null,
  // S3 keys after upload
  cprFrontKey: "",
  cprBackKey: "",
  passportKey: "",
  selfiePhotoKey: "",
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

export const isValidFileType = (file) => {
  if (!file || !file.type) {
    return false;
  }
  return ALLOWED_FILE_TYPES.includes(file.type);
};

export const isValidFileSize = (file) => {
  if (!file || typeof file.size !== "number") {
    return false;
  }
  return file.size > 0 && file.size <= MAX_FILE_SIZE;
};

export const formatFileSize = (bytes) => {
  if (typeof bytes !== "number" || bytes < 0) {
    return "0 B";
  }
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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

  FILE_UPLOAD_CONFIG.forEach(({ urlField, payloadKey }) => {
    resolved[urlField] = toStringOrEmpty(profile[payloadKey]);
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

  // Use the S3 URL from uploaded files, or fall back to manually entered URL
  FILE_UPLOAD_CONFIG.forEach(({ urlField, payloadKey }) => {
    payload[payloadKey] = normaliseOptionalString(values[urlField]);
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

  // Validate URLs if provided directly (non-uploaded)
  // Skip validation for S3 keys (they don't start with http:// or https://)
  // S3 keys look like: users/123/cpr_front
  FILE_UPLOAD_CONFIG.forEach(({ urlField }) => {
    const raw = normaliseOptionalString(values[urlField]);
    if (raw) {
      // Only validate if it looks like a URL (starts with http)
      // S3 keys and other non-URL values are accepted as-is
      const looksLikeUrl = raw.startsWith("http://") || raw.startsWith("https://");
      if (looksLikeUrl && !isValidUrlString(raw)) {
        errors[urlField] = "Please enter a valid http(s) URL.";
      }
    }
  });

  return errors;
};

// Presigned upload helper
export const getPresignedUrl = async (authenticatedFetch, file, fileName) => {
  const response = await authenticatedFetch.requestJson("/presign", {
    method: "POST",
    body: JSON.stringify({
      file_type: file.type,
      file_name: fileName,
      file_size: file.size,
    }),
  });

  return {
    presignedUrl: response.presigned_url,
    key: response.key,
  };
};

// Upload file to S3 using presigned URL
export const uploadFileToS3 = async (presignedUrl, file) => {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Length": file.size.toString(),
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status}`);
  }

  return true;
};

// Construct the public URL from the S3 key
export const getPublicUrlFromKey = (key) => {
  if (!key) return null;
  // The backend should configure the bucket to be public or provide a way to access the files
  // For now, we'll construct the URL based on the key pattern
  const bucketUrl = import.meta.env.VITE_S3_BUCKET_URL;
  if (bucketUrl) {
    return `${bucketUrl}/${key}`;
  }
  // If no bucket URL is configured, return the key itself (backend might handle URL construction)
  return key;
};
