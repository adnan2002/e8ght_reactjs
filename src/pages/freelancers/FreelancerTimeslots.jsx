import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";

const formatDateForApi = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getMinDate = () => {
  const today = new Date();
  return formatDateForApi(today);
};

const getMaxDate = () => {
  const future = new Date();
  future.setMonth(future.getMonth() + 3);
  return formatDateForApi(future);
};

const TimeslotSkeleton = () => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-20 animate-pulse rounded-2xl bg-slate-200"
      />
    ))}
  </div>
);

const FreelancerTimeslots = () => {
  const { freelancer_id, service_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("idle");
  const [bookingError, setBookingError] = useState(null);

  const normalizedRole = useMemo(
    () => (typeof user?.role === "string" ? user.role.trim().toLowerCase() : null),
    [user]
  );
  const isCustomer = normalizedRole === "customer";
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isCustomer) {
      navigate(`/freelancers/${freelancer_id}`, { replace: true });
    }
  }, [isAuthenticated, isCustomer, navigate, freelancer_id]);

  const fetchAvailability = useCallback(
    async (date) => {
      if (!date || !freelancer_id || !service_id) {
        return;
      }

      setStatus("loading");
      setError(null);
      setSlots([]);
      setSelectedSlot(null);

      try {
        const endpoint = `/users/me/freelancers/${freelancer_id}/services/${service_id}/availability?date=${date}`;
        const response = await authenticatedFetch(endpoint, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const errorMessage =
            payload?.error ||
            (response.status === 401
              ? "You must be logged in to view timeslots."
              : response.status === 403
              ? "Only customers can view timeslots."
              : response.status === 404
              ? "Service not found for this freelancer."
              : "Failed to load availability.");
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
        setStatus("ready");
      } catch (fetchError) {
        setError(fetchError);
        setStatus("error");
      }
    },
    [authenticatedFetch, freelancer_id, service_id]
  );

  const handleDateChange = useCallback(
    (event) => {
      const nextDate = event.target.value;
      setSelectedDate(nextDate);
      if (nextDate) {
        fetchAvailability(nextDate);
      } else {
        setSlots([]);
        setStatus("idle");
      }
    },
    [fetchAvailability]
  );

  const handleSlotSelect = useCallback((slot) => {
    if (!slot.available) {
      return;
    }
    setSelectedSlot((prev) =>
      prev?.start === slot.start && prev?.end === slot.end ? null : slot
    );
  }, []);

  const handleRetry = useCallback(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [fetchAvailability, selectedDate]);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedSlot || !selectedDate || !freelancer_id || !service_id) {
      return;
    }

    setBookingStatus("loading");
    setBookingError(null);

    try {
      const endpoint = `/users/me/freelancers/${freelancer_id}/services/${service_id}/timeslots`;
      const response = await authenticatedFetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDate,
          start: selectedSlot.start,
          end: selectedSlot.end,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMessage =
          payload?.error ||
          (response.status === 401
            ? "You must be logged in to book."
            : response.status === 403
            ? "Only customers can book timeslots."
            : response.status === 409
            ? "This timeslot is no longer available."
            : "Failed to confirm booking.");
        throw new Error(errorMessage);
      }

      setSelectedSlot(null);
      setBookingStatus("idle");
      fetchAvailability(selectedDate);
    } catch (bookingErr) {
      setBookingError(bookingErr);
      setBookingStatus("error");
    }
  }, [authenticatedFetch, fetchAvailability, freelancer_id, selectedDate, selectedSlot, service_id]);

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.available),
    [slots]
  );

  const displayDate = useMemo(() => {
    if (!selectedDate) return null;
    const [year, month, day] = selectedDate.split("-").map(Number);
    return formatDateForDisplay(new Date(year, month - 1, day));
  }, [selectedDate]);

  if (!isAuthenticated || !isCustomer) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to={`/freelancers/${freelancer_id}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            ← Back to freelancer
          </Link>
        </div>

        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Select a Timeslot
          </h1>
          <p className="text-base text-slate-600">
            Choose a date to see available booking times
          </p>
        </header>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <label className="block space-y-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Pick a Date
              </span>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-medium text-slate-900 transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </label>
            {displayDate && (
              <p className="mt-4 text-center text-sm font-medium text-emerald-600">
                {displayDate}
              </p>
            )}
          </div>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <h2 className="text-center text-lg font-semibold text-slate-700">
              Loading available times...
            </h2>
            <TimeslotSkeleton />
          </div>
        )}

        {status === "error" && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-inner shadow-red-200/50">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-red-700">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-red-100 text-2xl">
                ⚠️
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Unable to load timeslots</h2>
                <p className="text-sm text-red-600/80">{error.message}</p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {status === "ready" && slots.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
              <div className="text-4xl">📅</div>
              <h2 className="text-lg font-semibold text-slate-700">
                No timeslots available
              </h2>
              <p className="text-sm">
                There are no available booking slots for this date. Please try a
                different day.
              </p>
            </div>
          </div>
        )}

        {status === "ready" && slots.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Available Times
              </h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                {availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""}{" "}
                available
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const isSelected =
                  selectedSlot?.start === slot.start &&
                  selectedSlot?.end === slot.end;

                return (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    disabled={!slot.available}
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
                      slot.available
                        ? isSelected
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md"
                        : "cursor-not-allowed border-slate-100 bg-slate-100/50 opacity-60"
                    }`}
                  >
                    <span
                      className={`text-xl font-bold tracking-tight ${
                        slot.available
                          ? isSelected
                            ? "text-emerald-700"
                            : "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {slot.start}
                    </span>
                    <span
                      className={`text-sm ${
                        slot.available
                          ? isSelected
                            ? "text-emerald-600"
                            : "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      to {slot.end}
                    </span>
                    {slot.available ? (
                      <span
                        className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                        }`}
                      >
                        {isSelected ? "Selected" : "Available"}
                      </span>
                    ) : (
                      <span className="mt-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                        Booked
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-sm text-white shadow-lg">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSlot && (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-600">
                    You selected
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {selectedSlot.start} – {selectedSlot.end}
                  </p>
                  <p className="text-sm text-emerald-600">{displayDate}</p>
                </div>
                {bookingStatus === "error" && bookingError && (
                  <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
                    <p className="text-sm font-medium text-red-700">
                      {bookingError.message}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={bookingStatus === "loading"}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bookingStatus === "loading" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            )}

          </div>
        )}

        {status === "idle" && !selectedDate && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
              <div className="text-4xl">🗓️</div>
              <h2 className="text-lg font-semibold text-slate-700">
                Select a date to get started
              </h2>
              <p className="text-sm">
                Use the date picker above to see available booking times for this
                service.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FreelancerTimeslots;

