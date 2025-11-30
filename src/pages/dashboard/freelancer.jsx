import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { extractFreelancerProfile } from "../../utils/freelancer";

const LOCATION_LABELS = {
  on_premise: "At my location",
  door_step: "At client's location",
};

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load your freelancer workspace right now. Please refresh and try again.";

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return null;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const formatPrice = (service) => {
  if (!service || typeof service !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(service, "fixed_price") && service.fixed_price != null) {
    const fixed = Number(service.fixed_price);
    if (Number.isFinite(fixed)) {
      return `£${fixed.toFixed(2)}`;
    }
  }

  const hasRange =
    Object.prototype.hasOwnProperty.call(service, "min_price") &&
    Object.prototype.hasOwnProperty.call(service, "max_price");

  if (hasRange && service.min_price != null && service.max_price != null) {
    const min = Number(service.min_price);
    const max = Number(service.max_price);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return `£${min.toFixed(2)} – £${max.toFixed(2)}`;
    }
  }

  return null;
};

const extractTimeslotItems = (payload) => {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload.timeslots)) {
    return payload.timeslots;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
};

const normaliseTimeslotRecord = (entry, fallbackId) => {
  const getString = (...candidates) => {
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return "";
  };

  const idCandidate = entry?.id ?? entry?.ID ?? entry?.timeslot_id ?? fallbackId;

  return {
    id: idCandidate ?? fallbackId,
    slotDate: getString(entry?.slot_date, entry?.slotDate, entry?.SlotDate),
    startTime: getString(entry?.start_time, entry?.startTime, entry?.StartTime),
    endTime: getString(entry?.end_time, entry?.endTime, entry?.EndTime),
    customerFullName: getString(
      entry?.customer_full_name,
      entry?.customerFullName,
      entry?.CustomerFullName
    ),
    customerAvatarUrl: getString(
      entry?.customer_avatar_url,
      entry?.customerAvatarUrl,
      entry?.CustomerAvatarUrl
    ),
    serviceTitle: getString(entry?.service_title, entry?.serviceTitle, entry?.ServiceTitle),
  };
};

const formatTimeslotDate = (rawValue) => {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return "—";
  }
  const candidate = rawValue.trim();
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return candidate;
  }
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTimeslotTime = (rawValue) => {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return "—";
  }
  const candidate = rawValue.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(candidate)) {
    return candidate.slice(0, 5);
  }
  return candidate;
};

const getCustomerInitial = (name) => {
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  return "?";
};

