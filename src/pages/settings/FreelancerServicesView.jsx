import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICE_CATEGORIES } from "../../components/FreelancerServicesForm.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useAuthenticatedGetRedirect } from "../../hooks/useAuthenticatedGetRedirect.jsx";

const LOCATION_LABELS = {
  on_premise: "At my location",
  door_step: "At client's location",
};

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load your freelancer services. Please try again.";

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

  const categoryNameById = useMemo(() => {
    const lookup = new Map();
    SERVICE_CATEGORIES.forEach(({ id, name }) => {
      lookup.set(id, name);
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
          // `useAuthenticatedGetRedirect` handles redirecting to the dashboard.
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
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
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

  return (
    <section className="page freelancer-services-view">
      <header className="page-header">
        <h1>Freelancer Services</h1>
        <p className="page-subtitle">
          Review the services that clients can book with you.
        </p>
      </header>

      {status === "loading" && (
        <p className="notice info" aria-live="polite">
          Loading your freelancer services…
        </p>
      )}

      {status === "error" && (
        <p className="notice error" role="alert">
          {errorMessage || DEFAULT_ERROR_MESSAGE}
        </p>
      )}

      {status === "ready" && services.length === 0 && (
        <p className="notice info">
          You have not added any freelancer services yet.
        </p>
      )}

      {status === "ready" && services.length > 0 && (
        <div className="freelancer-services-view__list">
          {services.map((service) => {
            const categoryId =
              typeof service.service_category_id === "string"
                ? Number.parseInt(service.service_category_id, 10)
                : service.service_category_id;
            const categoryName =
              categoryNameById.get(Number.isFinite(categoryId) ? categoryId : null) ??
              "Unknown";
            const durationLabel = formatDuration(
              service.service_duration_seconds
            );
            const priceLabel = renderPrice(service);
            const locationLabel =
              LOCATION_LABELS[service.location] ?? service.location;

            return (
              <article
                key={service.id ?? service.title}
                className="freelancer-services-view__item"
              >
                <header>
                  <h2>{service.title ?? "Untitled service"}</h2>
                  <p className="freelancer-services-view__category">
                    {categoryName}
                  </p>
                </header>
                {service.description && (
                  <p className="freelancer-services-view__description">
                    {service.description}
                  </p>
                )}
                <dl className="freelancer-services-view__meta">
                  {priceLabel && (
                    <>
                      <dt>Pricing</dt>
                      <dd>{priceLabel}</dd>
                    </>
                  )}
                  {durationLabel && (
                    <>
                      <dt>Duration</dt>
                      <dd>{durationLabel}</dd>
                    </>
                  )}
                  {locationLabel && (
                    <>
                      <dt>Location</dt>
                      <dd>{locationLabel}</dd>
                    </>
                  )}
                  {Array.isArray(service.products_used) &&
                    service.products_used.length > 0 && (
                      <>
                        <dt>Products used</dt>
                        <dd>{service.products_used.join(", ")}</dd>
                      </>
                    )}
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default FreelancerServicesView;


