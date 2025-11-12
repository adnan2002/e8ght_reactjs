import { useState } from "react";
import { useNavigate } from "react-router-dom";
import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import FreelancerServicesForm from "../../components/FreelancerServicesForm.jsx";

const FreelancerServicesCreate = () => {
  const {
    setFreelancerProfile,
    setFreelancerServices,
    setFreelancerProfileStatus,
  } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();
  const navigate = useNavigate();

  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitError, setSubmitError] = useState(null);

  const isSubmitting = submitStatus === "submitting";

  const handleSubmit = async (servicesPayload) => {
    if (!Array.isArray(servicesPayload) || servicesPayload.length === 0) {
      setSubmitError("Please add at least one service before continuing.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    setSubmitStatus("submitting");

    try {
      const responsePayload = await authenticatedFetch.requestJson(
        "/users/me/freelancer/services/",
        {
          method: "POST",
          body: JSON.stringify(servicesPayload),
        }
      );

      const createdServices = Array.isArray(responsePayload?.services)
        ? responsePayload.services
        : [];

      setFreelancerServices(createdServices);
      setFreelancerProfileStatus("ready");
      setSubmitStatus("success");
      toast?.success?.({
        message:
          createdServices.length === 1
            ? "Service created successfully."
            : "Services created successfully.",
      });
      navigate("/dashboard/freelancer", { replace: true });
    } catch (error) {
      const statusCode =
        error?.status ??
        error?.response?.status ??
        error?.payload?.status ??
        null;

      if (statusCode === 401 || statusCode === 403) {
        setFreelancerProfile(null);
        setFreelancerProfileStatus("unauthorized");
        setFreelancerServices(null);
        setSubmitStatus("failed");
        return;
      }

      if (statusCode === 404) {
        setFreelancerProfileStatus("missing");
      } else if (statusCode === 409) {
        setFreelancerProfileStatus("error");
      } else if (statusCode && statusCode >= 500) {
        setFreelancerProfileStatus("error");
      }

      const backendMessage =
        error?.payload?.error ??
        error?.payload?.message ??
        error?.message ??
        null;

      const message =
        typeof backendMessage === "string" && backendMessage.trim().length > 0
          ? backendMessage
          : "Unable to save your services. Please review the details and try again.";

      setSubmitError(message);
      toast?.error?.({
        message,
      });
      setSubmitStatus("failed");
    } finally {
      setSubmitStatus((previous) => {
        if (previous === "success" || previous === "failed") {
          return previous;
        }
        return "idle";
      });
    }
  };

  return (
    <section className="page freelancer-services-create">
      <header className="page-header">
        <h1>Create Freelancer Services</h1>
        <p className="page-subtitle">
          Add up to 10 services to share what you offer clients.
        </p>
      </header>

      {submitError && <p className="notice error">{submitError}</p>}

      <FreelancerServicesForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </section>
  );
};

const FreelancerServicesCreateWithAuth =
  withFreelancerAuth(FreelancerServicesCreate);

FreelancerServicesCreateWithAuth.displayName =
  "FreelancerServicesCreateWithAuth";

export default FreelancerServicesCreateWithAuth;


