import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tryParseJson } from "../utils/http";
import { useApiFetch } from "./useApiFetch.jsx";
import { useAuth } from "./useAuth.jsx";

const DEFAULT_REFRESH_ENDPOINT = "/sessions/refresh";

const DEFAULT_ALLOWED_ENDPOINTS = new Set([
  "/auth/users/me",
  "/auth/verify",
  DEFAULT_REFRESH_ENDPOINT,
  "/auth/logout",
  "/users/me",
  "/users/me/onboarding",
  "/users/me/freelancer",
  "/users/me/addresses",
  "/users/me/addresses/default",
  "/sessions/logout",
]);
const DEFAULT_ALLOWED_PREFIXES = ["/users/me/addresses/"];
const normaliseEndpointForAllowList = (endpoint) => {
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return endpoint;
  }

  const [path] = endpoint.split("?");

  if (!path || path === "/") {
    return path || endpoint;
  }

  return path.endsWith("/") && path.length > 1 ? path.replace(/\/+$/, "") : path;
};

export const useAuthenticatedFetch = () => {
  const { accessToken, setAccessToken, setUser } = useAuth();
  const navigate = useNavigate();
  const { request } = useApiFetch();

  const extractField = useCallback((candidate, fieldNames) => {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    for (const name of fieldNames) {
      if (Object.prototype.hasOwnProperty.call(candidate, name)) {
        const value = candidate[name];
        if (value != null) {
          return value;
        }
      }
    }

    for (const value of Object.values(candidate)) {
      if (value && typeof value === "object") {
        const nested = extractField(value, fieldNames);
        if (nested != null) {
          return nested;
        }
      }
    }

    return null;
  }, []);

  const ensureAllowedEndpoint = useCallback((endpoint) => {
    const normalisedEndpoint = normaliseEndpointForAllowList(endpoint);
    if (DEFAULT_ALLOWED_ENDPOINTS.has(normalisedEndpoint)) {
      return;
    }
    if (typeof normalisedEndpoint === "string") {
      for (const prefix of DEFAULT_ALLOWED_PREFIXES) {
        if (normalisedEndpoint.startsWith(prefix)) {
          return;
        }
      }
    }
    throw new Error(`Endpoint not allowed: ${normalisedEndpoint}`);
  }, []);

  const handleUnauthorized = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate, setAccessToken, setUser]);

  const refreshAccessToken = useCallback(
    async () => {
      const response = await request(DEFAULT_REFRESH_ENDPOINT, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      let payload = await tryParseJson(response);

      if (!payload) {
        try {
          payload = await response.clone().json();
        } catch (jsonError) {
          try {
            const text = await response.clone().text();
            payload = text ? JSON.parse(text) : null;
          } catch (textError) {
            console.warn("Failed to parse refresh response", {
              jsonError,
              textError,
            });
            return null;
          }
        }
      }

      if (!payload || typeof payload !== "object") {
        console.warn("Refresh response payload missing or invalid", payload);
        return null;
      }

      const nextToken = extractField(payload, ["access_token", "accessToken", "token"]);

      if (!nextToken) {
        console.warn("Refresh response missing access token", payload);
        return null;
      }

      return {
        accessToken: nextToken,
        expiresIn: extractField(payload, ["expires_in", "expiresIn", "expires"]),
      };
    },
    [extractField, request]
  );

  const authenticatedRequest = useCallback(
    async (endpoint, options = {}, config = {}) => {
      const { tokenOverride, disableRefresh = false, expectJson = false } = config;

      ensureAllowedEndpoint(endpoint);

      const initialToken = tokenOverride ?? accessToken;
      let activeToken = initialToken;

      if (!activeToken && !disableRefresh) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.accessToken) {
          activeToken = refreshed.accessToken;
          if (!tokenOverride) {
            setAccessToken(refreshed.accessToken);
          }
        }
      }

      const execute = async (token) => {
        const headers = new Headers(options.headers || undefined);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        if (expectJson && !headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }

        return request(endpoint, {
          ...options,
          headers,
        });
      };

      let response = await execute(activeToken);

      if (response.status !== 401 || disableRefresh) {
        if (response.status === 401 && disableRefresh) {
          handleUnauthorized();
        }
        return response;
      }

      const refreshed = await refreshAccessToken();
      const refreshedToken = refreshed?.accessToken ?? null;

      if (!refreshedToken) {
        handleUnauthorized();
        return response;
      }

      if (!tokenOverride) {
        setAccessToken(refreshedToken);
      }

      response = await execute(refreshedToken);

      if (response.status === 401) {
        handleUnauthorized();
      }

      return response;
    },
    [
      accessToken,
      ensureAllowedEndpoint,
      handleUnauthorized,
      refreshAccessToken,
      request,
      setAccessToken,
    ]
  );

  const requestJson = useCallback(
    async (endpoint, options = {}, config = {}) => {
      const response = await authenticatedRequest(endpoint, options, {
        ...config,
        expectJson: true,
      });

      if (!response.ok) {
        const payload = await tryParseJson(response);
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      const payload = await tryParseJson(response);
      return payload;
    },
    [authenticatedRequest]
  );

  const refreshSession = useCallback(
    async () => {
      const refreshed = await refreshAccessToken();
      const token = refreshed?.accessToken ?? null;
      if (!token) {
        return null;
      }
      setAccessToken(token);
      return token;
    },
    [refreshAccessToken, setAccessToken]
  );

  return useMemo(
    () =>
      Object.assign(authenticatedRequest, {
        requestJson,
        refreshSession,
      }),
    [authenticatedRequest, refreshSession, requestJson]
  );
};


