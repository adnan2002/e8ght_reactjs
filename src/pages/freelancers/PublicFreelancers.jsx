import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApiFetch } from "../../hooks/useApiFetch.jsx";
import { formatSchedulesForDisplay } from "../../utils/scheduleFormatting.js";
import { SERVICE_CATEGORIES } from "../../components/FreelancerServicesForm.jsx";

const DEFAULT_QUERY = Object.freeze({
  pageId: 1,
  pageSize: 9,
});

const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS = Object.freeze({
  minAge: "",
  maxAge: "",
  gender: "",
  serviceCategories: [],
  pricingType: "",
  minPrice: "",
  maxPrice: "",
  governorate: "",
  town: "",
  serviceLocation: "",
  minExperience: "",
  maxExperience: "",
  isAcceptingOrders: "",
});

const GENDER_OPTIONS = [
  { value: "", label: "Any gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const PRICING_TYPE_OPTIONS = [
  { value: "", label: "Any pricing" },
  { value: "fixed", label: "Fixed price" },
  { value: "range", label: "Price range" },
];

const SERVICE_LOCATION_OPTIONS = [
  { value: "", label: "Any location" },
  { value: "on_premise", label: "At freelancer's location" },
  { value: "door_step", label: "At your location" },
  { value: "both", label: "Both locations" },
];

const ACCEPTING_ORDERS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "true", label: "Accepting orders" },
  { value: "false", label: "Not accepting" },
];

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

const getInitialSearchQuery = (searchParams) => {
  return searchParams.get("q") ?? "";
};

const getInitialFilters = (searchParams) => {
  const serviceCategories = searchParams.getAll("service_categories").map(Number).filter(Number.isFinite);
  return {
    minAge: searchParams.get("min_age") ?? "",
    maxAge: searchParams.get("max_age") ?? "",
    gender: searchParams.get("gender") ?? "",
    serviceCategories,
    pricingType: searchParams.get("pricing_type") ?? "",
    minPrice: searchParams.get("min_price") ?? "",
    maxPrice: searchParams.get("max_price") ?? "",
    governorate: searchParams.get("governorate") ?? "",
    town: searchParams.get("town") ?? "",
    serviceLocation: searchParams.get("service_location") ?? "",
    minExperience: searchParams.get("min_experience") ?? "",
    maxExperience: searchParams.get("max_experience") ?? "",
    isAcceptingOrders: searchParams.get("is_accepting_orders") ?? "",
  };
};

const buildEndpoint = (pageId, pageSize, searchQuery, filters) => {
  const params = new URLSearchParams({
    page_id: String(pageId),
    page_size: String(pageSize),
  });

  if (searchQuery && searchQuery.trim().length > 0) {
    params.set("q", searchQuery.trim());
  }

  // Add filter params
  if (filters.minAge) params.set("min_age", filters.minAge);
  if (filters.maxAge) params.set("max_age", filters.maxAge);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.serviceCategories?.length > 0) {
    filters.serviceCategories.forEach((id) => params.append("service_categories", String(id)));
  }
  if (filters.pricingType) params.set("pricing_type", filters.pricingType);
  if (filters.minPrice) params.set("min_price", filters.minPrice);
  if (filters.maxPrice) params.set("max_price", filters.maxPrice);
  if (filters.governorate) params.set("governorate", filters.governorate);
  if (filters.town) params.set("town", filters.town);
  if (filters.serviceLocation) params.set("service_location", filters.serviceLocation);
  if (filters.minExperience) params.set("min_experience", filters.minExperience);
  if (filters.maxExperience) params.set("max_experience", filters.maxExperience);
  if (filters.isAcceptingOrders) params.set("is_accepting_orders", filters.isAcceptingOrders);

  return `/freelancers?${params.toString()}`;
};

const hasActiveFilters = (filters) => {
  return (
    filters.minAge ||
    filters.maxAge ||
    filters.gender ||
    filters.serviceCategories?.length > 0 ||
    filters.pricingType ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.governorate ||
    filters.town ||
    filters.serviceLocation ||
    filters.minExperience ||
    filters.maxExperience ||
    filters.isAcceptingOrders
  );
};

const countActiveFilters = (filters) => {
  let count = 0;
  if (filters.minAge || filters.maxAge) count++;
  if (filters.gender) count++;
  if (filters.serviceCategories?.length > 0) count++;
  if (filters.pricingType) count++;
  if (filters.minPrice || filters.maxPrice) count++;
  if (filters.governorate || filters.town) count++;
  if (filters.serviceLocation) count++;
  if (filters.minExperience || filters.maxExperience) count++;
  if (filters.isAcceptingOrders) count++;
  return count;
};

const formatServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return [];
  }

  return services.map((service) => {
    const name = service?.service_category_name ?? service?.name ?? "Unknown Service";
    const pricing = service?.pricing;
    const fixedPrice = service?.fixed_price;
    const minPrice = service?.min_price;
    const maxPrice = service?.max_price;
    const location = service?.location;

    let priceLabel = null;
    if (pricing === "fixed" && fixedPrice != null) {
      priceLabel = `${fixedPrice.toFixed(2)} BHD`;
    } else if (pricing === "range" && minPrice != null && maxPrice != null) {
      priceLabel = `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} BHD`;
    }

    let locationLabel = null;
    if (location === "on_premise") locationLabel = "At freelancer's";
    else if (location === "door_step") locationLabel = "At your place";
    else if (location === "both") locationLabel = "Flexible location";

    return { name, priceLabel, locationLabel, location };
  }).filter((s) => s.name);
};

const formatAddress = (address) => {
  if (!address) return null;
  const parts = [address.town, address.governorate].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};

const formatGender = (gender) => {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
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

const isAcceptingOrders = (freelancer) => Boolean(freelancer?.is_accepting_orders);

const FreelancersEmptyState = ({ onReset, searchQuery, onClearSearch, hasFilters, onClearFilters }) => {
  const isSearching = searchQuery && searchQuery.trim().length > 0;
  const hasAnyFilters = isSearching || hasFilters;

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center shadow-sm">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-600">
        {hasAnyFilters ? "🔍" : "✨"}
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          {hasAnyFilters ? "No results found" : "No freelancers found"}
        </h2>
        <p className="text-base text-slate-600">
          {isSearching ? (
            <>
              We couldn&apos;t find any freelancers matching &quot;<span className="font-medium text-slate-800">{searchQuery}</span>&quot;.
              Try adjusting your search terms or clear the search to browse all freelancers.
            </>
          ) : hasFilters ? (
            <>
              No freelancers match your current filters. Try adjusting or clearing the filters to see more results.
            </>
          ) : (
            <>
              We couldn&apos;t find any public freelancers on this page. Try going back to the first page or
              check again later when more freelancers become available.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {isSearching && (
          <button
            type="button"
            onClick={onClearSearch}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 hover:shadow-slate-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            Clear search
          </button>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            Clear filters
          </button>
        )}
        {!hasAnyFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 hover:shadow-slate-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            Go to first page
          </button>
        )}
      </div>
    </div>
  );
};

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
  <div className="flex flex-col gap-4">
    {Array.from({ length: DEFAULT_QUERY.pageSize }).map((_, index) => (
      <div
        key={index}
        className="flex gap-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-md shadow-slate-200/50"
      >
        <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-full bg-slate-200 sm:h-16 sm:w-16" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-20 animate-pulse rounded-lg bg-slate-200" />
          </div>
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
  const schedules = useMemo(
    () => formatSchedulesForDisplay(freelancer?.schedules),
    [freelancer]
  );
  const address = useMemo(() => formatAddress(freelancer?.address), [freelancer]);
  const gender = formatGender(freelancer?.gender);
  const age = freelancer?.age;

  const cardContent = (
    <article className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-md shadow-slate-200/50 transition duration-200 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-200/40 sm:flex-row sm:gap-5">
      {/* Left: Avatar */}
      <div className="flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={freelancer?.full_name ? `${freelancer.full_name}'s avatar` : "Freelancer avatar"}
            className="h-14 w-14 rounded-full border border-slate-100 object-cover shadow-sm sm:h-16 sm:w-16"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 text-xl font-semibold text-white shadow-md sm:h-16 sm:w-16 sm:text-2xl">
            {getAvatarFallback(freelancer)}
          </span>
        )}
      </div>

      {/* Middle: Main Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{freelancer?.full_name ?? "Unnamed freelancer"}</h3>
            {acceptingOrders ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Unavailable
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {address && (
              <span className="inline-flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {address}
              </span>
            )}
            {hasYearsExperience && <span>{yearsExperience}y experience</span>}
            {gender && <span>{gender}</span>}
            {age && <span>{age} yrs old</span>}
          </div>
        </div>

        {/* Bio */}
        {freelancer?.bio ? (
          <p className="text-sm leading-relaxed text-slate-600 line-clamp-2">
            {freelancer.bio}
          </p>
        ) : null}

        {/* Services */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {services.slice(0, 4).map((service, idx) => (
              <div
                key={`${service.name}-${idx}`}
                className="inline-flex flex-col rounded-lg bg-slate-50 px-2.5 py-1.5"
              >
                <span className="text-xs font-medium text-slate-700">{service.name}</span>
                <div className="flex items-center gap-1.5 text-xs">
                  {service.priceLabel && (
                    <span className="font-medium text-emerald-600">{service.priceLabel}</span>
                  )}
                  {service.priceLabel && service.locationLabel && (
                    <span className="text-slate-300">•</span>
                  )}
                  {service.locationLabel && (
                    <span className="text-slate-500">{service.locationLabel}</span>
                  )}
                </div>
              </div>
            ))}
            {services.length > 4 && (
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500">
                +{services.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Schedule (visible on larger screens) */}
      <div className="hidden flex-shrink-0 flex-col items-end gap-2 sm:flex">
        {schedules.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1">
            {schedules.slice(0, 5).map((schedule) => (
              <span
                key={schedule.key}
                className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-600"
              >
                {schedule.dayLabel.slice(0, 3)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No schedule</span>
        )}
      </div>
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

const FilterPanel = ({ filters, onChange, onClear, isOpen, onToggle }) => {
  const activeCount = countActiveFilters(filters);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const handleServiceCategoryToggle = (categoryId) => {
    const current = filters.serviceCategories || [];
    const newCategories = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    handleChange("serviceCategories", newCategories);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-semibold text-slate-900">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-6 py-5">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Age Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Age Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="18"
                  max="100"
                  placeholder="Min"
                  value={filters.minAge}
                  onChange={(e) => handleChange("minAge", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  min="18"
                  max="100"
                  placeholder="Max"
                  value={filters.maxAge}
                  onChange={(e) => handleChange("maxAge", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            {/* Experience Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Experience (years)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minExperience}
                  onChange={(e) => handleChange("minExperience", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxExperience}
                  onChange={(e) => handleChange("maxExperience", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            {/* Pricing Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Pricing Type</label>
              <select
                value={filters.pricingType}
                onChange={(e) => handleChange("pricingType", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              >
                {PRICING_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Price Range (BHD)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleChange("minPrice", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleChange("maxPrice", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            {/* Service Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Service Location</label>
              <select
                value={filters.serviceLocation}
                onChange={(e) => handleChange("serviceLocation", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              >
                {SERVICE_LOCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Governorate */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Governorate</label>
              <input
                type="text"
                placeholder="e.g., Capital"
                value={filters.governorate}
                onChange={(e) => handleChange("governorate", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              />
            </div>

            {/* Town */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Town</label>
              <input
                type="text"
                placeholder="e.g., Manama"
                value={filters.town}
                onChange={(e) => handleChange("town", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              />
            </div>

            {/* Accepting Orders */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Availability</label>
              <select
                value={filters.isAcceptingOrders}
                onChange={(e) => handleChange("isAcceptingOrders", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              >
                {ACCEPTING_ORDERS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Categories */}
          <div className="mt-6 space-y-3">
            <label className="text-sm font-medium text-slate-700">Service Categories</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((category) => {
                const isSelected = filters.serviceCategories?.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleServiceCategoryToggle(category.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeCount > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PublicFreelancers = () => {
  const apiFetch = useApiFetch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageId, setPageId] = useState(() => getInitialPageId(searchParams));
  const [searchInput, setSearchInput] = useState(() => getInitialSearchQuery(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getInitialSearchQuery(searchParams));
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));
  const [debouncedFilters, setDebouncedFilters] = useState(() => getInitialFilters(searchParams));
  const [isFilterOpen, setIsFilterOpen] = useState(() => hasActiveFilters(getInitialFilters(searchParams)));
  const [freelancers, setFreelancers] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const pageSize = DEFAULT_QUERY.pageSize;
  const debounceTimerRef = useRef(null);
  const filterDebounceRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      // Reset to page 1 when search changes
      if (searchInput !== debouncedSearch) {
        setPageId(DEFAULT_QUERY.pageId);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Debounce filters
  useEffect(() => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    filterDebounceRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setPageId(DEFAULT_QUERY.pageId);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
    };
  }, [filters]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(pageId));

    if (debouncedSearch.trim().length > 0) {
      params.set("q", debouncedSearch.trim());
    }

    // Add filter params to URL
    if (debouncedFilters.minAge) params.set("min_age", debouncedFilters.minAge);
    if (debouncedFilters.maxAge) params.set("max_age", debouncedFilters.maxAge);
    if (debouncedFilters.gender) params.set("gender", debouncedFilters.gender);
    if (debouncedFilters.serviceCategories?.length > 0) {
      debouncedFilters.serviceCategories.forEach((id) => params.append("service_categories", String(id)));
    }
    if (debouncedFilters.pricingType) params.set("pricing_type", debouncedFilters.pricingType);
    if (debouncedFilters.minPrice) params.set("min_price", debouncedFilters.minPrice);
    if (debouncedFilters.maxPrice) params.set("max_price", debouncedFilters.maxPrice);
    if (debouncedFilters.governorate) params.set("governorate", debouncedFilters.governorate);
    if (debouncedFilters.town) params.set("town", debouncedFilters.town);
    if (debouncedFilters.serviceLocation) params.set("service_location", debouncedFilters.serviceLocation);
    if (debouncedFilters.minExperience) params.set("min_experience", debouncedFilters.minExperience);
    if (debouncedFilters.maxExperience) params.set("max_experience", debouncedFilters.maxExperience);
    if (debouncedFilters.isAcceptingOrders) params.set("is_accepting_orders", debouncedFilters.isAcceptingOrders);

    setSearchParams(params, { replace: true });
  }, [pageId, debouncedSearch, debouncedFilters, setSearchParams]);

  const loadFreelancers = useCallback(async () => {
    const endpoint = buildEndpoint(pageId, pageSize, debouncedSearch, debouncedFilters);
    return apiFetch.getJson(endpoint);
  }, [apiFetch, pageId, pageSize, debouncedSearch, debouncedFilters]);

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
  }, [loadFreelancers, pageSize, refreshIndex, debouncedSearch, debouncedFilters]);

  const handleSearchChange = useCallback((event) => {
    setSearchInput(event.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setPageId(DEFAULT_QUERY.pageId);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setDebouncedFilters({ ...DEFAULT_FILTERS });
    setPageId(DEFAULT_QUERY.pageId);
  }, []);

  const handleToggleFilters = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

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
  const filtersActive = hasActiveFilters(debouncedFilters);

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
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

          {/* Search Input */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search freelancers by name, services, bio, certifications..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 text-slate-900 placeholder-slate-400 shadow-lg shadow-violet-200/30 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            />
            {searchInput.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-600"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {isLoading && searchInput.length > 0 && (
              <div className="absolute inset-y-0 right-12 flex items-center pr-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Search indicator */}
          {debouncedSearch.trim().length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>
                Searching for: <span className="font-medium text-violet-700">&quot;{debouncedSearch}&quot;</span>
              </span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-300 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          )}
        </header>

        {/* Filters Panel */}
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          isOpen={isFilterOpen}
          onToggle={handleToggleFilters}
        />

        {/* Active filters summary */}
        {filtersActive && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Active filters:</span>
            {debouncedFilters.gender && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                {GENDER_OPTIONS.find((o) => o.value === debouncedFilters.gender)?.label}
              </span>
            )}
            {(debouncedFilters.minAge || debouncedFilters.maxAge) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                Age: {debouncedFilters.minAge || "0"} - {debouncedFilters.maxAge || "∞"}
              </span>
            )}
            {(debouncedFilters.minExperience || debouncedFilters.maxExperience) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                Exp: {debouncedFilters.minExperience || "0"} - {debouncedFilters.maxExperience || "∞"} yrs
              </span>
            )}
            {debouncedFilters.pricingType && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                {PRICING_TYPE_OPTIONS.find((o) => o.value === debouncedFilters.pricingType)?.label}
              </span>
            )}
            {(debouncedFilters.minPrice || debouncedFilters.maxPrice) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                Price: {debouncedFilters.minPrice || "0"} - {debouncedFilters.maxPrice || "∞"} BHD
              </span>
            )}
            {debouncedFilters.serviceLocation && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                {SERVICE_LOCATION_OPTIONS.find((o) => o.value === debouncedFilters.serviceLocation)?.label}
              </span>
            )}
            {(debouncedFilters.governorate || debouncedFilters.town) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                📍 {[debouncedFilters.town, debouncedFilters.governorate].filter(Boolean).join(", ")}
              </span>
            )}
            {debouncedFilters.isAcceptingOrders && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                {ACCEPTING_ORDERS_OPTIONS.find((o) => o.value === debouncedFilters.isAcceptingOrders)?.label}
              </span>
            )}
            {debouncedFilters.serviceCategories?.length > 0 && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                {debouncedFilters.serviceCategories.length} categor{debouncedFilters.serviceCategories.length === 1 ? "y" : "ies"}
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-300"
            >
              Clear all
            </button>
          </div>
        )}

        {isLoading ? <FreelancersLoadingState /> : null}

        {isError ? (
          <FreelancersErrorState error={error} onRetry={handleRetry} />
        ) : null}

        {!isLoading && !isError && !hasFreelancers ? (
          <FreelancersEmptyState
            onReset={handleResetToFirstPage}
            searchQuery={debouncedSearch}
            onClearSearch={handleClearSearch}
            hasFilters={filtersActive}
            onClearFilters={handleClearFilters}
          />
        ) : null}

        {!isLoading && !isError && hasFreelancers ? (
          <div className="flex flex-col gap-4">
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

