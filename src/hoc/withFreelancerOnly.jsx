import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

const withFreelancerOnly = (WrappedComponent) => {
  const Guard = (props) => {
    const { user, freelancerProfileStatus } = useAuth();

    const canRender = useMemo(() => {
      if (!user || user.role !== "freelancer") {
        return false;
      }
      if (freelancerProfileStatus === "loading" || freelancerProfileStatus === "unknown") {
        return false;
      }
      return true;
    }, [user, freelancerProfileStatus]);

    if (!canRender) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  Guard.displayName = `WithFreelancerOnly(${wrappedName})`;

  return Guard;
};

export default withFreelancerOnly;


