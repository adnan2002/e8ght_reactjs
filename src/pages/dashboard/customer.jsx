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
    freelancerUserId: entry?.freelancer_user_id || null,
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
      bg: "#fef3c7",
      text: "#f59e0b",
      dot: "#f59e0b",
      label: "Pending",
    },
    accepted: {
      bg: "#d1fae5",
      text: "#10b981",
      dot: "#10b981",
      label: "Accepted",
    },
    rejected: {
      bg: "#fee2e2",
      text: "#dc2626",
      dot: "#dc2626",
      label: "Rejected",
    },
    completed: {
      bg: "#dbeafe",
      text: "#3b82f6",
      dot: "#3b82f6",
      label: "Completed",
    },
    cancelled: {
      bg: "#f3f4f6",
      text: "#6b7280",
      dot: "#6b7280",
      label: "Cancelled",
    },
    expired: {
      bg: "#f3f4f6",
      text: "#6b7280",
      dot: "#9ca3af",
      label: "Expired",
    },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
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
    <section className="min-h-screen py-12" style={{ background: "linear-gradient(to bottom, #fdf2f8 0%, white 50%, #fdf2f8 100%)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* Header with Pink Gradient */}
        <header
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
            boxShadow: "0 16px 40px rgba(236, 72, 153, 0.25)",
          }}
        >
          <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  letterSpacing: "0.1em",
                }}
              >
                Customer dashboard
              </span>
              <h1
                className="text-4xl font-extrabold tracking-tight sm:text-5xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Welcome back
              </h1>
              <p className="max-w-xl text-base text-white/80 sm:text-lg">
                Manage your bookings, addresses, and discover new professionals ready to help you
                bring your next idea to life.
              </p>
            </div>
            <div
              className="rounded-2xl p-6 text-sm text-white/90"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
              }}
            >
              <p className="font-semibold uppercase" style={{ letterSpacing: "0.1em" }}>
                Quick snapshot
              </p>
              <p className="mt-2 text-lg font-medium">
                {hasBookings
                  ? `You have ${bookings.length} booking${bookings.length === 1 ? "" : "s"}.`
                  : "Stay organised and connect with talent in minutes."}
              </p>
            </div>
          </div>
        </header>

        {/* Bookings Section */}
        <section
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgba(236, 72, 153, 0.1)",
            background: "white",
            boxShadow: "0 8px 20px rgba(236, 72, 153, 0.08)",
          }}
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase"
                style={{
                  background: "rgba(236, 72, 153, 0.1)",
                  color: "#ec4899",
                  letterSpacing: "0.1em",
                }}
              >
                My Bookings
              </span>
              <h2 className="text-2xl font-bold" style={{ color: "#1f2937" }}>
                Your appointments
              </h2>
              <p className="text-sm" style={{ color: "#4b5563" }}>
                Track the status of all your bookings with freelancers.
              </p>
            </div>
            <button
              type="button"
              onClick={loadBookings}
              disabled={bookingsStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
              style={{
                background: bookingsStatus === "loading" ? "#9ca3af" : "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                boxShadow: bookingsStatus === "loading" ? "none" : "0 4px 14px rgba(236, 72, 153, 0.35)",
                cursor: bookingsStatus === "loading" ? "not-allowed" : "pointer",
              }}
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
                    className="animate-pulse rounded-2xl border p-4"
                    style={{ borderColor: "rgba(236, 72, 153, 0.1)", background: "#fdf2f8" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full" style={{ background: "#fbcfe8" }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded-full" style={{ background: "#fbcfe8" }} />
                        <div className="h-3 w-48 rounded-full" style={{ background: "#fbcfe8" }} />
                      </div>
                      <div className="h-6 w-20 rounded-full" style={{ background: "#fbcfe8" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bookingsStatus === "error" ? (
              <div
                className="rounded-2xl border p-4 text-sm"
                style={{ borderColor: "#fee2e2", background: "#fee2e2", color: "#dc2626" }}
              >
                <p className="font-semibold">We couldn&apos;t load your bookings.</p>
                <p className="mt-1">{bookingsErrorMessage}</p>
                <button
                  type="button"
                  onClick={loadBookings}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition"
                  style={{ borderColor: "#dc2626", color: "#dc2626" }}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {bookingsStatus === "ready" && !hasBookings ? (
              <div
                className="rounded-2xl border border-dashed p-8 text-center"
                style={{ borderColor: "#fbcfe8", background: "#fdf2f8" }}
              >
                <div
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-3xl"
                  style={{ background: "#fce7f3" }}
                >
                  📅
                </div>
                <p className="text-base font-medium" style={{ color: "#1f2937" }}>No bookings yet</p>
                <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
                  Once you book a service with a freelancer, it will appear here.
                </p>
                <Link
                  to="/freelancers"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow transition"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                    boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
                  }}
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
                    className="rounded-2xl border bg-white p-4 shadow-sm transition"
                    style={{
                      borderColor: "rgba(236, 72, 153, 0.1)",
                      boxShadow: "0 4px 12px rgba(236, 72, 153, 0.06)",
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left side: Freelancer info */}
                      <div className="flex items-start gap-4">
                        {booking.freelancerAvatarUrl ? (
                          <img
                            src={booking.freelancerAvatarUrl}
                            alt={`${booking.freelancerFullName}'s avatar`}
                            className="h-14 w-14 rounded-xl border-2 object-cover shadow-sm"
                            style={{ borderColor: "rgba(236, 72, 153, 0.2)" }}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="grid h-14 w-14 place-items-center rounded-xl text-lg font-bold text-white shadow-sm"
                            style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
                          >
                            {getFreelancerInitial(booking.freelancerFullName)}
                          </span>
                        )}
                        <div className="space-y-1">
                          <p className="text-base font-semibold" style={{ color: "#1f2937" }}>
                            {booking.freelancerFullName || "Unknown freelancer"}
                          </p>
                          <p className="text-sm font-medium" style={{ color: "#ec4899" }}>
                            {booking.serviceTitle || "Service"}
                          </p>
                          <p className="text-xs" style={{ color: "#6b7280" }}>Booking #{booking.id}</p>
                        </div>
                      </div>

                      {/* Right side: Status */}
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <StatusBadge status={booking.status} />
                        {booking.status === "rejected" && booking.rejectedReason && (
                          <p
                            className="max-w-[200px] text-xs sm:text-right"
                            style={{ color: "#dc2626" }}
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
                    <div
                      className="mt-4 grid gap-3 rounded-xl p-3 text-sm sm:grid-cols-3"
                      style={{ background: "#fdf2f8" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm"
                        >
                          📅
                        </span>
                        <div>
                          <p className="text-xs" style={{ color: "#6b7280" }}>Date</p>
                          <p className="font-medium" style={{ color: "#1f2937" }}>{formatDate(booking.slotDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm"
                        >
                          🕐
                        </span>
                        <div>
                          <p className="text-xs" style={{ color: "#6b7280" }}>Time</p>
                          <p className="font-medium" style={{ color: "#1f2937" }}>
                            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base shadow-sm"
                        >
                          💰
                        </span>
                        <div>
                          <p className="text-xs" style={{ color: "#6b7280" }}>Price</p>
                          <p className="font-medium" style={{ color: "#1f2937" }}>
                            {booking.finalPrice
                              ? `${booking.finalPrice} ${booking.currency}`
                              : "To be confirmed"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {booking.note && (
                      <div
                        className="mt-3 rounded-xl border p-3"
                        style={{ borderColor: "rgba(236, 72, 153, 0.1)", background: "#fdf2f8" }}
                      >
                        <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Your note</p>
                        <p className="mt-1 text-sm" style={{ color: "#4b5563" }}>{booking.note}</p>
                      </div>
                    )}

                    {/* Chat button for accepted bookings */}
                    {booking.status === "accepted" && booking.freelancerUserId && (
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/chat?contact=${booking.freelancerUserId}&booking=${booking.id}`}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
                          style={{
                            background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                            boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
                          }}
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
          <article
            className="group flex flex-col gap-5 rounded-2xl border p-6 transition"
            style={{
              borderColor: "rgba(236, 72, 153, 0.1)",
              background: "white",
              boxShadow: "0 8px 20px rgba(236, 72, 153, 0.08)",
            }}
          >
            <div className="flex items-center gap-4">
              <span
                className="grid h-12 w-12 place-items-center rounded-xl text-xl"
                style={{ background: "#fce7f3", color: "#ec4899" }}
              >
                🔍
              </span>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1f2937" }}>Discover freelancers</h2>
                <p className="text-sm" style={{ color: "#4b5563" }}>
                  Browse public freelancer profiles, review services, and find someone who matches
                  your goals.
                </p>
              </div>
            </div>
            <Link
              to="/freelancers"
              className="inline-flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
              }}
            >
              Explore freelancers
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article
            className="flex flex-col gap-5 rounded-2xl border p-6 transition"
            style={{
              borderColor: "rgba(236, 72, 153, 0.1)",
              background: "white",
              boxShadow: "0 8px 20px rgba(236, 72, 153, 0.08)",
            }}
          >
            <div className="flex items-center gap-4">
              <span
                className="grid h-12 w-12 place-items-center rounded-xl text-xl"
                style={{ background: "#fce7f3", color: "#ec4899" }}
              >
                📍
              </span>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1f2937" }}>Manage your addresses</h2>
                <p className="text-sm" style={{ color: "#4b5563" }}>
                  Keep delivery and service locations up-to-date to streamline your booking
                  experience.
                </p>
              </div>
            </div>
            <Link
              to="/addresses"
              className="inline-flex items-center gap-2 self-start rounded-xl border px-5 py-2.5 text-sm font-semibold transition"
              style={{
                borderColor: "#ec4899",
                color: "#ec4899",
                background: "white",
              }}
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
