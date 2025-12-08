import { useEffect, useMemo, useState } from "react";

const SERVICE_CATEGORIES = [
  { id: 1, name: "Hair", icon: "✂️" },
  { id: 2, name: "Nails", icon: "💅" },
  { id: 3, name: "Makeup", icon: "💄" },
  { id: 4, name: "Skincare", icon: "✨" },
  { id: 5, name: "Lashes & Brows", icon: "👁️" },
  { id: 6, name: "Body & Spa", icon: "🧖" },
  { id: 7, name: "Health & Fitness", icon: "💪" },
  { id: 8, name: "Waxing & Hair Removal", icon: "🌸" },
  { id: 9, name: "Massage & Wellness", icon: "💆" },
  { id: 10, name: "Bridal Services", icon: "👰" },
];

const LOCATION_OPTIONS = [
  { value: "on_premise", label: "At my location", icon: "🏠" },
  { value: "door_step", label: "At client's location", icon: "🚗" },
];

const PRICING_OPTIONS = [
  { value: "fixed", label: "Fixed price", icon: "💵" },
  { value: "range", label: "Price range", icon: "📊" },
];

const MAX_SERVICES = 10;
const MIN_SERVICES = 1;
const MIN_DURATION_MINUTES = 60;

const createEmptyService = () => ({
  serviceCategoryId: "",
  title: "",
  description: "",
  pricing: "fixed",
  fixedPrice: "",
  minPrice: "",
  maxPrice: "",
  durationMinutes: "60",
  productsUsed: "",
  location: "on_premise",
});

