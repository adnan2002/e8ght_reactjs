import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";

const REFERRER_ORIGIN = "https://accounts.google.com/";
const LOG_PREFIX = "[Callback]";

const log = (...args) => {
  if (typeof console !== "undefined") {
    console.debug(LOG_PREFIX, ...args);
  }
};

const getCookie = (name) => {
  if (typeof document === "undefined") return null;

  const all = document.cookie || "";
  if (!all) return null;

  const parts = all.split("; ");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(part.slice(0, eqIdx));
    if (key === name) {
      return decodeURIComponent(part.slice(eqIdx + 1));
    }
  }

  return null;
};

const clearCookie = (name, path = "/") => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
};

const COOKIE_NAME = "access_token";

export default function Callback() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const hasExecutedRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;

    if (hasExecutedRef.current) {
      log("Effect already executed; skipping rerun");
      return () => {
        cancelRef.current = true;
        log("Effect cleanup - cancelled set to true");
      };
    }

    hasExecutedRef.current = true;
    log("Effect start");
    if (typeof document === "undefined") {
      log("No document available; aborting");
      return;
    }

    const referrer = document.referrer || "";
    log("Referrer detected", referrer);
    if (!referrer.startsWith(REFERRER_ORIGIN)) {
      log("Unexpected referrer, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    const accessToken = getCookie(COOKIE_NAME);
    log("Access token", accessToken ? "present" : "missing");
    if (!accessToken) {
      log("Missing access token cookie, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    const verifyAndRoute = async () => {
      log("Starting verification");
      try {
        const payload = await authenticatedFetch.requestJson(
          "/auth/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
          { tokenOverride: accessToken, disableRefresh: true }
        ).catch((error) => {
          log("Verification failed", error);
          navigate("/login", { replace: true });
          return null;
        });

        if (!payload) {
          return;
        }

        if (cancelRef.current) {
          log("Cancelled after verification payload");
          return;
        }

        if (!payload) {
          log("Verification payload missing, redirecting to login");
          navigate("/login", { replace: true });
          return;
        }

        const completedOnboarding = payload?.completed_onboarding;
        const verifiedUser = payload?.user;
        log("Verification payload", {
          completedOnboarding,
          hasVerifiedUser: Boolean(verifiedUser),
        });

        let nextUser = verifiedUser;

        if (!nextUser) {
          const mePayload = await authenticatedFetch.requestJson(
            "/users/me",
            {
              method: "GET",
              credentials: "include",
            },
            { tokenOverride: accessToken, disableRefresh: true }
          ).catch((error) => {
            log("Fetching /users/me failed", error);
            navigate("/login", { replace: true });
            return null;
          });

          if (cancelRef.current || !mePayload) {
            return;
          }

          nextUser = mePayload?.user ?? null;
        }

        log("Derived next user", {
          hasUser: nextUser !== undefined && nextUser !== null,
          fromMePayload: Boolean(!verifiedUser && nextUser),
        });

        if (nextUser === undefined) {
          log("Next user undefined, redirecting to login");
          navigate("/login", { replace: true });
          return;
        }

        setAccessToken(accessToken);
        setUser(nextUser ?? null);
        log("Stored access token and user");

        setTimeout(() => {
          clearCookie(COOKIE_NAME);
          log("Cleared access token cookie");
        }, 0);

        if (!completedOnboarding) {
          log("User incomplete onboarding, redirecting to onboarding");
          navigate("/onboarding", { replace: true });
        } else {
          log("User completed onboarding, redirecting to dashboard");
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        if (!cancelRef.current) {
          log("Error during verification flow", error);
          navigate("/login", { replace: true });
        }
      }
    };

    verifyAndRoute();

    return () => {
      cancelRef.current = true;
      log("Effect cleanup - cancelled set to true");
    };
  }, [authenticatedFetch, navigate, setAccessToken, setUser]);

  return null;
}


