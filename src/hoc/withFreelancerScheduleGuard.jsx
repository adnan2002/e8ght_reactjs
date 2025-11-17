import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const LOADING_STATUSES = new Set(["loading", "unknown"]);

const withFreelancerScheduleGuard = (WrappedComponent) => {
  const Guard = (props) => {
    const { user, freelancerProfileStatus } = useAuth();
    const navigate = useNavigate();

    const shouldShowLoader = useMemo(() => {
      if (!user) {
        return true;
      }
      if (user.role !== "freelancer") {
        return false;
      }
      return LOADING_STATUSES.has(freelancerProfileStatus);
    }, [freelancerProfileStatus, user]);

    useEffect(() => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      if (user.role !== "freelancer") {
        navigate("/dashboard", { replace: true });
      }
    }, [navigate, user]);

    if (shouldShowLoader) {
      return (
        <section className="page auth-guard" aria-busy="true">
          <p>Checking permissions...</p>
        </section>
      );
    }

    if (!user || user.role !== "freelancer") {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  Guard.displayName = `WithFreelancerScheduleGuard(${wrappedName})`;

  return Guard;
};

export default withFreelancerScheduleGuard;


