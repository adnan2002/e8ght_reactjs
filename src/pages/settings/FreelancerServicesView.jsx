import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICE_CATEGORIES } from "../../components/FreelancerServicesForm.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useAuthenticatedGetRedirect } from "../../hooks/useAuthenticatedGetRedirect.jsx";

const LOCATION_OPTIONS = {
  on_premise: { label: "At my location", icon: "🏠" },
  door_step: { label: "At client's location", icon: "🚗" },
};

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load your freelancer services. Please try again.";

const keyframes = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
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
    background: "linear-gradient(135deg, #fce7f3 0%, #dbeafe 50%, #e0e7ff 100%)",
    boxShadow: "0 20px 40px rgba(219, 39, 119, 0.1)",
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
    background: "rgba(99, 102, 241, 0.12)",
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
    fontSize: "1.75rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #831843 0%, #6d28d9 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#6b21a8",
    opacity: 0.85,
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
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  statIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
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
    color: "#1e1b4b",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    color: "white",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 200ms ease",
    boxShadow: "0 8px 20px rgba(236, 72, 153, 0.3)",
  },
  editBtnHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 28px rgba(236, 72, 153, 0.4)",
  },
  servicesGrid: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  serviceCard: {
    position: "relative",
    padding: "1.5rem",
    borderRadius: "18px",
    background: "white",
    border: "1.5px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    transition: "all 250ms ease",
    animation: "slideIn 0.3s ease-out",
  },
  serviceCardHover: {
    borderColor: "rgba(236, 72, 153, 0.3)",
    boxShadow: "0 16px 40px rgba(236, 72, 153, 0.1)",
    transform: "translateY(-4px)",
  },
  serviceCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  },
  categoryBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "3rem",
    height: "3rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%)",
    fontSize: "1.4rem",
    flexShrink: 0,
  },
  serviceHeaderContent: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1.3,
  },
  categoryName: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    marginTop: "0.35rem",
    padding: "0.25rem 0.65rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#be185d",
  },
  serviceDescription: {
    margin: "0 0 1rem 0",
    fontSize: "0.9rem",
    color: "#64748b",
    lineHeight: 1.6,
  },
  metaGrid: {
    display: "grid",
    gap: "0.75rem",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 0.85rem",
    borderRadius: "12px",
    background: "rgba(248, 250, 252, 0.8)",
  },
  metaIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "8px",
    background: "white",
    fontSize: "0.9rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  metaContent: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  metaValue: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#334155",
    marginTop: "0.1rem",
  },
  productsUsed: {
    marginTop: "0.5rem",
    padding: "0.85rem",
    borderRadius: "12px",
    background: "linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)",
    border: "1px dashed rgba(148, 163, 184, 0.3)",
  },
  productsLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "0.5rem",
  },
  productsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
  },
  productTag: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    background: "white",
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#475569",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1.25rem 1.5rem",
    borderRadius: "16px",
    fontSize: "0.95rem",
    fontWeight: 500,
    animation: "slideIn 0.3s ease-out",
  },
  noticeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  noticeLoading: {
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    color: "#1e40af",
  },
  noticeLoadingIcon: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "white",
  },
  noticeError: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#b91c1c",
  },
  noticeErrorIcon: {
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "white",
  },
  noticeEmpty: {
    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    color: "#92400e",
  },
  noticeEmptyIcon: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "white",
  },
  emptyStateActions: {
    marginTop: "1rem",
  },
  addServiceBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.65rem 1.25rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    boxShadow: "0 6px 16px rgba(245, 158, 11, 0.3)",
  },
};

