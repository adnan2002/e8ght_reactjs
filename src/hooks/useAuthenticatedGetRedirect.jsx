import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch.jsx";

const STATUS_NOT_FOUND = 404;

const isStatusNotFoundError = (error) => {
  if (!error) {
    return false;
  }

  if (error.status === STATUS_NOT_FOUND) {
    return true;
  }

  const { name, type } = error;
  if (name === "StatusNotFound" || type === "StatusNotFound") {
    return true;
  }

  return false;
};

export const useAuthenticatedGetRedirect = (apiRoute, redirectRoute) => {
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();

  const redirectToFallback = useCallback(() => {
    if (redirectRoute) {
      navigate(redirectRoute, { replace: true });
    }
  }, [navigate, redirectRoute]);

  const getResponse = useCallback(
    async (options = {}, config = {}) => {
      const response = await authenticatedFetch(
        apiRoute,
        {
          ...options,
          method: "GET",
        },
        config
      );

      if (response.status === STATUS_NOT_FOUND) {
        redirectToFallback();
      }

      return response;
    },
    [apiRoute, authenticatedFetch, redirectToFallback]
  );

  const getJson = useCallback(
    async (config = {}) => {
      try {
        const payload = await authenticatedFetch.requestJson(
          apiRoute,
          { method: "GET" },
          config
        );
        return payload;
      } catch (error) {
        if (isStatusNotFoundError(error)) {
          redirectToFallback();
          return null;
        }
        throw error;
      }
    },
    [apiRoute, authenticatedFetch, redirectToFallback]
  );

  return useMemo(
    () =>
      Object.assign(getResponse, {
        requestJson: getJson,
      }),
    [getJson, getResponse]
  );
};


