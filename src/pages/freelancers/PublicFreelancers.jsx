import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApiFetch } from "../../hooks/useApiFetch.jsx";

const DEFAULT_QUERY = Object.freeze({
  pageId: 1,
  pageSize: 9,
});

const extractFreelancers = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.freelancers)) {
    return payload.freelancers;
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

const getInitialPageId = (searchParams) => {
  const value = searchParams.get("page");
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= DEFAULT_QUERY.pageId) {
    return parsed;
  }
  return DEFAULT_QUERY.pageId;
};

const buildEndpoint = (pageId, pageSize) => {
  const params = new URLSearchParams({
    page_id: String(pageId),
    page_size: String(pageSize),
  });
  return `/freelancers?${params.toString()}`;
};

const formatServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return [];
  }

  return services
    .map((service) => service?.service_category_name ?? service?.name)
    .filter((value) => typeof value === "string" && value.trim().length > 0);
};

const getAvatarFallback = (freelancer) => {
  const name = freelancer?.full_name ?? freelancer?.display_name ?? "";
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "U";
  }
  return trimmed.charAt(0).toUpperCase();
};

const isAcceptingOrders = (freelancer) => Boolean(freelancer?.is_accepting_orders);

const FreelancersEmptyState = ({ onReset }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center shadow-sm">
    <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-600">
      ✨
    </div>
    <div className="max-w-md space-y-2">
      <h2 className="text-2xl font-semibold text-slate-900">No freelancers found</h2>
      <p className="text-base text-slate-600">
        We couldn&apos;t find any public freelancers on this page. Try going back to the first page or
        check again later when more freelancers become available.
      </p>
    </div>
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 hover:shadow-slate-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
    >
      Go to first page
    </button>
  </div>
);

