import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { resolveCurrentUser } from "../utils/session";

const ROLE_REDIRECTS = {
  freelancer: "/dashboard/freelancer",
  customer: "/dashboard/customer",
};

const capitalize = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const createWithRoleAuth = (expectedRole) => {
  const targetRole = typeof expectedRole === "string" ? expectedRole.toLowerCase() : "";
  const displayRole = capitalize(targetRole);

  console.log("[createWithRoleAuth] Initializing role guard", {
    expectedRole,
    targetRole,
    displayRole,
  });

  if (!targetRole) {
    throw new Error("createWithRoleAuth requires a valid role");
  }

  console.log("[createWithRoleAuth] Target role validated", { targetRole });

  const logPrefix = `[with${displayRole}Auth]`;

  return (WrappedComponent) => {
    const Guard = (props) => {
      const navigate = useNavigate();
      const { accessToken, user, setUser, setAccessToken } = useAuth();
      const authenticatedFetch = useAuthenticatedFetch();
      const [status, setStatus] = useState("loading");

      const log = (...args) => {
        if (typeof console !== "undefined") {
          console.debug(logPrefix, ...args);
        }
      };

      const warn = (...args) => {
        if (typeof console !== "undefined") {
          console.warn(logPrefix, ...args);
        }
      };

      log("Guard render start", {
        status,
        hasAccessToken: Boolean(accessToken),
        hasUser: Boolean(user),
      });

      useEffect(() => {
        log("Status updated", { status });
      }, [status]);

      useEffect(() => {
        log("Access token updated", { hasAccessToken: Boolean(accessToken) });
      }, [accessToken]);

      useEffect(() => {
        log("User reference updated", { hasUser: Boolean(user) });
      }, [user]);

      useLayoutEffect(() => {
        log("Effect triggered", { status });

        if (status === "ready" || status === "redirect") {
          log("Effect exit early due to terminal status", { status });
          return;
        }

        let cancelled = false;
        const shouldContinue = () => !cancelled;

        log("Effect initiated", { cancelled });

        const resolveUser = async () => {
          if (cancelled) {
            log("Skipping resolveUser due to cancellation");
            return;
          }

          log("Resolving current user", {
            hasAccessToken: Boolean(accessToken),
            hasUser: Boolean(user),
          });

          try {
            const result = await resolveCurrentUser({
              accessToken,
              user,
              setUser,
              setAccessToken,
              authenticatedFetch,
              shouldContinue,
            });

            log("resolveCurrentUser returned", {
              hasResult: Boolean(result),
              resultStatus: result?.status,
            });

            if (cancelled) {
              log("Resolve aborted after cancellation");
              return;
            }

            const resolvedUser = result?.user ?? null;

            log("Resolved user", {
              hasResolvedUser: Boolean(resolvedUser),
            });

            if (!resolvedUser) {
              log("No user resolved; redirecting to login");
              setStatus("redirect");
              navigate("/login", { replace: true });
              return;
            }

            const roleValue = resolvedUser.role;
            const role =
              typeof roleValue === "string"
                ? roleValue.trim().toLowerCase()
                : roleValue;

            log("User role resolved", { role, targetRole });

            if (role !== targetRole) {
              const destination = ROLE_REDIRECTS[role] ?? "/login";
              log("Role mismatch; redirecting", {
                role,
                targetRole,
                destination,
              });
              setStatus("redirect");
              navigate(destination, { replace: true });
              return;
            }

            log("User authorized; guard ready");
            setStatus("ready");
          } catch (error) {
            if (error?.name === "ResolveCurrentUserCancelled") {
              log("resolveCurrentUser cancelled", {
                cancelled,
              });
              return;
            }
            if (!cancelled) {
              warn("Guard failed", error);
              log("Encountered error; redirecting to login");
              setStatus("redirect");
              navigate("/login", { replace: true });
            }
          } finally {
            log("resolveUser finished", {
              cancelled,
            });
          }
        };

        resolveUser();

        log("resolveUser invoked");

        return () => {
          cancelled = true;
          log("Cleanup invoked; cancellation set", { cancelled });
        };
      }, [
        accessToken,
        authenticatedFetch,
        navigate,
        setAccessToken,
        setUser,
        status,
        user,
      ]);

      if (status === "ready") {
        log("Rendering wrapped component");
        return <WrappedComponent {...props} />;
      }

      if (status === "redirect") {
        log("Redirect in progress; rendering null");
        return null;
      }

      log("Rendering loading state");
      return (
        <section className="page auth-guard">
          <p>Checking permissions...</p>
        </section>
      );
    };

    const wrappedName = WrappedComponent.displayName || WrappedComponent.name || "Component";
    Guard.displayName = `With${displayRole}Auth(${wrappedName})`;

    return Guard;
  };
};

