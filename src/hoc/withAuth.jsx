import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch.jsx";
import { resolveCurrentUser } from "../utils/session";

export const withAuth = (WrappedComponent) => {
  const Guard = (props) => {
    const navigate = useNavigate();
    const { accessToken, user, setUser, setAccessToken } = useAuth();
    const authenticatedFetch = useAuthenticatedFetch();
    const [status, setStatus] = useState("loading");

    const logPrefix = "[withAuth]";

    useLayoutEffect(() => {
      if (status === "ready" || status === "redirect") {
        return;
      }

      let cancelled = false;
      const shouldContinue = () => !cancelled;

      const resolveUser = async () => {
        if (cancelled) {
          return;
        }

        try {
          const result = await resolveCurrentUser({
            accessToken,
            user,
            setUser,
            setAccessToken,
            authenticatedFetch,
            shouldContinue,
          });

          if (cancelled) {
            return;
          }

          const resolvedUser = result?.user ?? null;

          if (!resolvedUser) {
            setStatus("redirect");
            navigate("/login", { replace: true });
            return;
          }

          setStatus("ready");
        } catch (error) {
          if (error?.name === "ResolveCurrentUserCancelled") {
            return;
          }

          if (!cancelled) {
            console.warn(`${logPrefix} guard failed`, error);
            setStatus("redirect");
            navigate("/login", { replace: true });
          }
        }
      };

      resolveUser();

      return () => {
        cancelled = true;
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
      return <WrappedComponent {...props} />;
    }

    if (status === "redirect") {
      return null;
    }

    return (
      <section className="page auth-guard">
        <p>Checking permissions...</p>
      </section>
    );
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  Guard.displayName = `WithAuth(${wrappedName})`;

  return Guard;
};

export default withAuth;
