import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { readStoredUser, writeStoredUser } from "../utils/storage";
import { extractFreelancerProfile } from "../utils/freelancer";

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
  const [freelancerServices, setFreelancerServicesState] = useState(null);
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

  const setFreelancerServices = useCallback((nextServices) => {
    if (Array.isArray(nextServices)) {
      setFreelancerServicesState([...nextServices]);
      return;
    }

    if (nextServices && typeof nextServices === "object") {
      setFreelancerServicesState(Object.values(nextServices));
      return;
    }

    setFreelancerServicesState(null);
  }, []);

  const setFreelancerProfileStatus = useCallback((nextStatus) => {
    setFreelancerProfileStatusState(normaliseFreelancerStatus(nextStatus));
  }, []);

  useEffect(() => {
    if (!user || user.role !== "freelancer") {
      setFreelancerProfileState(null);
      setFreelancerProfileStatusState("unknown");
      setFreelancerServicesState(null);
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
        freelancerServices,
        setFreelancerServices,
        freelancerProfileStatus,
        setFreelancerProfileStatus,
      };
    },
    [
      accessToken,
      freelancerProfile,
      freelancerProfileStatus,
      freelancerServices,
      setFreelancerProfile,
      setFreelancerServices,
      setFreelancerProfileStatus,
      setUser,
      user,
    ]
  );

  console.log("[AuthProvider] render", {
    accessToken,
    hasUser: Boolean(user),
    hasFreelancerServices: Array.isArray(freelancerServices),
  });

  return (
    <AuthContext.Provider value={value}>
      <AuthBootstrapper />
      <FreelancerProfileBootstrapper />
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

const BOOTSTRAP_STATUSES = new Set(["unknown", "loading"]);

const FreelancerProfileBootstrapper = () => {
  const {
    user,
    freelancerProfileStatus,
    setFreelancerProfile,
    setFreelancerProfileStatus,
  } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const role =
      typeof user?.role === "string" ? user.role.trim().toLowerCase() : null;

    if (!user || role !== "freelancer") {
      isFetchingRef.current = false;
      return;
    }

    if (!BOOTSTRAP_STATUSES.has(freelancerProfileStatus)) {
      isFetchingRef.current = false;
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    let cancelled = false;
    isFetchingRef.current = true;

    setFreelancerProfileStatus("loading");

    (async () => {
      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/",
          { method: "GET" }
        );

        if (cancelled) {
          return;
        }

        const freelancerProfile = extractFreelancerProfile(payload);

        if (!freelancerProfile) {
          setFreelancerProfile(null);
          setFreelancerProfileStatus("missing");
          return;
        }

        setFreelancerProfile(freelancerProfile);
        setFreelancerProfileStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const statusCode =
          error?.status ??
          error?.response?.status ??
          error?.payload?.status ??
          null;

        setFreelancerProfile(null);

        if (statusCode === 401 || statusCode === 403) {
          setFreelancerProfileStatus("unauthorized");
        } else if (statusCode === 404) {
          setFreelancerProfileStatus("missing");
        } else {
          setFreelancerProfileStatus("error");
        }
      } finally {
        isFetchingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      isFetchingRef.current = false;
    };
  }, [
    authenticatedFetch,
    freelancerProfileStatus,
    setFreelancerProfile,
    setFreelancerProfileStatus,
    user,
  ]);

  return null;
};
