import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import EditAddressForm from "../../components/address/EditAddressForm.jsx";
import withAuth from "../../hoc/withAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { STORAGE_KEY } from "../../components/address/formUtils.js";

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

  if (!id) {
    return <Navigate to="/addresses" replace />;
  }

  return (
    <section className="page address-details-page" aria-busy={isLoading}>
      <header className="page-header">
        <div className="page-header__summary">
          <Link to="/addresses" className="btn btn-ghost">
            &larr; Back to addresses
          </Link>
          <h1>{addressLabel}</h1>
          <p className="page-subtitle">
            {addressMeta
              ? addressMeta
              : "Review, update, or remove this address from your saved locations."}
          </p>
          {address?.is_default ? (
            <span className="badge badge-success" aria-label="Default address">
              Default address
            </span>
          ) : null}
        </div>
        <div className="page-header__actions">
          {!address?.is_default ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSetDefault}
              disabled={isLoading || settingDefault}
            >
              {settingDefault ? "Setting default…" : "Set as default"}
            </button>
          ) : null}
          <div className="address-details__actions-group">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting || isLoading}
            >
              {deleting ? "Deleting…" : "Delete address"}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="addresses-state-card addresses-state-card--loading" role="status">
          <span className="addresses-state-card__spinner" aria-hidden="true" />
          <p>Loading address details…</p>
        </div>
      ) : null}

      {isError ? (
        <div className="addresses-state-card addresses-state-card--error" role="alert">
          <div className="addresses-state-card__body">
            <h2>We couldn't load this address</h2>
            <p>{errorMessage}</p>
          </div>
          <div className="addresses-state-card__actions">
            <button type="button" className="btn btn-primary" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && address ? (
        <div className="address-details-content">
          <section aria-live="polite">
            <h2>Edit address</h2>
            <EditAddressForm address={address} onSuccess={handleUpdateSuccess} />
          </section>
          <section className="address-details-meta">
            <h3>Metadata</h3>
            <dl>
              <div>
                <dt>ID</dt>
                <dd>{address.id}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{address.address_type ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{address.created_at ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{address.updated_at ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>
                  Lat: {address.latitude ?? "—"} <br />
                  Lon: {address.longitude ?? "—"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </section>
  );
};

const ProtectedAddressDetails = withAuth(AddressDetails);

export default ProtectedAddressDetails;


