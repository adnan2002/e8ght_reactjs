import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

const USER_STORAGE_KEY = "auth:user";

const readStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const writeStoredUser = (user) => {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to update stored user", error);
  }
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUserState] = useState(() => readStoredUser());

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser ?? null);
    writeStoredUser(nextUser ?? null);
  }, []);

  const value = useMemo(
    () => ({ accessToken, setAccessToken, user, setUser }),
    [accessToken, setUser, user]
  );

  return (
    <AuthContext.Provider value={value}>
      <AuthBootstrapper />
      {children}
    </AuthContext.Provider>
  );
};

const AuthBootstrapper = () => {
  const { accessToken, user, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const hasAttemptedRef = useRef(false);
  const lastTokenRef = useRef();

  useEffect(() => {
    if (user) {
      hasAttemptedRef.current = false;
      lastTokenRef.current = accessToken;
      return;
    }

    if (lastTokenRef.current !== accessToken) {
      hasAttemptedRef.current = false;
      lastTokenRef.current = accessToken;
    }

    if (!accessToken) {
      return;
    }

    if (hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const response = await authenticatedFetch("/users/me", {
          credentials: "include",
        });

        if (!response?.ok) {
          throw new Error("Failed to fetch current user");
        }

        const payload = await response.json().catch(() => null);

        if (!payload) {
          throw new Error("Missing user payload");
        }

        if (!cancelled) {
          setUser(payload);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to bootstrap user session", error);
          setUser(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authenticatedFetch, setUser, user]);

  return null;
};