const normaliseNumber = (value) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseInteger = (value) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseString = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const splitListInput = (value) => {
  const trimmed = normaliseString(value);
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const validateServices = (services) => {
  if (!Array.isArray(services) || services.length < MIN_SERVICES) {
    return {
      errors: [{ _form: `Please add at least ${MIN_SERVICES} service.` }],
      payload: [],
    };
  }
  if (services.length > MAX_SERVICES) {
    return {
      errors: [{ _form: `You can add up to ${MAX_SERVICES} services.` }],
      payload: [],
    };
  }

  const errors = services.map(() => ({}));
  const payload = [];
  let hasAnyError = false;

  services.forEach((service, index) => {
    const fieldErrors = {};

    const categoryId = normaliseInteger(service.serviceCategoryId);
    if (!categoryId || !SERVICE_CATEGORIES.some(({ id }) => id === categoryId)) {
      fieldErrors.serviceCategoryId = "Select a valid category.";
    }

    const title = normaliseString(service.title);
    if (title.length < 2) {
      fieldErrors.title = "Title must be at least 2 characters.";
    }

    const description = normaliseString(service.description);
    if (description.length < 10) {
      fieldErrors.description = "Description must be at least 10 characters.";
    }

    const pricing = service.pricing === "range" ? "range" : "fixed";

    const fixedPrice = normaliseNumber(service.fixedPrice);
    const minPrice = normaliseNumber(service.minPrice);
    const maxPrice = normaliseNumber(service.maxPrice);

    if (pricing === "fixed") {
      if (fixedPrice == null || fixedPrice <= 0) {
        fieldErrors.fixedPrice = "Enter a price greater than zero.";
      }
      if (minPrice != null || maxPrice != null) {
        fieldErrors.minPrice = "Min/Max must be blank for fixed pricing.";
        fieldErrors.maxPrice = "Min/Max must be blank for fixed pricing.";
      }
    } else {
      if (minPrice == null || minPrice <= 0) {
        fieldErrors.minPrice = "Min price must be greater than zero.";
      }
      if (maxPrice == null || maxPrice <= 0) {
        fieldErrors.maxPrice = "Max price must be greater than zero.";
      }
      if (
        minPrice != null &&
        maxPrice != null &&
        maxPrice <= minPrice
      ) {
        fieldErrors.maxPrice = "Max price must be greater than min price.";
      }
      if (fixedPrice != null) {
        fieldErrors.fixedPrice = "Fixed price must be blank for range pricing.";
      }
    }

    const durationMinutes = normaliseInteger(service.durationMinutes);
    if (durationMinutes == null || durationMinutes < MIN_DURATION_MINUTES) {
      fieldErrors.durationMinutes = `Duration must be at least ${MIN_DURATION_MINUTES} minutes.`;
    }

    const location =
      service.location === "door_step" ? "door_step" : "on_premise";
    if (!LOCATION_OPTIONS.some(({ value }) => value === location)) {
      fieldErrors.location = "Select a valid location.";
    }

    const productsUsed = splitListInput(service.productsUsed);

    if (Object.keys(fieldErrors).length > 0) {
      errors[index] = fieldErrors;
      hasAnyError = true;
      return;
    }

    const servicePayload = {
      service_category_id: categoryId,
      title,
      description,
      pricing,
      service_duration_seconds: durationMinutes * 60,
      products_used: productsUsed,
      location,
    };

    if (pricing === "fixed") {
      servicePayload.fixed_price = fixedPrice;
    } else {
      servicePayload.min_price = minPrice;
      servicePayload.max_price = maxPrice;
    }

    payload.push(servicePayload);
  });

  if (hasAnyError) {
    return { errors, payload: [] };
  }

  return { errors: [], payload };
};

const ensureServiceArray = (initialServices) => {
  if (!Array.isArray(initialServices) || initialServices.length === 0) {
    return [createEmptyService()];
  }

  return initialServices.map((service) => ({
    ...createEmptyService(),
    ...service,
  }));
};

const styles = {
  container: {
    display: "grid",
    gap: "2rem",
  },
  hero: {
    position: "relative",
    padding: "2rem 2.25rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #e0e7ff 100%)",
    boxShadow: "0 20px 40px rgba(79, 70, 229, 0.1)",
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    top: "-30%",
    right: "-10%",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "rgba(167, 139, 250, 0.2)",
    filter: "blur(40px)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: "0.75rem",
  },
  heroEyebrow: {
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7c3aed",
  },
  heroTitle: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#4c1d95",
    opacity: 0.8,
    maxWidth: "480px",
  },
  progressBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1rem",
  },
  progressTrack: {
    flex: 1,
    height: "8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
    transition: "width 300ms ease",
  },
  progressLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#6d28d9",
  },
  form: {
    display: "grid",
    gap: "1.5rem",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
    border: "1px solid #fecaca",
    animation: "shake 0.5s ease-in-out",
  },
  errorIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.25rem",
    height: "2.25rem",
    borderRadius: "50%",
    background: "#ef4444",
    color: "white",
    fontSize: "1rem",
    flexShrink: 0,
  },
  errorText: {
    margin: 0,
    color: "#991b1b",
    fontWeight: 500,
  },
  serviceGrid: {
    display: "grid",
    gap: "1.5rem",
  },
  serviceCard: {
    position: "relative",
    padding: "1.75rem",
    borderRadius: "18px",
    background: "white",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
    transition: "all 250ms ease",
    animation: "slideIn 0.3s ease-out",
  },
  serviceCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
  },
  serviceCardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  serviceBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    color: "white",
    fontSize: "1.1rem",
    fontWeight: 700,
    boxShadow: "0 8px 16px rgba(139, 92, 246, 0.3)",
  },
  serviceTitleText: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#1e1b4b",
  },
  removeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.55rem 0.9rem",
    borderRadius: "10px",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    background: "rgba(254, 226, 226, 0.5)",
    color: "#dc2626",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  removeBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  fieldGrid: {
    display: "grid",
    gap: "1.25rem",
  },
  fieldRow: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  field: {
    display: "grid",
    gap: "0.5rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#374151",
  },
  labelIcon: {
    fontSize: "1rem",
    opacity: 0.8,
  },
  labelHint: {
    fontSize: "0.8rem",
    fontWeight: 400,
    color: "#9ca3af",
  },
  input: {
    padding: "0.85rem 1rem",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    background: "#fafafa",
    fontSize: "0.95rem",
    color: "#1f2937",
    transition: "all 180ms ease",
    outline: "none",
  },
  inputFocus: {
    borderColor: "#8b5cf6",
    background: "white",
    boxShadow: "0 0 0 4px rgba(139, 92, 246, 0.1)",
  },
  inputError: {
    borderColor: "#ef4444",
    background: "#fef2f2",
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.1)",
  },
  select: {
    padding: "0.85rem 1rem",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    background: "#fafafa",
    fontSize: "0.95rem",
    color: "#1f2937",
    cursor: "pointer",
    transition: "all 180ms ease",
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    paddingRight: "2.5rem",
  },
  textarea: {
    padding: "0.85rem 1rem",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    background: "#fafafa",
    fontSize: "0.95rem",
    color: "#1f2937",
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "all 180ms ease",
    outline: "none",
  },
  fieldError: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    color: "#dc2626",
    fontWeight: 500,
  },
  pricingToggle: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.35rem",
    borderRadius: "14px",
    background: "#f1f5f9",
  },
  pricingOption: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  pricingOptionActive: {
    background: "white",
    color: "#7c3aed",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  locationToggle: {
    display: "flex",
    gap: "0.75rem",
  },
  locationOption: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem",
    borderRadius: "14px",
    border: "2px solid #e5e7eb",
    background: "#fafafa",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  locationOptionActive: {
    borderColor: "#8b5cf6",
    background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%)",
    color: "#7c3aed",
  },
  locationIcon: {
    fontSize: "1.5rem",
  },
  locationLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    textAlign: "center",
  },
  addServiceBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "1.25rem",
    borderRadius: "16px",
    border: "2px dashed rgba(139, 92, 246, 0.3)",
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)",
    color: "#7c3aed",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 200ms ease",
  },
  addServiceBtnHover: {
    borderColor: "#8b5cf6",
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)",
    transform: "translateY(-2px)",
  },
  addServiceBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1.5rem 0",
    borderTop: "1px solid rgba(148, 163, 184, 0.2)",
  },
  footerActions: {
    display: "flex",
    gap: "0.75rem",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.9rem 1.5rem",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    background: "white",
    color: "#4b5563",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.9rem 2rem",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    color: "white",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(139, 92, 246, 0.35)",
    transition: "all 200ms ease",
  },
  submitBtnHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 16px 32px rgba(139, 92, 246, 0.4)",
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    margin: "0.5rem 0",
  },
  sectionIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
    fontSize: "0.9rem",
  },
  sectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  sectionLine: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, #e5e7eb, transparent)",
  },
};

