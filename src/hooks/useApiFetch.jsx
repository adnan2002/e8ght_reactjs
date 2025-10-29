import { useCallback, useMemo } from "react";

const normaliseUrl = (baseUrl, endpoint) => {
  const trimmedBase = baseUrl?.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalisedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  return `${trimmedBase ?? ""}${normalisedEndpoint}`;
};

const withJsonHeaders = (headers = {}) => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  return nextHeaders;
};

export const useApiFetch = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

  const request = useCallback(
    (endpoint, options = {}) => {
      const targetUrl = normaliseUrl(baseUrl, endpoint);
      return fetch(targetUrl, options);
    },
    [baseUrl]
  );

  const requestJson = useCallback(
    async (endpoint, options = {}) => {
      const response = await request(endpoint, options);
      if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }
      return response.json();
    },
    [request]
  );

  const get = useCallback(
    (endpoint, options = {}) => request(endpoint, { ...options, method: "GET" }),
    [request]
  );

  const deleteRequest = useCallback(
    (endpoint, options = {}) =>
      request(endpoint, { ...options, method: "DELETE" }),
    [request]
  );

  const makeJsonRequest = useCallback(
    (method) =>
      (endpoint, body, options = {}) => {
        const { headers, ...restOptions } = options;
        return request(endpoint, {
          method,
          ...restOptions,
          headers: withJsonHeaders(headers),
          body: body == null ? undefined : JSON.stringify(body),
        });
      },
    [request]
  );

  const post = useMemo(() => makeJsonRequest("POST"), [makeJsonRequest]);
  const put = useMemo(() => makeJsonRequest("PUT"), [makeJsonRequest]);
  const patch = useMemo(() => makeJsonRequest("PATCH"), [makeJsonRequest]);

  return useMemo(
    () => ({
      request,
      requestJson,
      get,
      getJson: (endpoint, options) => requestJson(endpoint, { ...options, method: "GET" }),
      post,
      postJson: (endpoint, body, options) =>
        requestJson(endpoint, {
          ...options,
          method: "POST",
          headers: withJsonHeaders(options?.headers),
          body: body == null ? undefined : JSON.stringify(body),
        }),
      put,
      patch,
      delete: deleteRequest,
    }),
    [deleteRequest, get, patch, post, put, request, requestJson]
  );
};


