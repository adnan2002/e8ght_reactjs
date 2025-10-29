import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.jsx";

const ALLOWED_ENDPOINTS = new Set([
  "/auth/users/me",
  "/auth/refresh",
  "/auth/logout",
  "/projects",
  "/users/me", // needs to be implemented
  "/sessions/logout",
]);

const normaliseUrl = (baseUrl, endpoint) => {
  const trimmedBase = baseUrl?.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalisedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  return `${trimmedBase ?? ""}${normalisedEndpoint}`;
};

export const useAuthenticatedFetch = () => {
  const { accessToken, setAccessToken, setUser } = useAuth();
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

  return useCallback(
    async (endpoint, options = {}) => {
      if (!ALLOWED_ENDPOINTS.has(endpoint)) {
        throw new Error(`Endpoint not allowed: ${endpoint}`);
      }

      const refreshEndpoint = "/auth/refresh";
      const targetUrl = normaliseUrl(baseUrl, endpoint);
      const refreshUrl = normaliseUrl(baseUrl, refreshEndpoint);

      const performRequest = async (token) => {
        const headers = new Headers(options.headers || undefined);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        const requestInit = {
          ...options,
          headers,
        };

        return fetch(targetUrl, requestInit);
      };

      const handleUnauthorized = () => {
        setAccessToken(null);
        setUser(null);
        navigate("/login", { replace: true });
      };

      let response = await performRequest(accessToken);

      if (response.status !== 401) {
        return response;
      }

      let refreshResponse;
      try {
        refreshResponse = await fetch(refreshUrl, {
          method: "POST",
          credentials: options.credentials ?? "include",
        });
      } catch (error) {
        handleUnauthorized();
        throw error;
      }

      if (!refreshResponse.ok) {
        handleUnauthorized();
        throw new Error("Unable to refresh access token");
      }

      const refreshPayload = await refreshResponse.json().catch(() => null);
      const nextToken = refreshPayload?.access_token;

      if (!nextToken) {
        handleUnauthorized();
        throw new Error("Refresh response did not include an access token");
      }

      setAccessToken(nextToken);

      response = await performRequest(nextToken);

      if (response.status === 401) {
        handleUnauthorized();
      }

      return response;
    },
    [accessToken, baseUrl, navigate, setAccessToken, setUser]
  );
};


