import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import withCustomerAuth from "../../hoc/withCustomerAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";

const extractBookings = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.bookings)) return payload.bookings;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normaliseBooking = (entry, fallbackId) => {
  return {
    id: entry?.id ?? fallbackId,
    customerId: entry?.customer_id,
    freelancerId: entry?.freelancer_id,
    serviceId: entry?.service_id,
    timeslotId: entry?.timeslot_id,
    note: entry?.note || "",
    finalPrice: entry?.final_price || "",
    currency: entry?.currency || "BHD",
    status: entry?.status || "pending",
    expiresAt: entry?.expires_at || "",
    slotDate: entry?.slot_date || "",
    startTime: entry?.start_time || "",
    endTime: entry?.end_time || "",
    rejectedReason: entry?.rejected_reason || "",
    freelancerSeen: entry?.freelancer_seen ?? false,
    createdAt: entry?.created_at || "",
    updatedAt: entry?.updated_at || "",
    freelancerFullName: entry?.freelancer_full_name || "",
    freelancerAvatarUrl: entry?.freelancer_avatar_url || "",
    serviceTitle: entry?.service_title || "",
  };
};

const formatDate = (rawValue) => {
  if (!rawValue) return "—";
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (rawValue) => {
  if (!rawValue) return "—";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return rawValue.slice(0, 5);
  }
  return rawValue;
};


const getFreelancerInitial = (name) => {
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  return "?";
};