const FreelancerServicesView = () => {
  const navigate = useNavigate();
  const ensureFreelancer = useAuthenticatedGetRedirect(
    "/users/me/freelancer/",
    "/dashboard"
  );
  const authenticatedFetch = useAuthenticatedFetch();

  const [services, setServices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const categoryLookup = useMemo(() => {
    const lookup = new Map();
    SERVICE_CATEGORIES.forEach(({ id, name, icon }) => {
      lookup.set(id, { name, icon });
    });
    return lookup;
  }, []);

  const redirectToLogin = useCallback(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  const extractStatusCode = useCallback((error) => {
    return (
      error?.status ??
      error?.response?.status ??
      error?.payload?.status ??
      null
    );
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchServices = async () => {
      setStatus("loading");
      setErrorMessage("");

      try {
        await ensureFreelancer.requestJson();
      } catch (error) {
        if (!isActive) {
          return;
        }

        const statusCode = extractStatusCode(error);

        if (statusCode === 404) {
          return;
        }

        redirectToLogin();
        return;
      }

      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/services/",
          {
            method: "GET",
          }
        );

        if (!isActive) {
          return;
        }

        const nextServices = Array.isArray(payload?.services)
          ? payload.services
          : [];

        setServices(nextServices);
        setStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        const statusCode = extractStatusCode(error);

        if (statusCode === 401 || statusCode === 403) {
          redirectToLogin();
          return;
        }

        if (statusCode === 404) {
          return;
        }

        const backendMessage =
          error?.payload?.error ??
          error?.payload?.message ??
          error?.message ??
          null;

        setErrorMessage(
          typeof backendMessage === "string" && backendMessage.trim().length > 0
            ? backendMessage
            : DEFAULT_ERROR_MESSAGE
        );
        setStatus("error");
      }
    };

    fetchServices();

    return () => {
      isActive = false;
    };
  }, [
    authenticatedFetch,
    ensureFreelancer,
    extractStatusCode,
    redirectToLogin,
  ]);

  const formatDuration = (seconds) => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
      return null;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes <= 0) {
      return null;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    if (hours > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }
    return `${minutes} min`;
  };

  const renderPrice = (service) => {
    const hasFixed = Object.prototype.hasOwnProperty.call(
      service,
      "fixed_price"
    );
    if (hasFixed && service.fixed_price != null) {
      const fixed = Number(service.fixed_price);
      if (Number.isFinite(fixed)) {
        return `£${fixed.toFixed(2)}`;
      }
    }

    const hasMin = Object.prototype.hasOwnProperty.call(service, "min_price");
    const hasMax = Object.prototype.hasOwnProperty.call(service, "max_price");
    if (hasMin && hasMax && service.min_price != null && service.max_price != null) {
      const min = Number(service.min_price);
      const max = Number(service.max_price);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `£${min.toFixed(2)} – £${max.toFixed(2)}`;
      }
    }

    return null;
  };

  const uniqueCategories = useMemo(() => {
    const ids = new Set();
    services.forEach((service) => {
      const categoryId =
        typeof service.service_category_id === "string"
          ? Number.parseInt(service.service_category_id, 10)
          : service.service_category_id;
      if (Number.isFinite(categoryId)) {
        ids.add(categoryId);
      }
    });
    return ids.size;
  }, [services]);

  const handleEditServices = () => {
    navigate("/settings/freelancer/services/edit");
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
            <span style={styles.heroEyebrow}>💼 My Services</span>
            <h1 style={styles.heroTitle}>Freelancer Services</h1>
            <p style={styles.heroSubtitle}>
              Review and manage the services that clients can book with you.
              Showcase your expertise and attract more bookings.
            </p>

            {status === "ready" && (
              <>
                <div style={styles.statsRow}>
                  <div style={styles.statCard}>
                    <span style={styles.statIcon}>📋</span>
                    <div style={styles.statContent}>
                      <span style={styles.statValue}>{services.length}</span>
                      <span style={styles.statLabel}>Total Services</span>
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statIcon}>🏷️</span>
                    <div style={styles.statContent}>
                      <span style={styles.statValue}>{uniqueCategories}</span>
                      <span style={styles.statLabel}>Categories</span>
                    </div>
                  </div>
                </div>

                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={handleEditServices}
                    onMouseEnter={() => setHoveredBtn("edit")}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...styles.editBtn,
                      ...(hoveredBtn === "edit" ? styles.editBtnHover : {}),
                    }}
                  >
                    <span>✏️</span> Edit Services
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Loading State */}
        {status === "loading" && (
          <div style={{ ...styles.notice, ...styles.noticeLoading }} aria-live="polite">
            <span style={{ ...styles.noticeIcon, ...styles.noticeLoadingIcon }}>⏳</span>
            <span>Loading your freelancer services…</span>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div style={{ ...styles.notice, ...styles.noticeError }} role="alert">
            <span style={{ ...styles.noticeIcon, ...styles.noticeErrorIcon }}>⚠️</span>
            <span>{errorMessage || DEFAULT_ERROR_MESSAGE}</span>
          </div>
        )}

        {/* Empty State */}
        {status === "ready" && services.length === 0 && (
          <div style={{ ...styles.notice, ...styles.noticeEmpty }}>
            <span style={{ ...styles.noticeIcon, ...styles.noticeEmptyIcon }}>📭</span>
            <div>
              <span>You haven't added any freelancer services yet.</span>
              <div style={styles.emptyStateActions}>
                <button
                  type="button"
                  onClick={handleEditServices}
                  style={styles.addServiceBtn}
                >
                  <span>➕</span> Add Your First Service
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {status === "ready" && services.length > 0 && (
          <div style={styles.servicesGrid}>
            {services.map((service, index) => {
              const categoryId =
                typeof service.service_category_id === "string"
                  ? Number.parseInt(service.service_category_id, 10)
                  : service.service_category_id;
              const category = categoryLookup.get(
                Number.isFinite(categoryId) ? categoryId : null
              );
              const categoryName = category?.name ?? "Unknown";
              const categoryIcon = category?.icon ?? "📦";
              const durationLabel = formatDuration(
                service.service_duration_seconds
              );
              const priceLabel = renderPrice(service);
              const locationInfo = LOCATION_OPTIONS[service.location];
              const locationLabel = locationInfo?.label ?? service.location;
              const locationIcon = locationInfo?.icon ?? "📍";

              return (
                <article
                  key={service.id ?? `service-${index}`}
                  style={{
                    ...styles.serviceCard,
                    ...(hoveredCard === index ? styles.serviceCardHover : {}),
                    animationDelay: `${index * 0.05}s`,
                  }}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <header style={styles.serviceCardHeader}>
                    <span style={styles.categoryBadge}>{categoryIcon}</span>
                    <div style={styles.serviceHeaderContent}>
                      <h2 style={styles.serviceTitle}>
                        {service.title ?? "Untitled service"}
                      </h2>
                      <span style={styles.categoryName}>
                        {categoryName}
                      </span>
                    </div>
                  </header>

                  {service.description && (
                    <p style={styles.serviceDescription}>
                      {service.description}
                    </p>
                  )}

                  <div style={styles.metaGrid}>
                    {priceLabel && (
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>💰</span>
                        <div style={styles.metaContent}>
                          <span style={styles.metaLabel}>Pricing</span>
                          <span style={styles.metaValue}>{priceLabel}</span>
                        </div>
                      </div>
                    )}

                    {durationLabel && (
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>⏱️</span>
                        <div style={styles.metaContent}>
                          <span style={styles.metaLabel}>Duration</span>
                          <span style={styles.metaValue}>{durationLabel}</span>
                        </div>
                      </div>
                    )}

                    {locationLabel && (
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>{locationIcon}</span>
                        <div style={styles.metaContent}>
                          <span style={styles.metaLabel}>Location</span>
                          <span style={styles.metaValue}>{locationLabel}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {Array.isArray(service.products_used) &&
                    service.products_used.length > 0 && (
                      <div style={styles.productsUsed}>
                        <span style={styles.productsLabel}>
                          <span>🧴</span> Products Used
                        </span>
                        <div style={styles.productsList}>
                          {service.products_used.map((product, idx) => (
                            <span key={idx} style={styles.productTag}>
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default FreelancerServicesView;