const FreelancersErrorState = ({ error, onRetry }) => {
  const message =
    error?.message ??
    error?.payload?.error ??
    "Something went wrong while loading freelancers. Please try again.";

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-8 shadow-inner shadow-red-200/40">
      <div className="flex items-center gap-3 text-red-700">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-2xl">⚠️</span>
        <div>
          <h2 className="text-xl font-semibold">Unable to load freelancers</h2>
          <p className="text-sm text-red-600/80">{message}</p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

const FreelancersLoadingState = () => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: DEFAULT_QUERY.pageSize }).map((_, index) => (
      <div
        key={index}
        className="flex flex-col gap-6 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-lg shadow-slate-200/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-4/6 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

const resolveAvatarUrl = (freelancer) => {
  if (!freelancer || typeof freelancer !== "object") {
    return null;
  }

  for (const key of ["avatar_url", "avatarUrl", "avatar", "photo_url", "photoUrl"]) {
    const value = freelancer[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const FreelancerCard = ({ freelancer }) => {
  const services = useMemo(() => formatServices(freelancer?.services), [freelancer]);
  const acceptingOrders = isAcceptingOrders(freelancer);
  const yearsExperience = freelancer?.years_of_experience;
  const hasYearsExperience = Number.isFinite(yearsExperience) && yearsExperience > 0;
  const avatarUrl = useMemo(() => resolveAvatarUrl(freelancer), [freelancer]);
  const freelancerId = freelancer?.id;

  const cardContent = (
    <article className="group flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/70 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-200/60">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={freelancer?.full_name ? `${freelancer.full_name}'s avatar` : "Freelancer avatar"}
              className="h-16 w-16 flex-shrink-0 rounded-full border border-slate-100 object-cover shadow-inner"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 text-2xl font-semibold text-white shadow-lg">
              {getAvatarFallback(freelancer)}
            </span>
          )}
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-slate-900">{freelancer?.full_name ?? "Unnamed freelancer"}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {acceptingOrders ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Accepting orders
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Not accepting orders
                </span>
              )}
              {hasYearsExperience ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-700">
                  <span className="text-base leading-none">⏳</span>
                  {yearsExperience} {yearsExperience === 1 ? "year" : "years"} experience
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {freelancer?.bio ? (
        <p className="text-sm leading-relaxed text-slate-600 break-words">
          {freelancer.bio}
        </p>
      ) : (
        <p className="text-sm italic text-slate-500">No bio provided yet.</p>
      )}

      <footer className="mt-auto space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Services</h4>
          {services.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700 shadow-sm shadow-violet-100"
                >
                  <span className="h-2 w-2 rounded-full bg-violet-400" />
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">This freelancer hasn&apos;t listed any services yet.</p>
          )}
        </div>
      </footer>
    </article>
  );

  if (!freelancerId) {
    return cardContent;
  }

  const targetUrl = `/freelancers/${freelancerId}`;

  return (
    <Link
      to={targetUrl}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
      aria-label={`View details for ${freelancer?.full_name ?? "freelancer"}`}
    >
      {cardContent}
    </Link>
  );
};

const PublicFreelancers = () => {
  const apiFetch = useApiFetch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageId, setPageId] = useState(() => getInitialPageId(searchParams));
  const [freelancers, setFreelancers] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const pageSize = DEFAULT_QUERY.pageSize;

  useEffect(() => {
    setSearchParams({ page: String(pageId) }, { replace: true });
  }, [pageId, setSearchParams]);

  const loadFreelancers = useCallback(async () => {
    const endpoint = buildEndpoint(pageId, pageSize);
    return apiFetch.getJson(endpoint);
  }, [apiFetch, pageId, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setStatus("loading");
      setError(null);

      try {
        const payload = await loadFreelancers();
        if (cancelled) {
          return;
        }
        const data = extractFreelancers(payload);
        setFreelancers(data);
        setHasNextPage(data.length === pageSize);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError);
        setFreelancers([]);
        setHasNextPage(false);
        setStatus("error");
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [loadFreelancers, pageSize, refreshIndex]);

  const handleNextPage = useCallback(() => {
    if (!hasNextPage || status === "loading") {
      return;
    }
    setPageId((previous) => previous + 1);
  }, [hasNextPage, status]);

  const handlePreviousPage = useCallback(() => {
    if (pageId === DEFAULT_QUERY.pageId || status === "loading") {
      return;
    }
    setPageId((previous) => Math.max(DEFAULT_QUERY.pageId, previous - 1));
  }, [pageId, status]);

  const handleRetry = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const handleResetToFirstPage = useCallback(() => {
    setPageId(DEFAULT_QUERY.pageId);
    setRefreshIndex((previous) => previous + 1);
  }, []);

  const isLoading = status === "loading";
  const isError = status === "error";
  const hasFreelancers = freelancers.length > 0;

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-violet-100 via-rose-100 to-sky-100 p-10 shadow-2xl shadow-violet-200/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm shadow-white/60">
                Freelancers
              </span>
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Discover top-rated freelancers</h1>
              <p className="text-base text-slate-700 sm:text-lg">
                Browse professionals who have chosen to showcase their expertise publicly. Explore their services,
                availability, and experience to find the perfect match for your next project.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-6 text-slate-700 shadow-lg shadow-violet-200/60">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Pagination</span>
              <span className="text-3xl font-semibold text-slate-900">Page {pageId}</span>
              <span className="text-sm text-slate-500">
                Showing up to {pageSize} freelancers per page.
              </span>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={isLoading || pageId === DEFAULT_QUERY.pageId}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 hover:border-slate-400 hover:text-slate-900"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={isLoading || !hasNextPage}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-700"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? <FreelancersLoadingState /> : null}

        {isError ? (
          <FreelancersErrorState error={error} onRetry={handleRetry} />
        ) : null}

        {!isLoading && !isError && !hasFreelancers ? (
          <FreelancersEmptyState onReset={handleResetToFirstPage} />
        ) : null}

        {!isLoading && !isError && hasFreelancers ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {freelancers.map((freelancer, index) => {
              const fallbackKey =
                freelancer?.full_name ??
                freelancer?.display_name ??
                `freelancer-${index}`;
              return (
                <FreelancerCard
                  key={freelancer?.id ?? fallbackKey}
                  freelancer={freelancer}
                />
              );
            })}
          </div>
        ) : null}

        <nav className="flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-lg shadow-slate-200/70">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={isLoading || pageId === DEFAULT_QUERY.pageId}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 hover:border-slate-400 hover:text-slate-900"
          >
            ← Previous page
          </button>
          <span className="rounded-full bg-slate-100 px-4 py-1 font-semibold text-slate-600">
            Page {pageId}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={isLoading || !hasNextPage}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-700"
          >
            Next page →
          </button>
        </nav>
      </div>
    </section>
  );
};

export default PublicFreelancers;

