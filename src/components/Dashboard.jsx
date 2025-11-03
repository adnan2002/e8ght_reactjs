import { useEffect,useLayoutEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { isOnboarded } from "../utils/session";
import { readStoredUser } from "../utils/storage";

const LOG_PREFIX = "[Dashboard]";

const log = (...args) => {
  if (typeof console !== "undefined") {
    console.debug(LOG_PREFIX, ...args);
  }
};

const warn = (...args) => {
  if (typeof console !== "undefined") {
    console.warn(LOG_PREFIX, ...args);
  }
};

const statusMessageMap = {
  initial: "Preparing your dashboard...",
  "refreshing-token": "Refreshing your session...",
  "loading-user": "Loading your profile...",
  "redirecting-onboarding": "Redirecting you to onboarding...",
  "redirecting-customer": "Sending you to your customer dashboard...",
  "redirecting-freelancer": "Sending you to your freelancer dashboard...",
  "redirecting-login": "Redirecting to sign in...",
  "unknown-role": "We couldn't determine your dashboard. Redirecting to sign in...",
  error: "Something went wrong. Redirecting to sign in...",
};

const redirectStatuses = new Set([
  "redirecting-onboarding",
  "redirecting-customer",
  "redirecting-freelancer",
  "redirecting-login",
  "unknown-role",
  "error",
]);

export default function Dashboard() {
  const { accessToken, setAccessToken, user, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [status, setStatus] = useState("initial");
  const userRef = useRef(user);
  const statusRef = useRef(status);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    statusRef.current = status;
    log("Status state updated", { status });
  }, [status]);

  useLayoutEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      log("Dashboard effect cleanup", { cancelled });
    };

    const updateStatus = (nextStatus) => {
      const currentStatus = statusRef.current;
      log("updateStatus invoked", { currentStatus, nextStatus, cancelled });
      if (!cancelled) {
        setStatus(nextStatus);
        statusRef.current = nextStatus;
      }
    };

    const redirectToLogin = (nextStatus = "redirecting-login") => {
      if (cancelled) {
        log("redirectToLogin skipped due to cancellation", { nextStatus });
        return;
      }
      updateStatus(nextStatus);
      log("Queued redirect to login");
    };

    log("Dashboard effect invoked", {
      hasAccessToken: Boolean(accessToken),
      hasUser: Boolean(userRef.current),
    });

    const existingUser = userRef.current;
    if (existingUser && !isOnboarded(existingUser)) {
      log("Detected non-onboarded user in context; redirecting to onboarding", {
        role: existingUser.role,
      });
      updateStatus("redirecting-onboarding");
      return cleanup;
    }

    const fetchUserFromApi = async (token) => {
      updateStatus("loading-user");
      log("Fetching /users/me", {
        hasTokenOverride: Boolean(token),
      });

      const payload = await authenticatedFetch.requestJson(
        "/users/me",
        { method: "GET", credentials: "include" },
        token ? { tokenOverride: token } : undefined
      );

      const fetchedUser = payload?.user ?? payload ?? null;

      if (!fetchedUser || typeof fetchedUser !== "object") {
        log("Fetch /users/me returned invalid payload", { payload });
        throw new Error("Missing user payload");
      }

      if (!cancelled && fetchedUser !== userRef.current) {
        log("Updating user from API payload");
        setUser(fetchedUser);
        userRef.current = fetchedUser;
      }

      log("Fetched user from API", {
        hasFetchedUser: Boolean(fetchedUser),
        role: fetchedUser.role,
        completedOnboarding: isOnboarded(fetchedUser),
      });
      return fetchedUser;
    };

    const resolveUser = async (token) => {
      const contextUser = userRef.current;
      if (contextUser && typeof contextUser === "object") {
        log("Resolved user from context", {
          role: contextUser.role,
          completedOnboarding: isOnboarded(contextUser),
        });
        return contextUser;
      }

      const storedUser = readStoredUser();
      if (storedUser && typeof storedUser === "object") {
        if (!cancelled && storedUser !== userRef.current) {
          log("Hydrating user from storage", {
            role: storedUser.role,
            completedOnboarding: isOnboarded(storedUser),
          });
          setUser(storedUser);
          userRef.current = storedUser;
        }
        return storedUser;
      }

      log("No local user found; fetching from API");
      return fetchUserFromApi(token);
    };

    const run = async () => {
      try {
        log("Dashboard initialisation started", {
          hasAccessToken: Boolean(accessToken),
        });
        updateStatus("initial");

        let token = accessToken;

        if (!token) {
          updateStatus("refreshing-token");
          log("No access token found. Attempting refresh.");

          const refreshedToken = await authenticatedFetch.refreshSession();

          if (!refreshedToken) {
            log("Refreshing session failed: missing token");
            throw new Error("Unable to refresh session");
          }

          token = refreshedToken;
          if (!cancelled) {
            log("Session refreshed successfully");
            setAccessToken(refreshedToken);
          }
        }

        if (!token) {
          log("Still no token after refresh; redirecting to login");
          redirectToLogin();
          return;
        }

        const resolvedUser = await resolveUser(token);

        if (!resolvedUser || typeof resolvedUser !== "object") {
          log("Resolved user invalid", { resolvedUser });
          throw new Error("Unable to resolve user profile");
        }

        if (!cancelled && resolvedUser !== userRef.current) {
          log("Synchronising context with resolved user");
          setUser(resolvedUser);
          userRef.current = resolvedUser;
        }

        const completedOnboarding = isOnboarded(resolvedUser);

        log("Evaluating onboarding completion", {
          completedOnboarding,
        });

        if (!completedOnboarding) {
          updateStatus("redirecting-onboarding");
          log("Queued redirect to onboarding", { replace: true });
          return;
        }

        const roleValue = resolvedUser?.role;
        const role =
          typeof roleValue === "string" ? roleValue.trim().toLowerCase() : roleValue;

        log("Evaluating user role", { role });

        if (role === "freelancer") {
          updateStatus("redirecting-freelancer");
          log("Queued redirect to freelancer dashboard", { replace: true });
          return;
        }

        if (role === "customer") {
          updateStatus("redirecting-customer");
          log("Queued redirect to customer dashboard", { replace: true });
          return;
        }

        log("Role not recognised; redirecting to login", { role });
        redirectToLogin("unknown-role");
      } catch (error) {
        if (!cancelled) {
          warn("Failed to initialise dashboard", error);
          redirectToLogin("error");
        }
      }
    };

    run();

    return cleanup;
  }, [
    accessToken,
    authenticatedFetch,
    setAccessToken,
    setUser,
  ]);

  const message = statusMessageMap[status] ?? statusMessageMap.initial;

  log("render", { status, message });

  if (redirectStatuses.has(status)) {
    const redirectMap = {
      "redirecting-onboarding": "/onboarding",
      "redirecting-customer": "/dashboard/customer",
      "redirecting-freelancer": "/dashboard/freelancer",
      "redirecting-login": "/login",
      "unknown-role": "/login",
      error: "/login",
    };
    const destination = redirectMap[status] ?? "/login";
    log("render redirect status; emitting Navigate", { status, destination });
    return <Navigate to={destination} replace />;
  }

  return (
    <section className="page dashboard">
      <h1>Dashboard</h1>
      <p>{message}</p>
    </section>
  );
}


