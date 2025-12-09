import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import EditAddressForm from "../../components/address/EditAddressForm.jsx";
import withAuth from "../../hoc/withAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { STORAGE_KEY, ADDRESS_TYPES } from "../../components/address/formUtils.js";

const fallbackLabel = (address) => {
  const rawLabel = address?.address_label ?? address?.addressLabel ?? "";
  const trimmed = typeof rawLabel === "string" ? rawLabel.trim() : "";
  return trimmed.length > 0 ? trimmed : "Unnamed address";
};

const formatAddressMeta = (address) => {
  if (!address) {
    return null;
  }

  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.town,
    address.governorate,
    address.country,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return parts.join(", ");
};

const getAddressTypeInfo = (type) => {
  const found = ADDRESS_TYPES?.find((t) => t.value === type);
  return found || { label: type || "Address", value: type };
};

// Icons as components for cleaner JSX
const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const IconMapPin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const IconEdit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconAlertCircle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();
  const toast = useToast();

  const [address, setAddress] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const loadAddress = useCallback(
    async (options = { silent: false }) => {
      const { silent } = options;
      if (!silent) {
        setStatus("loading");
      }
      setError(null);

      try {
        const response = await authenticatedFetch.requestJson(`/users/me/addresses/${id}`, {
          method: "GET",
        });

        const addressPayload = response?.address ?? response ?? null;
        if (!addressPayload || typeof addressPayload !== "object") {
          throw new Error("Failed to load address details.");
        }
        setAddress(addressPayload);
        setStatus("ready");
      } catch (loadError) {
        const statusCode = loadError?.status ?? null;
        if (statusCode === 403 || statusCode === 500) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setError(loadError);
        setStatus("error");
      }
    },
    [authenticatedFetch, id, navigate]
  );

  useEffect(() => {
    loadAddress();
  }, [loadAddress, refreshIndex]);

  const handleRefresh = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const refreshDefaultAddress = useCallback(async () => {
    try {
      const response = await authenticatedFetch.requestJson("/users/me/addresses/default", {
        method: "GET",
      });

      const nextDefault = response?.address ?? response ?? null;
      if (!nextDefault || typeof nextDefault !== "object") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        return null;
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDefault));
        }
      } catch (storageError) {
        console.warn("Failed to cache refreshed default address", storageError);
      }

      return nextDefault;
    } catch (fetchError) {
      if (fetchError?.status === 404) {
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        } catch (storageError) {
          console.warn("Failed to remove missing default address from local storage", storageError);
        }
        return null;
      }

      console.warn("Failed to refresh default address", fetchError);
      return null;
    }
  }, [authenticatedFetch]);

  const handleUpdateSuccess = useCallback(
    async (updatedAddress) => {
      setAddress(updatedAddress);
      if (updatedAddress?.is_default) {
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAddress));
          }
        } catch (storageError) {
          console.warn("Failed to update default address in local storage", storageError);
        }
      }

      await loadAddress({ silent: true });
    },
    [loadAddress]
  );

  const handleSetDefault = useCallback(async () => {
    if (!address || settingDefault) {
      return;
    }

    setSettingDefault(true);

    try {
      const response = await authenticatedFetch.requestJson(
        `/users/me/addresses/${address.id}/default`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const updated = response?.address ?? response ?? null;
      if (!updated || typeof updated !== "object") {
        throw new Error("Missing address payload from set default response.");
      }

      setAddress(updated);

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (storageError) {
        console.warn("Failed to cache default address after update", storageError);
      }

      toast.success({
        title: "Default address updated",
        message: `"${fallbackLabel(updated)}" is now your default address.`,
      });

      await loadAddress({ silent: true });
    } catch (error) {
      const statusCode = error?.status ?? null;

      console.error("Failed to set default address", error);
      const payloadMessage =
        error?.payload?.error ?? error?.payload?.message ?? error?.payload?.detail ?? null;

      toast.error({
        title: "Could not set default address",
        message:
          payloadMessage ??
          (statusCode === 401
            ? "Your session expired. Please sign in again."
            : "Please try again or contact support if the issue persists."),
      });
    } finally {
      setSettingDefault(false);
    }
  }, [address, authenticatedFetch, loadAddress, navigate, settingDefault, toast]);

  const handleDelete = useCallback(async () => {
    if (!address || deleting) {
      return;
    }

    const label = fallbackLabel(address);
    const confirmed = window.confirm(
      `Are you sure you want to delete "${label}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await authenticatedFetch(`/users/me/addresses/${id}`, {
        method: "DELETE",
      });

      if (response.status !== 204 && !response.ok) {
        const error = new Error(`Failed to delete address (status ${response.status}).`);
        error.status = response.status;
        throw error;
      }

      if (address.is_default) {
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        } catch (storageError) {
          console.warn("Failed to remove default address from local storage", storageError);
        }

        await refreshDefaultAddress();
      }

      toast.success({
        title: "Address deleted",
        message: "The address was removed successfully.",
      });

      navigate("/addresses", {
        replace: true,
        state: { refreshAddresses: Date.now() },
      });
    } catch (deleteError) {
      const statusCode = deleteError?.status ?? null;
      if (statusCode === 403 || statusCode === 500) {
        navigate("/dashboard", { replace: true });
        return;
      }

      console.error("Failed to delete address", deleteError);
      const payloadMessage =
        deleteError?.payload?.error ??
        deleteError?.payload?.message ??
        deleteError?.payload?.detail ??
        null;

      toast.error({
        title: "Could not delete address",
        message:
          payloadMessage ??
          (statusCode === 401
            ? "Your session expired. Please sign in again."
            : "Please try again or contact support if the issue persists."),
      });
    } finally {
      setDeleting(false);
    }
  }, [address, authenticatedFetch, deleting, id, navigate, refreshDefaultAddress, toast]);

  const isLoading = status === "loading" || status === "idle";
  const isError = status === "error";

  const addressLabel = useMemo(() => fallbackLabel(address), [address]);
  const addressMeta = useMemo(() => formatAddressMeta(address), [address]);

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

    return error.message ?? "Something went wrong while loading this address.";
  }, [error]);

  const addressTypeInfo = useMemo(() => getAddressTypeInfo(address?.address_type), [address]);

  if (!id) {
    return <Navigate to="/addresses" replace />;
  }

  return (
    <section className="page address-details-page" aria-busy={isLoading}>
      {/* Back Navigation */}
      <nav className="address-details__nav">
        <Link to="/addresses" className="address-details__back-link">
          <IconArrowLeft />
          <span>Back to addresses</span>
        </Link>
      </nav>

      {/* Hero Header Card */}
      <header className="address-details__hero">
        <div className="address-details__hero-bg" aria-hidden="true" />
        
        <div className="address-details__hero-content">
          {/* Icon & Title Section */}
          <div className="address-details__hero-main">
            <div className="address-details__icon-wrapper">
              <IconMapPin />
            </div>
            
            <div className="address-details__hero-text">
              <div className="address-details__title-row">
                <h1 className="address-details__title">{addressLabel}</h1>
                {address?.is_default && (
                  <span className="address-details__default-badge">
                    <IconCheck />
                    <span>Default</span>
                  </span>
                )}
              </div>
              
              {addressMeta && (
                <p className="address-details__meta">{addressMeta}</p>
              )}
              
              <div className="address-details__tags">
                <span className="address-details__type-tag">
                  {addressTypeInfo.label}
                </span>
                {address?.latitude && address?.longitude && (
                  <span className="address-details__coords-tag">
                    📍 {Number(address.latitude).toFixed(4)}, {Number(address.longitude).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="address-details__hero-actions">
            {!address?.is_default && !isLoading && (
              <button
                type="button"
                className="address-details__action-btn address-details__action-btn--primary"
                onClick={handleSetDefault}
                disabled={settingDefault}
              >
                <IconStar />
                <span>{settingDefault ? "Setting…" : "Set as default"}</span>
              </button>
            )}
            
            <button
              type="button"
              className="address-details__action-btn address-details__action-btn--ghost"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh address data"
            >
              <IconRefresh />
              <span>Refresh</span>
            </button>
            
            <button
              type="button"
              className="address-details__action-btn address-details__action-btn--danger"
              onClick={handleDelete}
              disabled={deleting || isLoading}
            >
              <IconTrash />
              <span>{deleting ? "Deleting…" : "Delete"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="address-details__state-card address-details__state-card--loading" role="status">
          <div className="address-details__loader">
            <span className="address-details__spinner" aria-hidden="true" />
          </div>
          <div className="address-details__state-text">
            <h3>Loading address details</h3>
            <p>Please wait while we fetch your address information...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="address-details__state-card address-details__state-card--error" role="alert">
          <div className="address-details__state-icon address-details__state-icon--error">
            <IconAlertCircle />
          </div>
          <div className="address-details__state-text">
            <h3>Unable to load address</h3>
            <p>{errorMessage}</p>
          </div>
          <div className="address-details__state-actions">
            <button type="button" className="btn btn-primary" onClick={handleRefresh}>
              <IconRefresh />
              <span>Try again</span>
            </button>
            <Link to="/addresses" className="btn btn-ghost">
              Return to addresses
            </Link>
          </div>
        </div>
      )}

      {/* Edit Form Section */}
      {!isLoading && !isError && address && (
        <div className="address-details__content">
          <div className="address-details__form-card">
            <header className="address-details__form-header">
              <div className="address-details__form-header-icon">
                <IconEdit />
              </div>
              <div className="address-details__form-header-text">
                <h2>Edit address details</h2>
                <p>Update the information below to modify this saved address.</p>
              </div>
            </header>
            
            <div className="address-details__form-body">
              <EditAddressForm 
                address={address} 
                onSuccess={handleUpdateSuccess}
                className="form address-form address-form--enhanced" 
              />
            </div>
          </div>
          
          {/* Helpful Tips Card */}
          <aside className="address-details__tips-card">
            <h4 className="address-details__tips-title">💡 Quick tips</h4>
            <ul className="address-details__tips-list">
              <li>Keep your <strong>address label</strong> short and memorable (e.g., "Home", "Office")</li>
              <li>Accurate <strong>coordinates</strong> help service providers locate you faster</li>
              <li>Add <strong>landmarks</strong> in the directions field for easier navigation</li>
              <li>Your <strong>default address</strong> will be pre-selected for new bookings</li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
};

const ProtectedAddressDetails = withAuth(AddressDetails);

export default ProtectedAddressDetails;


