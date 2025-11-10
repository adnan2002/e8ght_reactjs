import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { readStoredUser, writeStoredUser } from "../utils/storage";

const normalizeUser = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const result = { ...candidate };

  const roleValue = result.role;
  if (typeof roleValue === "string") {
    const normalizedRole = roleValue.trim().toLowerCase();
    if (normalizedRole) {
      result.role = normalizedRole;
    }
  }

  const completedValue =
    result.completed_onboarding ?? result.completedOnboarding;
  if (completedValue !== undefined) {
    const completed = Boolean(completedValue);
    result.completed_onboarding = completed;
    result.completedOnboarding = completed;
  }

  return result;
};

const normaliseFreelancerStatus = (value) => {
  if (typeof value !== "string") {
    return "unknown";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUserState] = useState(() => normalizeUser(readStoredUser()));
  const [freelancerProfile, setFreelancerProfileState] = useState(null);
  const [freelancerProfileStatus, setFreelancerProfileStatusState] =
    useState("unknown");

  const setUser = useCallback((nextUser) => {
    const normalizedUser = normalizeUser(nextUser);
    setUserState((previousUser) => {
      console.log("[AuthProvider] setUser invoked", {
        previousUser,
        nextUser: normalizedUser,
      });
      return normalizedUser ?? null;
    });
    console.log("[AuthProvider] persisted user state", {
      nextUser: normalizedUser,
    });
    writeStoredUser(normalizedUser ?? null);
  }, []);

  const setFreelancerProfile = useCallback((nextProfile) => {
    setFreelancerProfileState(
      nextProfile && typeof nextProfile === "object" ? { ...nextProfile } : null
    );
  }, []);

  const setFreelancerProfileStatus = useCallback((nextStatus) => {
    setFreelancerProfileStatusState(normaliseFreelancerStatus(nextStatus));
  }, []);

  useEffect(() => {
    if (!user || user.role !== "freelancer") {
      setFreelancerProfileState(null);
      setFreelancerProfileStatusState("unknown");
    }
  }, [user]);

  const value = useMemo(
    () => {
      console.log("[AuthProvider] value memoized", {
        accessToken,
        hasUser: Boolean(user),
        freelancerProfileStatus,
        hasFreelancerProfile: Boolean(freelancerProfile),
      });
      return {
        accessToken,
        setAccessToken,
        user,
        setUser,
        freelancerProfile,
        setFreelancerProfile,
        freelancerProfileStatus,
        setFreelancerProfileStatus,
      };
    },
    [
      accessToken,
      freelancerProfile,
      freelancerProfileStatus,
      setFreelancerProfile,
      setFreelancerProfileStatus,
      setUser,
      user,
    ]
  );

  console.log("[AuthProvider] render", {
    accessToken,
    hasUser: Boolean(user),
  });

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
    console.log("[AuthBootstrapper] effect triggered", {
      accessToken,
      hasUser: Boolean(user),
      hasAttempted: hasAttemptedRef.current,
      lastToken: lastTokenRef.current,
    });

    if (user) {
      console.log("[AuthBootstrapper] existing user detected, skipping bootstrap");
      hasAttemptedRef.current = false;
      lastTokenRef.current = accessToken;
      return;
    }

    if (lastTokenRef.current !== accessToken) {
      console.log("[AuthBootstrapper] token changed", {
        previousToken: lastTokenRef.current,
        nextToken: accessToken,
      });
      hasAttemptedRef.current = false;
      lastTokenRef.current = accessToken;
    }

    if (!accessToken) {
      console.log("[AuthBootstrapper] missing access token, aborting bootstrap");
      return;
    }

    if (hasAttemptedRef.current) {
      console.log("[AuthBootstrapper] bootstrap already attempted for current token");
      return;
    }

    hasAttemptedRef.current = true;

    console.log("[AuthBootstrapper] initiating bootstrap request");

    let cancelled = false;

    (async () => {
      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me",
          {
            credentials: "include",
          }
        )
          .then((response) => {
            console.log("[AuthBootstrapper] fetch succeeded", { response });
            return response;
          })
          .catch((error) => {
            console.warn("[AuthBootstrapper] fetch failed", error);
            return null;
          });
        const nextUser = payload?.user ?? payload ?? null;

        if (!nextUser || typeof nextUser !== "object") {
          throw new Error("Missing user payload");
        }

        if (!cancelled) {
          console.log("[AuthBootstrapper] bootstrap succeeded, updating user", {
            hasNextUser: Boolean(nextUser),
          });
          setUser(nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to bootstrap user session", error);
          setUser(null);
        }
      }
    })();

    return () => {
      console.log("[AuthBootstrapper] cleanup invoked", {
        cancelled: true,
      });
      cancelled = true;
    };
  }, [accessToken, authenticatedFetch, setUser, user]);

  return null;
};