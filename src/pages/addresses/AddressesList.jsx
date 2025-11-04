import { useCallback, useEffect, useMemo, useState } from "react";
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

  const fetchAddresses = useCallback(async () => {
    const params = new URLSearchParams({
      page_id: String(DEFAULT_QUERY.pageId),
      page_size: String(DEFAULT_QUERY.pageSize),
    });

    const payload = await authenticatedFetch.requestJson(
      `/users/me/addresses?${params.toString()}`,
      {
        method: "GET",
      }
    );

    return extractAddresses(payload);
  }, [authenticatedFetch]);

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
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchAddresses, refreshIndex]);

  const handleRetry = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const isLoading = status === "loading" || status === "idle";
  const isError = status === "error";
  const hasAddresses = addresses.length > 0;

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

  return (
    <section className="page addresses-page" aria-busy={isLoading}>
      <header className="page-header addresses-page__header">
        <div>
          <h1>Your addresses</h1>
          <p className="page-subtitle">
            These are the locations linked to your account. We show their labels so you can recognise them
            quickly.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRetry}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="state-message">Loading addresses…</p>
      ) : null}

      {isError ? (
        <div className="state-message state-error">
          <p>{errorMessage}</p>
          <button type="button" className="btn btn-primary" onClick={handleRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && !hasAddresses ? (
        <p className="state-message">You have not saved any addresses yet.</p>
      ) : null}

      {!isLoading && !isError && hasAddresses ? (
        <ul className="address-label-list" aria-live="polite">
          {addresses.map((address, index) => {
            const key = address?.id ?? `${address?.address_label ?? "address"}-${index}`;
            return (
              <li key={key} className="address-label-item">
                <span className="address-label-item__label">{formatLabel(address)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};

const ProtectedAddressesList = withAuth(AddressesList);

export default ProtectedAddressesList;