export const FreelancerDashboard = () => {
  const {
    user,
    freelancerProfile,
    freelancerProfileStatus,
    setFreelancerProfile,
    setFreelancerProfileStatus,
  } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [pageStatus, setPageStatus] = useState(
    freelancerProfileStatus === "ready" && freelancerProfile ? "ready" : "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [toggleState, setToggleState] = useState({
    isPublic: Boolean(freelancerProfile?.is_public),
    isAcceptingOrders: Boolean(freelancerProfile?.is_accepting_orders),
  });
  const [activeToggle, setActiveToggle] = useState(null);
  const [toggleFeedback, setToggleFeedback] = useState({ type: null, message: "" });
  const [timeslotRequests, setTimeslotRequests] = useState([]);
  const [timeslotStatus, setTimeslotStatus] = useState("idle");
  const [timeslotError, setTimeslotError] = useState(null);

  useEffect(() => {
    const hasProfile = Boolean(freelancerProfile);

    if (freelancerProfileStatus === "ready" && hasProfile) {
      setPageStatus("ready");
      setErrorMessage("");
      return;
    }

    if (freelancerProfileStatus === "error") {
      setPageStatus("error");
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      return;
    }

    if (freelancerProfileStatus === "missing") {
      setPageStatus("error");
      setErrorMessage(
        "We couldn't find your freelancer profile. Please complete onboarding."
      );
      return;
    }

    if (freelancerProfileStatus === "unauthorized") {
      setPageStatus("error");
      setErrorMessage("You do not have permission to view this freelancer profile.");
      return;
    }

    setPageStatus("loading");
    setErrorMessage("");
  }, [freelancerProfile, freelancerProfileStatus]);

  useEffect(() => {
    setToggleState({
      isPublic: Boolean(freelancerProfile?.is_public),
      isAcceptingOrders: Boolean(freelancerProfile?.is_accepting_orders),
    });
  }, [freelancerProfile?.is_public, freelancerProfile?.is_accepting_orders]);

  const loadTimeslotRequests = useCallback(async () => {
    setTimeslotStatus("loading");
    setTimeslotError(null);
    try {
      const payload = await authenticatedFetch.requestJson("/users/me/freelancer/bookings", {
        method: "GET",
      });
      const rows = extractTimeslotItems(payload).map((entry, index) =>
        normaliseTimeslotRecord(entry, index)
      );
      setTimeslotRequests(rows);
      setTimeslotStatus("ready");
    } catch (timeslotFetchError) {
      console.warn("[FreelancerDashboard] Failed to load freelancer timeslots", timeslotFetchError);
      setTimeslotRequests([]);
      setTimeslotError(timeslotFetchError);
      setTimeslotStatus("error");
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadTimeslotRequests();
  }, [loadTimeslotRequests]);

  const handleToggleChange = useCallback(
    async (fieldKey) => {
      if (!freelancerProfile) {
        return;
      }

      const payloadKey = fieldKey === "isPublic" ? "is_public" : "is_accepting_orders";

      setToggleFeedback({ type: null, message: "" });
      setActiveToggle(fieldKey);
      const nextValue = !toggleState[fieldKey];
      setToggleState((previous) => ({ ...previous, [fieldKey]: nextValue }));

      try {
        await authenticatedFetch.requestJson("/users/me/freelancer/", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [payloadKey]: nextValue }),
        });

        const refreshedPayload = await authenticatedFetch.requestJson("/users/me/freelancer/", {
          method: "GET",
        });
        const refreshedProfile = extractFreelancerProfile(refreshedPayload);
        if (refreshedProfile) {
          setFreelancerProfile(refreshedProfile);
          setFreelancerProfileStatus("ready");
        }
        setToggleFeedback({
          type: "success",
          message:
            fieldKey === "isPublic"
              ? `Public profile ${nextValue ? "enabled" : "hidden"}.`
              : `Accepting orders ${nextValue ? "enabled" : "paused"}.`,
        });
      } catch (error) {
        console.warn("[FreelancerDashboard] Failed to update freelancer settings", error);
        setToggleState((previous) => ({
          ...previous,
          [fieldKey]: !nextValue,
        }));
        setToggleFeedback({
          type: "error",
          message: "We couldn't update your settings. Please try again.",
        });
      } finally {
        setActiveToggle(null);
      }
    },
    [
      authenticatedFetch,
      freelancerProfile,
      setFreelancerProfile,
      setFreelancerProfileStatus,
      toggleState,
    ]
  );

  const defaultAddress = useMemo(() => {
    if (!Array.isArray(freelancerProfile?.address)) {
      return null;
    }
    return (
      freelancerProfile.address.find((entry) => entry?.is_default) ??
      freelancerProfile.address[0] ??
      null
    );
  }, [freelancerProfile]);

  const services = useMemo(() => {
    if (Array.isArray(freelancerProfile?.services)) {
      return freelancerProfile.services;
    }
    return [];
  }, [freelancerProfile]);

  const hasAddress = Boolean(defaultAddress);
  const hasServices = services.length > 0;
  const hasTimeslotRequests = timeslotRequests.length > 0;
  const displayName = user?.full_name ?? user?.first_name ?? user?.email ?? "Freelancer";
  const isMutatingToggle = Boolean(activeToggle);
  const timeslotErrorMessage =
    timeslotError?.payload?.error ??
    timeslotError?.message ??
    "Unable to load booking requests. Please try again.";
  const handleRefreshTimeslots = useCallback(() => {
    if (timeslotStatus === "loading") {
      return;
    }
    loadTimeslotRequests();
  }, [loadTimeslotRequests, timeslotStatus]);

  return (
    <section className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-rose-500 p-8 shadow-2xl shadow-fuchsia-500/30 sm:p-10">
          <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Freelancer dashboard
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Welcome back, {displayName}
              </h1>
              <p className="max-w-2xl text-base text-white/80 sm:text-lg">
                Keep your address and services up to date so customers can find and book you in
                minutes.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-6 text-sm text-white/90 shadow-lg shadow-black/10 backdrop-blur">
              <p className="font-semibold uppercase tracking-[0.14em]">Workspace status</p>
              <p className="mt-2 text-lg font-medium">
                {hasAddress && hasServices
                  ? "You’re ready to accept bookings."
                  : "Complete the steps below to start receiving bookings."}
              </p>
            </div>
          </div>
        </header>

        {pageStatus === "loading" && (
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-600 shadow">
            Loading your freelancer details…
          </p>
        )}

        {pageStatus === "error" && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 shadow">
            {errorMessage || DEFAULT_ERROR_MESSAGE}
          </p>
        )}

        {pageStatus === "ready" && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Booking requests
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    These are the customers who want to book
                  </h2>
                  <p className="text-sm text-slate-600">
                    Only freelancers with customer-requested timeslots can access this list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshTimeslots}
                  disabled={timeslotStatus === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-slate-700"
                >
                  Refresh list
                </button>
              </header>

              <div className="mt-6 space-y-4">
                {timeslotStatus === "loading" ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`timeslots-loading-${index}`}
                        className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                      >
                        <div className="h-4 w-24 rounded-full bg-slate-200" />
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div className="h-3 rounded-full bg-slate-200" />
                          <div className="h-3 rounded-full bg-slate-200" />
                          <div className="h-3 rounded-full bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {timeslotStatus === "error" ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                    <p className="font-semibold">We couldn&apos;t load booking requests.</p>
                    <p className="mt-1">{timeslotErrorMessage}</p>
                    <button
                      type="button"
                      onClick={handleRefreshTimeslots}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-600 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}

                {timeslotStatus === "ready" && !hasTimeslotRequests ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                    No customers have requested any timeslots yet.
                  </div>
                ) : null}

                {timeslotStatus === "ready" && hasTimeslotRequests ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left">
                            ID
                          </th>
                          <th scope="col" className="px-4 py-3 text-left">
                            Slot date
                          </th>
                          <th scope="col" className="px-4 py-3 text-left">
                            Start
                          </th>
                          <th scope="col" className="px-4 py-3 text-left">
                            End
                          </th>
                          <th scope="col" className="px-4 py-3 text-left">
                            Customer
                          </th>
                          <th scope="col" className="px-4 py-3 text-left">
                            Service
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {timeslotRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                              #{request.id}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              {formatTimeslotDate(request.slotDate)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              {formatTimeslotTime(request.startTime)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              {formatTimeslotTime(request.endTime)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {request.customerAvatarUrl ? (
                                  <img
                                    src={request.customerAvatarUrl}
                                    alt={
                                      request.customerFullName
                                        ? `${request.customerFullName}'s avatar`
                                        : "Customer avatar"
                                    }
                                    className="h-10 w-10 rounded-full border border-slate-100 object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                                    {getCustomerInitial(request.customerFullName)}
                                  </span>
                                )}
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {request.customerFullName || "Unknown customer"}
                                  </p>
                                  <p className="text-xs text-slate-500">Requested booking</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {request.serviceTitle || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-xl text-violet-600">
                    ⚙️
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Visibility & availability</h2>
                    <p className="text-sm text-slate-600">
                      Control whether clients can find you and send booking requests.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => handleToggleChange("isPublic")}
                    disabled={isMutatingToggle || pageStatus !== "ready"}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      toggleState.isPublic
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-200 bg-white"
                    } ${isMutatingToggle || pageStatus !== "ready" ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Public profile</p>
                      <p className="text-xs text-slate-600">
                        {toggleState.isPublic
                          ? "Your profile is visible to customers."
                          : "Hidden from discovery until you turn it on."}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                        toggleState.isPublic ? "bg-violet-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          toggleState.isPublic ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleChange("isAcceptingOrders")}
                    disabled={isMutatingToggle || pageStatus !== "ready"}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      toggleState.isAcceptingOrders
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    } ${isMutatingToggle || pageStatus !== "ready" ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Accepting orders</p>
                      <p className="text-xs text-slate-600">
                        {toggleState.isAcceptingOrders
                          ? "Clients can request new bookings."
                          : "Pausing orders stops new booking requests."}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                        toggleState.isAcceptingOrders ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          toggleState.isAcceptingOrders ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                {toggleFeedback.message && (
                  <p
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      toggleFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800"
                        : toggleFeedback.type === "error"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {activeToggle ? "Saving…" : toggleFeedback.message}
                  </p>
                )}
              </article>

              <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-xl text-indigo-600">
                    📍
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Default address</h2>
                    <p className="text-sm text-slate-600">
                      Customers use this location to know where you operate.
                    </p>
                  </div>
                </div>

                {hasAddress ? (
                  <dl className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-700">
                    {defaultAddress.address_label && (
                      <>
                        <dt className="font-semibold text-slate-900">Label</dt>
                        <dd>{defaultAddress.address_label}</dd>
                      </>
                    )}
                    <div>
                      <dt className="font-semibold text-slate-900">Address</dt>
                      <dd className="space-y-1">
                        <p>{defaultAddress.address_line_1}</p>
                        {defaultAddress.address_line_2 && <p>{defaultAddress.address_line_2}</p>}
                        <p>
                          {[defaultAddress.town, defaultAddress.governorate]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {defaultAddress.country && <p>{defaultAddress.country}</p>}
                      </dd>
                    </div>
                    {defaultAddress.additional_directions && (
                      <>
                        <dt className="font-semibold text-slate-900">Directions</dt>
                        <dd>{defaultAddress.additional_directions}</dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-900">
                    <p className="font-semibold">You need to add an address.</p>
                    <p className="mt-2">
                      This helps customers know where to meet you or where you can travel to.
                    </p>
                    <Link
                      to="/addresses/new"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
                    >
                      Click here to add address
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </article>

              <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-600">
                    💼
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Services</h2>
                    <p className="text-sm text-slate-600">
                      Showcase what you offer so customers can book confidently.
                    </p>
                  </div>
                </div>

                {hasServices ? (
                  <p className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                    You currently have {services.length} service
                    {services.length === 1 ? "" : "s"} published.
                  </p>
                ) : (
                  <div className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/80 p-4 text-sm text-cyan-900">
                    <p className="font-semibold">You need to add a service.</p>
                    <p className="mt-2">
                      Add at least one service with pricing so customers can send booking requests.
                    </p>
                    <Link
                      to="/settings/freelancer-services/create"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-600"
                    >
                      Click here to add service
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/settings/freelancer-services/create"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                  >
                    Add new service
                    <span aria-hidden="true">+</span>
                  </Link>
                  <Link
                    to="/settings/freelancer-services/view"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
                  >
                    Manage services
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </div>

            {hasServices && (
              <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
                <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Published services</h2>
                    <p className="text-sm text-slate-600">
                      Quick overview of what clients can currently book.
                    </p>
                  </div>
                  <Link
                    to="/settings/freelancer-services/view"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                  >
                    View full details
                    <span aria-hidden="true">→</span>
                  </Link>
                </header>
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map((service) => {
                    const priceLabel = formatPrice(service);
                    const durationLabel = formatDuration(service.service_duration_seconds);
                    const locationLabel = LOCATION_LABELS[service.location] ?? service.location;
                    return (
                      <article
                        key={service.id ?? service.title}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
                      >
                        <h3 className="text-lg font-semibold text-slate-900">
                          {service.title ?? "Untitled service"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {service.service_category_name ?? "Uncategorised"}
                        </p>
                        {service.description && (
                          <p className="mt-2 text-sm text-slate-700 line-clamp-3">
                            {service.description}
                          </p>
                        )}
                        <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                          {priceLabel && (
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900">Pricing</dt>
                              <dd>{priceLabel}</dd>
                            </div>
                          )}
                          {durationLabel && (
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900">Duration</dt>
                              <dd>{durationLabel}</dd>
                            </div>
                          )}
                          {locationLabel && (
                            <div className="flex items-center justify-between">
                              <dt className="font-medium text-slate-900">Location</dt>
                              <dd>{locationLabel}</dd>
                            </div>
                          )}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
};

const FreelancerDashboardWithAuth = withFreelancerAuth(FreelancerDashboard);

FreelancerDashboardWithAuth.displayName = "FreelancerDashboardWithAuth";

export default FreelancerDashboardWithAuth;

