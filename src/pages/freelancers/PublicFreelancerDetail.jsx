import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApiFetch } from "../../hooks/useApiFetch.jsx";
import { formatSchedulesForDisplay } from "../../utils/scheduleFormatting.js";
import { useAuth } from "../../hooks/useAuth.jsx";

const getFreelancerFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.freelancer && typeof payload.freelancer === "object") {
    return payload.freelancer;
  }

  return payload;
};

const resolveAvatarUrl = (freelancer) => {
  if (!freelancer || typeof freelancer !== "object") {
    return null;
  }

  for (const key of ["avatar_url", "avatarUrl", "avatar", "photo_url", "photoUrl"]) {
    const candidate = freelancer[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
};

const getAvatarFallback = (freelancer) => {
  const name = freelancer?.full_name ?? freelancer?.display_name ?? "";
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "U";
  }
  return trimmed.charAt(0).toUpperCase();
};

const getAgeFromBirthDate = (value) => {
  if (!value) {
    return null;
  }

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayThisYear =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const DetailLoadingState = () => (
  <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="flex items-center gap-6">
        <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-1/2 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-4/6 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  </div>
);

const DetailErrorState = ({ message, onRetry }) => (
  <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-inner shadow-red-200/50">
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-red-700">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl">⚠️</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Unable to load freelancer</h2>
        <p className="text-base text-red-600/80">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
        >
          Try again
        </button>
        <Link
          to="/freelancers"
          className="inline-flex items-center gap-2 rounded-full border border-red-400 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
        >
          Back to list
        </Link>
      </div>
    </div>
  </div>
);

const PublicFreelancerDetail = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const apiFetch = useApiFetch();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  const freelancerId = routeId?.trim() ?? "";

  const loadFreelancer = useCallback(async () => {
    if (!freelancerId) {
      const missingIdError = new Error("Freelancer ID is required.");
      missingIdError.status = 400;
      throw missingIdError;
    }
    return apiFetch.getJson(`/freelancers/${freelancerId}`);
  }, [apiFetch, freelancerId]);

  useEffect(() => {
    let cancelled = false;

    const fetchFreelancer = async () => {
      setStatus("loading");
      setError(null);

      try {
        const payload = await loadFreelancer();
        if (cancelled) {
          return;
        }
        const data = getFreelancerFromPayload(payload);
        setFreelancer(data);
        setStatus("ready");
      } catch (fetchError) {
        if (cancelled) {
          return;
        }
        setError(fetchError);
        setFreelancer(null);
        setStatus("error");
      }
    };

    fetchFreelancer();

    return () => {
      cancelled = true;
    };
  }, [loadFreelancer, refreshIndex]);

  const handleRetry = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const acceptingOrders = Boolean(freelancer?.is_accepting_orders);
  const yearsExperience = freelancer?.years_of_experience;
  const hasYearsExperience = Number.isFinite(yearsExperience) && yearsExperience > 0;
  const age = useMemo(() => getAgeFromBirthDate(freelancer?.date_of_birth), [freelancer]);
  const services = useMemo(
    () => (Array.isArray(freelancer?.services) ? freelancer.services : []),
    [freelancer]
  );
  const serviceOptions = useMemo(
    () =>
      services.map((service, index) => {
        const value =
          service?.id ??
          service?.service_id ??
          service?.serviceId ??
          service?.service_category_id ??
          service?.service_category_name ??
          service?.title ??
          `service-${index}`;
        return { value: String(value), service };
      }),
    [services]
  );
  const hasServices = serviceOptions.length > 0;
  const certifications = useMemo(
    () => (Array.isArray(freelancer?.certifications) ? freelancer.certifications : []),
    [freelancer]
  );
  const avatarUrl = useMemo(() => resolveAvatarUrl(freelancer), [freelancer]);
  const schedules = useMemo(
    () => formatSchedulesForDisplay(freelancer?.schedules),
    [freelancer]
  );
  const normalizedRole =
    typeof user?.role === "string" ? user.role.trim().toLowerCase() : null;
  const isAuthenticated = Boolean(user);
  const isCustomerUser = normalizedRole === "customer";
  const isFreelancerUser = normalizedRole === "freelancer";

  const handleOpenBookingModal = useCallback(() => {
    if (!hasServices) {
      return;
    }
    const defaultServiceValue = serviceOptions[0]?.value ?? null;
    setSelectedServiceId(defaultServiceValue);
    setBookingModalOpen(true);
  }, [hasServices, serviceOptions]);

  const handleCloseBookingModal = useCallback(() => {
    setBookingModalOpen(false);
    setSelectedServiceId(null);
  }, []);

  const handleSelectService = useCallback((nextValue) => {
    setSelectedServiceId(nextValue);
  }, []);

  const handleViewTimeslots = useCallback(() => {
    if (!selectedServiceId) {
      return;
    }

    const selectedOption = serviceOptions.find((option) => option.value === selectedServiceId);
    const selectedService = selectedOption?.service ?? null;

    const resolvedServiceId =
      selectedService?.id ??
      selectedService?.service_id ??
      selectedService?.serviceId ??
      selectedService?.service_category_id ??
      selectedServiceId;

    setBookingModalOpen(false);
    setSelectedServiceId(null);
    navigate(`/freelancers/${freelancerId}/${resolvedServiceId}`);
  }, [freelancerId, navigate, selectedServiceId, serviceOptions]);

  const handleLoginRedirect = useCallback(() => {
    navigate("/login", { replace: false });
  }, [navigate]);

  const isLoading = status === "loading";
  const isError = status === "error";
  const isReady = status === "ready" && Boolean(freelancer);

  let errorMessage = "Unable to load freelancer details. Please try again.";
  if (error?.status === 404) {
    errorMessage = "We could not find a freelancer with that ID.";
  } else if (error?.message) {
    errorMessage = error.message;
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/freelancers"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            ← Back to freelancers
          </Link>
          {freelancerId ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10">
              ID #{freelancerId}
            </span>
          ) : null}
        </div>

        {isLoading ? <DetailLoadingState /> : null}

        {isError ? <DetailErrorState message={errorMessage} onRetry={handleRetry} /> : null}

        {isReady ? (
          <div className="space-y-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <article className="flex flex-col gap-8 rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/70">
                <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-6">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={freelancer?.full_name ? `${freelancer.full_name}'s avatar` : "Freelancer avatar"}
                        className="h-24 w-24 flex-shrink-0 rounded-full border border-slate-100 object-cover shadow-inner"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="grid h-24 w-24 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 text-4xl font-semibold text-white shadow-lg">
                        {getAvatarFallback(freelancer)}
                      </span>
                    )}
                    <div className="space-y-2">
                      <h1 className="text-3xl font-semibold text-slate-900">
                        {freelancer?.full_name ?? "Unnamed freelancer"}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {acceptingOrders ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Accepting orders
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Not accepting orders
                          </span>
                        )}
                        {hasYearsExperience ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
                            <span className="text-base leading-none">⏳</span>
                            {yearsExperience} {yearsExperience === 1 ? "year" : "years"} experience
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </header>

                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">About</h2>
                  {freelancer?.bio ? (
                    <p className="text-base leading-relaxed text-slate-600">{freelancer.bio}</p>
                  ) : (
                    <p className="text-base italic text-slate-500">This freelancer hasn&apos;t shared a bio yet.</p>
                  )}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Nationality
                    </h3>
                    <p className="mt-2 text-base text-slate-700">
                      {freelancer?.nationality ?? "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Age</h3>
                    <p className="mt-2 text-base text-slate-700">
                      {typeof age === "number" ? `${age} year${age === 1 ? "" : "s"} old` : "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Gender
                    </h3>
                    <p className="mt-2 text-base text-slate-700">
                      {freelancer?.gender ? freelancer.gender.charAt(0).toUpperCase() + freelancer.gender.slice(1) : "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Availability
                    </h3>
                    <p className="mt-2 text-base text-slate-700">
                      {acceptingOrders ? "Currently accepting new bookings" : "Not accepting new bookings"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">Schedule</h2>
                  {schedules.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-slate-600">
                      {schedules.map((schedule) => (
                        <li
                          key={schedule.key}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 shadow-inner shadow-slate-200/60"
                        >
                          <span className="text-base font-semibold text-slate-900">{schedule.dayLabel}</span>
                          <span>{schedule.timeRangeLabel}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      This freelancer hasn&apos;t shared a public schedule yet.
                    </p>
                  )}
                </section>
              </article>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/70">
                  <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
                  {certifications.length > 0 ? (
                    <ul className="mt-4 space-y-3 text-sm text-slate-600">
                      {certifications.map((certification) => (
                        <li
                          key={certification}
                          className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 font-medium text-violet-700"
                        >
                          <span className="h-2 w-2 rounded-full bg-violet-400" />
                          {certification}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No certifications shared yet.</p>
                  )}
                </div>

              </aside>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/70">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Services</h2>
                  <p className="text-sm text-slate-600">
                    Explore what {freelancer?.full_name ?? "this freelancer"} currently offers.
                  </p>
                </div>
                {isCustomerUser && acceptingOrders ? (
                  <button
                    type="button"
                    onClick={handleOpenBookingModal}
                    disabled={!hasServices}
                    title={hasServices ? undefined : "No services available to book yet"}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Book now
                  </button>
                ) : null}
              </div>

              {!isAuthenticated ? (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm text-slate-700">
                  <p className="flex-1">
                    Log in to book {freelancer?.full_name ?? "this freelancer"} and send booking requests.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoginRedirect}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
                  >
                    Log in to book
                  </button>
                </div>
              ) : null}

              {isAuthenticated && isFreelancerUser ? (
                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                  Freelancers can&apos;t book other freelancers from this page.
                </p>
              ) : null}

              {services.length > 0 ? (
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {services.map((service) => (
                    <article
                      key={service?.id ?? service?.title ?? service?.service_category_name}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50"
                    >
                      <header className="space-y-1">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {service?.title ?? service?.service_category_name ?? "Service"}
                        </h3>
                        <p className="text-sm uppercase tracking-[0.08em] text-slate-500">
                          {service?.service_category_name ?? "General"}
                        </p>
                      </header>
                      {service?.description ? (
                        <p className="text-sm text-slate-600">{service.description}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        {service?.pricing ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                            Pricing: {service.pricing}
                          </span>
                        ) : null}
                        {service?.location ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                            Location: {service.location.replace("_", " ")}
                          </span>
                        ) : null}
                        {formatDuration(service?.service_duration_seconds) ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                            Duration: {formatDuration(service.service_duration_seconds)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-900">
                        {typeof service?.fixed_price === "number" ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                            Fixed price: {service.fixed_price}
                          </span>
                        ) : null}
                        {typeof service?.min_price === "number" || typeof service?.max_price === "number" ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                            Range:{" "}
                            {[
                              typeof service?.min_price === "number" ? service.min_price : null,
                              typeof service?.max_price === "number" ? service.max_price : null,
                            ]
                              .filter((value) => value != null)
                              .join(" - ")}
                          </span>
                        ) : null}
                      </div>
                      {Array.isArray(service?.products_used) && service.products_used.length > 0 ? (
                        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                          {service.products_used
                            .filter((product) => typeof product === "string" && product.trim().length > 0)
                            .map((product) => (
                              <span
                                key={product}
                                className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700"
                              >
                                <span className="h-2 w-2 rounded-full bg-violet-400" />
                                {product}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  This freelancer hasn&apos;t listed any public services yet.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
      {isBookingModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Select a service</h3>
                <p className="text-sm text-slate-600">
                  Which of {freelancer?.full_name ?? "this freelancer"}&apos;s services would you like to book?
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBookingModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Close service selection"
              >
                ×
              </button>
            </div>

            {hasServices ? (
              <div className="mt-6 space-y-3 max-h-80 overflow-y-auto pr-1">
                {serviceOptions.map(({ value, service }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 hover:bg-white"
                  >
                    <input
                      type="radio"
                      name="service-choice"
                      value={value}
                      checked={selectedServiceId === value}
                      onChange={() => handleSelectService(value)}
                      className="mt-1 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="space-y-1 text-left">
                      <p className="text-base font-semibold text-slate-900">
                        {service?.title ?? service?.service_category_name ?? "Service"}
                      </p>
                      {service?.description ? (
                        <p className="text-sm text-slate-600">{service.description}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                        {service?.pricing ? <span>Pricing: {service.pricing}</span> : null}
                        {service?.location ? <span>Location: {service.location.replace("_", " ")}</span> : null}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">
                This freelancer hasn&apos;t listed services that can be booked right now.
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseBookingModal}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleViewTimeslots}
                disabled={!selectedServiceId}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                View Timeslots
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PublicFreelancerDetail;