const keyframes = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SectionDivider = ({ icon, title }) => (
  <div style={styles.sectionDivider}>
    <span style={styles.sectionIcon}>{icon}</span>
    <span style={styles.sectionTitle}>{title}</span>
    <span style={styles.sectionLine} />
  </div>
);

const ServiceCard = ({
  service,
  index,
  totalCount,
  onChange,
  onRemove,
  disableRemove,
  errors,
}) => {
  const [focusedField, setFocusedField] = useState(null);
  const pricing = service.pricing === "range" ? "range" : "fixed";
  const selectedCategory = SERVICE_CATEGORIES.find(
    (c) => c.id === Number(service.serviceCategoryId)
  );

  const getInputStyle = (fieldName) => ({
    ...styles.input,
    ...(focusedField === fieldName ? styles.inputFocus : {}),
    ...(errors?.[fieldName] ? styles.inputError : {}),
  });

  const getSelectStyle = (fieldName) => ({
    ...styles.select,
    ...(focusedField === fieldName ? styles.inputFocus : {}),
    ...(errors?.[fieldName] ? styles.inputError : {}),
  });

  const getTextareaStyle = (fieldName) => ({
    ...styles.textarea,
    ...(focusedField === fieldName ? styles.inputFocus : {}),
    ...(errors?.[fieldName] ? styles.inputError : {}),
  });

  return (
    <article style={styles.serviceCard}>
      <header style={styles.serviceCardHeader}>
        <div style={styles.serviceCardTitle}>
          <span style={styles.serviceBadge}>
            {selectedCategory?.icon || index + 1}
          </span>
          <div>
            <h3 style={styles.serviceTitleText}>
              {service.title || `Service ${index + 1}`}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              {selectedCategory?.name || "Select a category"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disableRemove}
          style={{
            ...styles.removeBtn,
            ...(disableRemove ? styles.removeBtnDisabled : {}),
          }}
        >
          <span>✕</span> Remove
        </button>
      </header>

      <div style={styles.fieldGrid}>
        <SectionDivider icon="📋" title="Basic Info" />

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor={`service-${index}-category`}>
              <span style={styles.labelIcon}>🏷️</span>
              Category
            </label>
            <select
              id={`service-${index}-category`}
              name="serviceCategoryId"
              value={service.serviceCategoryId}
              onChange={(event) => onChange(index, event)}
              onFocus={() => setFocusedField("serviceCategoryId")}
              onBlur={() => setFocusedField(null)}
              style={getSelectStyle("serviceCategoryId")}
              required
            >
              <option value="">Select a category...</option>
              {SERVICE_CATEGORIES.map(({ id, name, icon }) => (
                <option key={id} value={id}>
                  {icon} {name}
                </option>
              ))}
            </select>
            {errors?.serviceCategoryId && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.serviceCategoryId}
              </p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor={`service-${index}-title`}>
              <span style={styles.labelIcon}>✏️</span>
              Service Title
            </label>
            <input
              id={`service-${index}-title`}
              name="title"
              type="text"
              value={service.title}
              onChange={(event) => onChange(index, event)}
              onFocus={() => setFocusedField("title")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("title")}
              placeholder="e.g., Premium Haircut & Style"
              minLength={2}
              required
            />
            {errors?.title && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.title}
              </p>
            )}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor={`service-${index}-description`}>
            <span style={styles.labelIcon}>📝</span>
            Description
            <span style={styles.labelHint}>(min 10 characters)</span>
          </label>
          <textarea
            id={`service-${index}-description`}
            name="description"
            value={service.description}
            onChange={(event) => onChange(index, event)}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            style={getTextareaStyle("description")}
            placeholder="Describe what's included in this service..."
            minLength={10}
            required
          />
          {errors?.description && (
            <p style={styles.fieldError}>
              <span>⚠️</span> {errors.description}
            </p>
          )}
        </div>

        <SectionDivider icon="💰" title="Pricing" />

        <div style={styles.field}>
          <label style={styles.label}>
            <span style={styles.labelIcon}>📊</span>
            Pricing Model
          </label>
          <div style={styles.pricingToggle}>
            {PRICING_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange(index, { target: { name: "pricing", value } })
                }
                style={{
                  ...styles.pricingOption,
                  ...(pricing === value ? styles.pricingOptionActive : {}),
                }}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {pricing === "fixed" ? (
          <div style={styles.field}>
            <label style={styles.label} htmlFor={`service-${index}-fixed-price`}>
              <span style={styles.labelIcon}>💵</span>
              Fixed Price
            </label>
            <input
              id={`service-${index}-fixed-price`}
              name="fixedPrice"
              type="number"
              min="0"
              step="0.01"
              value={service.fixedPrice}
              onChange={(event) => onChange(index, event)}
              onFocus={() => setFocusedField("fixedPrice")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("fixedPrice")}
              placeholder="0.00"
              required
            />
            {errors?.fixedPrice && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.fixedPrice}
              </p>
            )}
          </div>
        ) : (
          <div style={styles.fieldRow}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor={`service-${index}-min-price`}>
                <span style={styles.labelIcon}>⬇️</span>
                Minimum Price
              </label>
              <input
                id={`service-${index}-min-price`}
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                value={service.minPrice}
                onChange={(event) => onChange(index, event)}
                onFocus={() => setFocusedField("minPrice")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("minPrice")}
                placeholder="0.00"
                required
              />
              {errors?.minPrice && (
                <p style={styles.fieldError}>
                  <span>⚠️</span> {errors.minPrice}
                </p>
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor={`service-${index}-max-price`}>
                <span style={styles.labelIcon}>⬆️</span>
                Maximum Price
              </label>
              <input
                id={`service-${index}-max-price`}
                name="maxPrice"
                type="number"
                min="0"
                step="0.01"
                value={service.maxPrice}
                onChange={(event) => onChange(index, event)}
                onFocus={() => setFocusedField("maxPrice")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("maxPrice")}
                placeholder="0.00"
                required
              />
              {errors?.maxPrice && (
                <p style={styles.fieldError}>
                  <span>⚠️</span> {errors.maxPrice}
                </p>
              )}
            </div>
          </div>
        )}

        <SectionDivider icon="⏱️" title="Duration & Details" />

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor={`service-${index}-duration`}>
              <span style={styles.labelIcon}>⏰</span>
              Duration
              <span style={styles.labelHint}>(minutes)</span>
            </label>
            <input
              id={`service-${index}-duration`}
              name="durationMinutes"
              type="number"
              min={MIN_DURATION_MINUTES}
              step="15"
              value={service.durationMinutes}
              onChange={(event) => onChange(index, event)}
              onFocus={() => setFocusedField("durationMinutes")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("durationMinutes")}
              required
            />
            {errors?.durationMinutes && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.durationMinutes}
              </p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor={`service-${index}-products`}>
              <span style={styles.labelIcon}>🧴</span>
              Products Used
              <span style={styles.labelHint}>(optional)</span>
            </label>
            <input
              id={`service-${index}-products`}
              name="productsUsed"
              value={service.productsUsed}
              onChange={(event) => onChange(index, event)}
              onFocus={() => setFocusedField("productsUsed")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("productsUsed")}
              placeholder="e.g., Olaplex, Kerastase (comma separated)"
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            <span style={styles.labelIcon}>📍</span>
            Service Location
          </label>
          <div style={styles.locationToggle}>
            {LOCATION_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange(index, { target: { name: "location", value } })
                }
                style={{
                  ...styles.locationOption,
                  ...(service.location === value
                    ? styles.locationOptionActive
                    : {}),
                }}
              >
                <span style={styles.locationIcon}>{icon}</span>
                <span style={styles.locationLabel}>{label}</span>
              </button>
            ))}
          </div>
          {errors?.location && (
            <p style={styles.fieldError}>
              <span>⚠️</span> {errors.location}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

const FreelancerServicesForm = ({
  initialServices,
  onSubmit,
  onBack,
  isSubmitting = false,
}) => {
  const [services, setServices] = useState(() =>
    ensureServiceArray(initialServices)
  );
  const [serviceErrors, setServiceErrors] = useState([]);
  const [formError, setFormError] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  useEffect(() => {
    setServices(ensureServiceArray(initialServices));
  }, [initialServices]);

  const canAddMore = services.length < MAX_SERVICES;
  const disableRemove = services.length <= MIN_SERVICES;

  const handleFieldChange = (index, event) => {
    const { name, value } = event.target;
    setServices((previous) =>
      previous.map((service, serviceIndex) =>
        serviceIndex === index
          ? {
              ...service,
              [name]: value,
            }
          : service
      )
    );
    setServiceErrors((previous) => {
      if (!previous[index]) {
        return previous;
      }
      const next = [...previous];
      next[index] = {
        ...next[index],
        [name]: null,
      };
      return next;
    });
  };

  const handleAddService = () => {
    if (!canAddMore) {
      return;
    }
    setServices((previous) => [...previous, createEmptyService()]);
  };

  const handleRemoveService = (index) => {
    if (disableRemove) {
      return;
    }
    setServices((previous) =>
      previous.filter((_, serviceIndex) => serviceIndex !== index)
    );
    setServiceErrors((previous) =>
      previous.filter((_, serviceIndex) => serviceIndex !== index)
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError(null);

    const { payload, errors } = validateServices(services);

    const hasErrors =
      Array.isArray(errors) &&
      errors.some((error) => error && Object.keys(error).length > 0);

    if (hasErrors || payload.length === 0) {
      setServiceErrors(Array.isArray(errors) ? errors : []);
      const firstError =
        errors.find((error) => error && error._form)?._form ??
        "Please review the highlighted fields.";
      setFormError(firstError);
      return;
    }

    setServiceErrors([]);
    onSubmit?.(payload);
  };

  const headline = useMemo(() => {
    if (services.length === 1) {
      return "Add your first service";
    }
    return "Review your services";
  }, [services.length]);

  const progressPercent = Math.min((services.length / MAX_SERVICES) * 100, 100);

  return (
    <>
      <style>{keyframes}</style>
      <section style={styles.container}>
        <header style={styles.hero}>
          <div style={styles.heroDecor} />
          <div style={styles.heroContent}>
            <span style={styles.heroEyebrow}>✨ Service Setup</span>
            <h2 style={styles.heroTitle}>{headline}</h2>
            <p style={styles.heroSubtitle}>
              Showcase your expertise! Add up to {MAX_SERVICES} services that
              highlight what makes you special.
            </p>
            <div style={styles.progressBar}>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
              <span style={styles.progressLabel}>
                {services.length}/{MAX_SERVICES}
              </span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {formError && (
            <div style={styles.errorBanner}>
              <span style={styles.errorIcon}>!</span>
              <p style={styles.errorText}>{formError}</p>
            </div>
          )}

          <div style={styles.serviceGrid}>
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                index={index}
                totalCount={services.length}
                service={service}
                onChange={handleFieldChange}
                onRemove={handleRemoveService}
                disableRemove={disableRemove}
                errors={serviceErrors[index]}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddService}
            disabled={!canAddMore}
            onMouseEnter={() => setHoveredBtn("add")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              ...styles.addServiceBtn,
              ...(hoveredBtn === "add" && canAddMore
                ? styles.addServiceBtnHover
                : {}),
              ...(!canAddMore ? styles.addServiceBtnDisabled : {}),
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>+</span>
            Add another service
            {!canAddMore && (
              <span style={{ opacity: 0.7 }}>(max {MAX_SERVICES})</span>
            )}
          </button>

          <footer style={styles.footer}>
            <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              {services.length} service{services.length !== 1 ? "s" : ""} added
            </span>
            <div style={styles.footerActions}>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isSubmitting}
                  onMouseEnter={() => setHoveredBtn("back")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={styles.backBtn}
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                onMouseEnter={() => setHoveredBtn("submit")}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  ...styles.submitBtn,
                  ...(hoveredBtn === "submit" && !isSubmitting
                    ? styles.submitBtnHover
                    : {}),
                  ...(isSubmitting ? styles.submitBtnDisabled : {}),
                }}
              >
                {isSubmitting ? (
                  <>
                    <span style={styles.spinner} />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Services
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </>
  );
};

export default FreelancerServicesForm;

export { SERVICE_CATEGORIES, validateServices };


