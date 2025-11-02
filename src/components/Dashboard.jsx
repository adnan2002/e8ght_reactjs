import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { readStoredUser } from "../utils/storage";

const LOG_PREFIX = "[Dashboard]";

const log = (...args) => {
  if (typeof console !== "undefined") {
    console.debug(LOG_PREFIX, ...args);
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { accessToken, setAccessToken, user, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [status, setStatus] = useState("initial");
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const updateStatus = (nextStatus) => {
      if (!cancelled) {
        setStatus(nextStatus);
      }
    };

    const redirectToLogin = (nextStatus = "redirecting-login") => {
      if (cancelled) return;
      updateStatus(nextStatus);
      navigate("/login", { replace: true });
    };

    const fetchUserFromApi = async (token) => {
      updateStatus("loading-user");
      log("Fetching /users/me");

      const payload = await authenticatedFetch.requestJson(
        "/users/me",
        { method: "GET", credentials: "include" },
        token ? { tokenOverride: token } : undefined
      );

      const fetchedUser = payload?.user ?? payload ?? null;

      if (!fetchedUser || typeof fetchedUser !== "object") {
        throw new Error("Missing user payload");
      }

      if (!cancelled && fetchedUser !== userRef.current) {
        setUser(fetchedUser);
        userRef.current = fetchedUser;
      }

      return fetchedUser;
    };

    const resolveUser = async (token) => {
      const contextUser = userRef.current;
      if (contextUser && typeof contextUser === "object") {
        return contextUser;
      }

      const storedUser = readStoredUser();
      if (storedUser && typeof storedUser === "object") {
        if (!cancelled && storedUser !== userRef.current) {
          setUser(storedUser);
          userRef.current = storedUser;
        }
        return storedUser;
      }

      return fetchUserFromApi(token);
    };

    const run = async () => {
      try {
        updateStatus("initial");

        let token = accessToken;

        if (!token) {
          updateStatus("refreshing-token");
          log("No access token found. Attempting refresh.");

          const refreshedToken = await authenticatedFetch.refreshSession();

          if (!refreshedToken) {
            throw new Error("Unable to refresh session");
          }

          token = refreshedToken;
          if (!cancelled) {
            setAccessToken(refreshedToken);
          }
        }

        if (!token) {
          redirectToLogin();
          return;
        }

        const resolvedUser = await resolveUser(token);

        if (!resolvedUser || typeof resolvedUser !== "object") {
          throw new Error("Unable to resolve user profile");
        }

        if (!cancelled && resolvedUser !== userRef.current) {
          setUser(resolvedUser);
          userRef.current = resolvedUser;
        }

        const completedOnboarding = Boolean(
          resolvedUser.completed_onboarding ?? resolvedUser.completedOnboarding
        );

        if (!completedOnboarding) {
          updateStatus("redirecting-onboarding");
          navigate("/onboarding", { replace: true });
          return;
        }

        const roleValue = resolvedUser?.role;
        const role =
          typeof roleValue === "string" ? roleValue.trim().toLowerCase() : roleValue;

        if (role === "freelancer") {
          updateStatus("redirecting-freelancer");
          navigate("/dashboard/freelancer", { replace: true });
          return;
        }

        if (role === "customer") {
          updateStatus("redirecting-customer");
          navigate("/dashboard/customer", { replace: true });
          return;
        }

        redirectToLogin("unknown-role");
      } catch (error) {
        if (!cancelled) {
          console.warn("[Dashboard] Failed to initialise dashboard", error);
          redirectToLogin("error");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    authenticatedFetch,
    navigate,
    setAccessToken,
    setUser,
  ]);

  const message = statusMessageMap[status] ?? statusMessageMap.initial;

  log("render", { status, message });

  return (
    <section className="page dashboard">
      <h1>Dashboard</h1>
      <p>{message}</p>
    </section>
  );
}