const StatusBadge = ({ status }) => {
  const config = {
    pending: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      dot: "bg-amber-500",
      label: "Pending",
    },
    accepted: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      label: "Accepted",
    },
    rejected: {
      bg: "bg-rose-100",
      text: "text-rose-800",
      dot: "bg-rose-500",
      label: "Rejected",
    },
    completed: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      dot: "bg-blue-500",
      label: "Completed",
    },
    cancelled: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      dot: "bg-slate-500",
      label: "Cancelled",
    },
    expired: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      dot: "bg-gray-400",
      label: "Expired",
    },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export const CustomerDashboard = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [bookings, setBookings] = useState([]);
  const [bookingsStatus, setBookingsStatus] = useState("idle");
  const [bookingsError, setBookingsError] = useState(null);

  const loadBookings = useCallback(async () => {
    setBookingsStatus("loading");
    setBookingsError(null);
    try {
      const payload = await authenticatedFetch.requestJson("/users/me/bookings", {
        method: "GET",
      });
      const rows = extractBookings(payload).map((entry, index) =>
        normaliseBooking(entry, index)
      );
      setBookings(rows);
      setBookingsStatus("ready");
    } catch (error) {
      console.warn("[CustomerDashboard] Failed to load bookings", error);
      setBookings([]);
      setBookingsError(error);
      setBookingsStatus("error");
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const hasBookings = bookings.length > 0;
  const bookingsErrorMessage =
    bookingsError?.payload?.error ??
    bookingsError?.message ??
    "Unable to load your bookings. Please try again.";

  return (
    <section className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 p-8 shadow-2xl shadow-indigo-500/30 sm:p-10">
          <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Customer dashboard
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Welcome back</h1>
              <p className="max-w-xl text-base text-white/80 sm:text-lg">
                Manage your bookings, addresses, and discover new professionals ready to help you
                bring your next idea to life.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-6 text-sm text-white/90 shadow-lg shadow-black/10 backdrop-blur">
              <p className="font-semibold uppercase tracking-[0.14em]">Quick snapshot</p>
              <p className="mt-2 text-lg font-medium">
                {hasBookings
                  ? `You have ${bookings.length} booking${bookings.length === 1 ? "" : "s"}.`
                  : "Stay organised and connect with talent in minutes."}
              </p>
            </div>
          </div>
        </header>

        {/* Bookings Section */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                My Bookings
              </span>
              <h2 className="text-2xl font-semibold text-slate-900">Your appointments</h2>
              <p className="text-sm text-slate-600">
                Track the status of all your bookings with freelancers.
              </p>
            </div>
            <button
              type="button"
              onClick={loadBookings}
              disabled={bookingsStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-slate-700"
            >
              {bookingsStatus === "loading" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Loading...
                </>
              ) : (
                "Refresh"
              )}
            </button>
          </header>

          <div className="mt-6 space-y-4">
            {bookingsStatus === "loading" && bookings.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`bookings-loading-${index}`}
                    className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded-full bg-slate-200" />
                        <div className="h-3 w-48 rounded-full bg-slate-200" />
                      </div>
                      <div className="h-6 w-20 rounded-full bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bookingsStatus === "error" ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                <p className="font-semibold">We couldn&apos;t load your bookings.</p>
                <p className="mt-1">{bookingsErrorMessage}</p>
                <button
                  type="button"
                  onClick={loadBookings}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-600 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {bookingsStatus === "ready" && !hasBookings ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-3xl">
                  📅
                </div>
                <p className="text-base font-medium text-slate-700">No bookings yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Once you book a service with a freelancer, it will appear here.
                </p>
                <Link
                  to="/freelancers"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                >
                  Explore freelancers
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}

            {bookingsStatus === "ready" && hasBookings ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left side: Freelancer info */}
                      <div className="flex items-start gap-4">
                        {booking.freelancerAvatarUrl ? (
                          <img
                            src={booking.freelancerAvatarUrl}
                            alt={`${booking.freelancerFullName}'s avatar`}
                            className="h-14 w-14 rounded-full border-2 border-slate-100 object-cover shadow-sm"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 text-lg font-bold text-white shadow-sm">
                            {getFreelancerInitial(booking.freelancerFullName)}
                          </span>
                        )}
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-900">
                            {booking.freelancerFullName || "Unknown freelancer"}
                          </p>
                          <p className="text-sm font-medium text-indigo-600">
                            {booking.serviceTitle || "Service"}
                          </p>
                          <p className="text-xs text-slate-500">Booking #{booking.id}</p>
                        </div>
                      </div>

                      {/* Right side: Status */}
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <StatusBadge status={booking.status} />
                        {booking.status === "rejected" && booking.rejectedReason && (
                          <p
                            className="max-w-[200px] text-xs text-rose-600 sm:text-right"
                            title={booking.rejectedReason}
                          >
                            {booking.rejectedReason.length > 50
                              ? `${booking.rejectedReason.slice(0, 50)}...`
                              : booking.rejectedReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Booking details */}
                    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm">
                          📅
                        </span>
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-medium text-slate-900">{formatDate(booking.slotDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm">
                          🕐
                        </span>
                        <div>
                          <p className="text-xs text-slate-500">Time</p>
                          <p className="font-medium text-slate-900">
                            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm">
                          💰
                        </span>
                        <div>
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="font-medium text-slate-900">
                            {booking.finalPrice
                              ? `${booking.finalPrice} ${booking.currency}`
                              : "To be confirmed"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {booking.note && (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                        <p className="text-xs font-medium text-slate-500">Your note</p>
                        <p className="mt-1 text-sm text-slate-700">{booking.note}</p>
                      </div>
                    )}

                    {/* Chat button for accepted bookings */}
                    {booking.status === "accepted" && (
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/chat?booking=${booking.id}`}
                          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Chat with Freelancer
                        </Link>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Quick actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <article className="group flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-indigo-200/60">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-xl text-indigo-600">
                🔍
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Discover freelancers</h2>
                <p className="text-sm text-slate-600">
                  Browse public freelancer profiles, review services, and find someone who matches
                  your goals.
                </p>
              </div>
            </div>
            <Link
              to="/freelancers"
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
            >
              Explore freelancers
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-600">
                📍
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Manage your addresses</h2>
                <p className="text-sm text-slate-600">
                  Keep delivery and service locations up-to-date to streamline your booking
                  experience.
                </p>
              </div>
            </div>
            <Link
              to="/addresses"
              className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-600 bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            >
              Review addresses
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
};

const CustomerDashboardWithAuth = withCustomerAuth(CustomerDashboard);

CustomerDashboardWithAuth.displayName = "CustomerDashboardWithAuth";

export default CustomerDashboardWithAuth;
