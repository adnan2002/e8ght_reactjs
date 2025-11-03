import { useLayoutEffect, useState } from "react";
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

      console.log(`${logPrefix} Guard render start`, {
        status,
        hasAccessToken: Boolean(accessToken),
        hasUser: Boolean(user),
      });

      useLayoutEffect(() => {
        console.log(`${logPrefix} Effect triggered`, { status });

        if (status === "ready" || status === "redirect") {
          console.log(`${logPrefix} Effect exit early due to terminal status`, { status });
          return;
        }

        let cancelled = false;
        const shouldContinue = () => !cancelled;

        console.log(`${logPrefix} Effect initiated`, { cancelled });

        const resolveUser = async () => {
          if (cancelled) {
            console.log(`${logPrefix} Skipping resolveUser due to cancellation`);
            return;
          }

          console.log(`${logPrefix} Resolving current user`);

          try {
            const result = await resolveCurrentUser({
              accessToken,
              user,
              setUser,
              setAccessToken,
              authenticatedFetch,
              shouldContinue,
            });

            console.log(`${logPrefix} resolveCurrentUser returned`, {
              hasResult: Boolean(result),
            });

            if (cancelled) {
              console.log(`${logPrefix} Resolve aborted after cancellation`);
              return;
            }

            const resolvedUser = result?.user ?? null;

            console.log(`${logPrefix} Resolved user`, {
              hasResolvedUser: Boolean(resolvedUser),
            });

            if (!resolvedUser) {
              console.log(`${logPrefix} No user resolved; redirecting to login`);
              setStatus("redirect");
              navigate("/login", { replace: true });
              return;
            }

            const roleValue = resolvedUser.role;
            const role =
              typeof roleValue === "string"
                ? roleValue.trim().toLowerCase()
                : roleValue;

            console.log(`${logPrefix} User role resolved`, { role, targetRole });

            if (role !== targetRole) {
              const destination = ROLE_REDIRECTS[role] ?? "/login";
              console.log(`${logPrefix} Role mismatch; redirecting`, {
                role,
                targetRole,
                destination,
              });
              setStatus("redirect");
              navigate(destination, { replace: true });
              return;
            }

            console.log(`${logPrefix} User authorized; guard ready`);
            setStatus("ready");
          } catch (error) {
            if (error?.name === "ResolveCurrentUserCancelled") {
              console.log(`${logPrefix} resolveCurrentUser cancelled`, {
                cancelled,
              });
              return;
            }
            if (!cancelled) {
              console.warn(`[with${displayRole}Auth] guard failed`, error);
              console.log(`${logPrefix} Encountered error; redirecting to login`);
              setStatus("redirect");
              navigate("/login", { replace: true });
            }
          } finally {
            console.log(`${logPrefix} resolveUser finished`, {
              cancelled,
            });
          }
        };

        resolveUser();

        console.log(`${logPrefix} resolveUser invoked`);

        return () => {
          cancelled = true;
          console.log(`${logPrefix} Cleanup invoked; cancellation set`, { cancelled });
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
        console.log(`${logPrefix} Rendering wrapped component`);
        return <WrappedComponent {...props} />;
      }

      if (status === "redirect") {
        console.log(`${logPrefix} Redirect in progress; rendering null`);
        return null;
      }

      console.log(`${logPrefix} Rendering loading state`);
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

