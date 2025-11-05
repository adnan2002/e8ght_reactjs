import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import withAuth from "../../hoc/withAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";

const DEFAULT_QUERY = Object.freeze({
  pageId: 1,
  pageSize: 10,
});

const extractAddresses = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.addresses)) {
    return payload.addresses;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  for (const candidate of [payload.data, payload.results, payload.items]) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const formatLabel = (address) => {
  if (!address) {
    return "Unnamed address";
  }

  const rawLabel = address.address_label ?? address.label ?? "";
  const trimmed = typeof rawLabel === "string" ? rawLabel.trim() : "";

  return trimmed.length > 0 ? trimmed : "Unnamed address";
};

const AddressesList = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [pageId, setPageId] = useState(DEFAULT_QUERY.pageId);
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageSize = DEFAULT_QUERY.pageSize;

  const fetchAddresses = useCallback(async () => {
    const params = new URLSearchParams({
      page_id: String(pageId),
      page_size: String(pageSize),
    });

    const payload = await authenticatedFetch.requestJson(
      `/users/me/addresses?${params.toString()}`,
      {
        method: "GET",
      }
    );

    return extractAddresses(payload);
  }, [authenticatedFetch, pageId, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        const data = await fetchAddresses();
        if (cancelled) {
          return;
        }
        setAddresses(data);
        setHasNextPage(data.length === pageSize);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError);
        setHasNextPage(false);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchAddresses, pageSize, refreshIndex]);

  const handleRetry = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const isLoading = status === "loading" || status === "idle";
  const isError = status === "error";
  const hasAddresses = addresses.length > 0;
  const canGoPrevious = pageId > DEFAULT_QUERY.pageId;
  const canGoNext = hasNextPage;

  const primaryAddressLabel = useMemo(() => {
    if (!hasAddresses) {
      return pageId === DEFAULT_QUERY.pageId ? "No saved addresses yet" : "No addresses on this page";
    }

    return formatLabel(addresses[0]);
  }, [addresses, hasAddresses, pageId]);

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }

    if (error.payload?.error) {
      return error.payload.error;
    }

    if (error.payload?.message) {
      return error.payload.message;
    }

    return error.message ?? "Something went wrong while loading your addresses.";
  }, [error]);

  const handleNextPage = useCallback(() => {
    if (isLoading || !hasNextPage) {
      return;
    }

    setPageId((previous) => previous + 1);
  }, [hasNextPage, isLoading]);

  const handlePreviousPage = useCallback(() => {
    if (isLoading || !canGoPrevious) {
      return;
    }

    setPageId((previous) => Math.max(DEFAULT_QUERY.pageId, previous - 1));
  }, [canGoPrevious, isLoading]);

  return (
    <section className="page addresses-page" aria-busy={isLoading}>
      <header className="addresses-hero">
        <div className="addresses-hero__content">
          <div className="addresses-hero__text">
            <span className="addresses-hero__eyebrow">Saved locations</span>
            <h1>Your addresses</h1>
            <p className="page-subtitle addresses-hero__subtitle">
              These are the locations linked to your account. Keep them organised and instantly recognisable
              with clear labels.
            </p>
          </div>
          <div className="addresses-hero__actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRetry}
              disabled={isLoading}
            >
              Refresh list
            </button>
            <Link to="/addresses/new" className="btn btn-primary addresses-hero__cta">
              Add new address
            </Link>
          </div>
        </div>
        <div className="addresses-hero__metrics">
          <div className="addresses-metric-card">
              <span className="addresses-metric-card__label">Addresses on this page</span>
            <span className="addresses-metric-card__value">{hasAddresses ? addresses.length : 0}</span>
              <span className="addresses-metric-card__hint">Use the pagination controls to see more</span>
          </div>
          <div className="addresses-metric-card">
            <span className="addresses-metric-card__label">Primary label</span>
            <span className="addresses-metric-card__value addresses-metric-card__value--condensed">
              {primaryAddressLabel}
            </span>
            <span className="addresses-metric-card__hint">
              {hasAddresses ? "Most recently added" : "Create your first address to pin it here"}
            </span>
          </div>
        </div>
      </header>

      <div className="addresses-content">
        <nav className="addresses-pagination" aria-label="Addresses pagination">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handlePreviousPage}
            disabled={isLoading || !canGoPrevious}
          >
            Previous
          </button>
          <div className="addresses-pagination__status">
            <span className="addresses-pagination__page">Page {pageId}</span>
            <span className="addresses-pagination__meta">
              Showing {addresses.length} of {pageSize} per page
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleNextPage}
            disabled={isLoading || !canGoNext}
          >
            Next
          </button>
        </nav>

        {isLoading ? (
          <div className="addresses-state-card addresses-state-card--loading" role="status">
            <span className="addresses-state-card__spinner" aria-hidden="true" />
            <p>Loading addresses…</p>
          </div>
        ) : null}

        {isError ? (
          <div className="addresses-state-card addresses-state-card--error" role="alert">
            <div className="addresses-state-card__body">
              <h2>We couldn't load your addresses</h2>
              <p>{errorMessage}</p>
            </div>
            <div className="addresses-state-card__actions">
              <button type="button" className="btn btn-primary" onClick={handleRetry}>
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError && !hasAddresses ? (
          <div className="addresses-state-card addresses-state-card--empty">
            <div className="addresses-state-card__body">
              <h2>
                {pageId === DEFAULT_QUERY.pageId
                  ? "You're ready to add a location"
                  : "No addresses on this page yet"}
              </h2>
              <p>
                {pageId === DEFAULT_QUERY.pageId
                  ? "You have not saved any addresses yet."
                  : "Try going back to a previous page to see older addresses."}
              </p>
            </div>
            <div className="addresses-state-card__actions">
              {pageId === DEFAULT_QUERY.pageId ? (
                <Link to="/addresses/new" className="btn btn-secondary">
                  Create your first address
                </Link>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={handlePreviousPage}>
                  Go to previous page
                </button>
              )}
            </div>
          </div>
        ) : null}

        {!isLoading && !isError && hasAddresses ? (
          <ul className="address-card-grid" aria-live="polite">
            {addresses.map((address, index) => {
              const label = formatLabel(address);
              const key = address?.id ?? `${address?.address_label ?? "address"}-${index}`;
              const initials = label.charAt(0)?.toUpperCase() ?? "A";
              const regionParts = [
                address?.city ?? address?.town ?? address?.district,
                address?.state ?? address?.province ?? address?.region,
                address?.country ?? address?.country_name,
              ].filter(Boolean);
              const secondaryText = address?.formatted_address ?? regionParts.join(", ");

              return (
                <li key={key} className="address-card">
                  <span className="address-card__icon" aria-hidden="true">
                    {initials}
                  </span>
                  <div className="address-card__body">
                    <span className="address-card__label">{label}</span>
                    <span className="address-card__meta">
                      {secondaryText || "No additional details available yet."}
                    </span>
                  </div>
                  {address?.is_default ? (
                    <span className="address-card__chip">Default</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

const ProtectedAddressesList = withAuth(AddressesList);

export default ProtectedAddressesList;
