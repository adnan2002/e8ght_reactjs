import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import FreelancerServicesForm from "../../components/FreelancerServicesForm.jsx";

const keyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styles = {
  container: {
    display: "grid",
    gap: "2rem",
    animation: "fadeIn 0.4s ease-out",
  },
  hero: {
    position: "relative",
    padding: "2rem 2.25rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
    boxShadow: "0 8px 20px rgba(236, 72, 153, 0.08)",
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    top: "-30%",
    right: "-10%",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background: "rgba(236, 72, 153, 0.15)",
    filter: "blur(40px)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: "-20%",
    left: "10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "rgba(219, 39, 119, 0.1)",
    filter: "blur(30px)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: "0.75rem",
  },
  heroEyebrow: {
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#be185d",
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(135deg, #831843 0%, #be185d 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#6b7280",
    lineHeight: 1.6,
    maxWidth: "500px",
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "1rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1.25rem",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 14px rgba(236, 72, 153, 0.1)",
  },
  statIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #ec4899, #db2777)",
    color: "white",
    fontSize: "1.1rem",
  },
  statContent: {
    display: "grid",
    gap: "0.1rem",
  },
  statValue: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#1f2937",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  formSection: {
    background: "white",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid rgba(236, 72, 153, 0.1)",
    boxShadow: "0 8px 20px rgba(236, 72, 153, 0.08)",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderRadius: "12px",
    fontSize: "0.95rem",
    fontWeight: 500,
  },
  noticeError: {
    background: "#fee2e2",
    border: "1px solid rgba(220, 38, 38, 0.2)",
    color: "#dc2626",
  },
  noticeIcon: {
    fontSize: "1.1rem",
  },
};

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
  const [existingServicesCount, setExistingServicesCount] = useState(0);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const isSubmitting = submitStatus === "submitting";

  // Fetch existing services count on mount
  useEffect(() => {
    let isActive = true;

    const fetchExistingServices = async () => {
      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/services/",
          { method: "GET" }
        );

        if (!isActive) return;

        const services = Array.isArray(payload?.services) ? payload.services : [];
        setExistingServicesCount(services.length);
      } catch (error) {
        // Silently fail - we'll just show the default messaging
        if (isActive) {
          setExistingServicesCount(0);
        }
      } finally {
        if (isActive) {
          setIsLoadingServices(false);
        }
      }
    };

    fetchExistingServices();

    return () => {
      isActive = false;
    };
  }, [authenticatedFetch]);

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

  const hasExistingServices = existingServicesCount > 0;
  const maxServices = 10;
  const remainingSlots = Math.max(0, maxServices - existingServicesCount);

  const getHeroTitle = () => {
    if (isLoadingServices) return "Add Services";
    if (hasExistingServices) return "Add More Services";
    return "Create Your First Service";
  };

  const getHeroSubtitle = () => {
    if (isLoadingServices) return "Loading your current services...";
    if (hasExistingServices) {
      if (remainingSlots === 0) {
        return "You've reached the maximum of 10 services. Edit or remove existing services to add new ones.";
      }
      return `Expand your offerings! You can add up to ${remainingSlots} more service${remainingSlots === 1 ? "" : "s"}.`;
    }
    return "Add up to 10 services to share what you offer clients.";
  };

  return (
    <>
      <style>{keyframes}</style>
      <section style={styles.container}>
        {/* Hero Section */}
        <header style={styles.hero}>
          <div style={styles.heroDecor} />
          <div style={styles.heroDecor2} />
          <div style={styles.heroContent}>
            <span style={styles.heroEyebrow}>
              {hasExistingServices ? "➕ Expand Your Portfolio" : "🚀 Get Started"}
            </span>
            <h1 style={styles.heroTitle}>{getHeroTitle()}</h1>
            <p style={styles.heroSubtitle}>{getHeroSubtitle()}</p>

            {!isLoadingServices && hasExistingServices && (
              <div style={styles.statsRow}>
                <div style={styles.statCard}>
                  <span style={styles.statIcon}>📋</span>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>{existingServicesCount}</span>
                    <span style={styles.statLabel}>Current Services</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statIcon}>✨</span>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>{remainingSlots}</span>
                    <span style={styles.statLabel}>Slots Available</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Error Notice */}
        {submitError && (
          <div style={{ ...styles.notice, ...styles.noticeError }}>
            <span style={styles.noticeIcon}>⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Section */}
        <div style={styles.formSection}>
          <FreelancerServicesForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            hasExistingServices={hasExistingServices}
          />
        </div>
      </section>
    </>
  );
};

const FreelancerServicesCreateWithAuth =
  withFreelancerAuth(FreelancerServicesCreate);

FreelancerServicesCreateWithAuth.displayName =
  "FreelancerServicesCreateWithAuth";

export default FreelancerServicesCreateWithAuth;


