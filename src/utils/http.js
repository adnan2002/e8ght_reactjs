export const normaliseUrl = (baseUrl, endpoint) => {
  const trimmedBase = baseUrl?.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalisedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${trimmedBase ?? ""}${normalisedEndpoint}`;
};

export const withJsonHeaders = (headers = {}) => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  return nextHeaders;
};

export const isJsonContentType = (contentType) =>
  typeof contentType === "string" && contentType.toLowerCase().includes("application/json");

export const tryParseJson = async (response) => {
  if (!response) return null;
  const contentType = response.headers?.get("content-type");
  if (!isJsonContentType(contentType)) {
    return null;
  }

  try {
    return await response.clone().json();
  } catch (error) {
    console.warn("Failed to parse JSON response", error);
    return null;
  }
};



