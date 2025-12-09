import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICE_CATEGORIES } from "../../components/FreelancerServicesForm.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";
import { useAuthenticatedGetRedirect } from "../../hooks/useAuthenticatedGetRedirect.jsx";

const LOCATION_OPTIONS = {
  on_premise: { label: "At my location", icon: "🏠" },
  door_step: { label: "At client's location", icon: "🚗" },
};

const LOCATION_OPTIONS_ARRAY = [
  { value: "on_premise", label: "At my location", icon: "🏠" },
  { value: "door_step", label: "At client's location", icon: "🚗" },
];

const PRICING_OPTIONS = [
  { value: "fixed", label: "Fixed price", icon: "💵" },
  { value: "range", label: "Price range", icon: "📊" },
];

const MIN_DURATION_MINUTES = 60;

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load your freelancer services. Please try again.";

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
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
`;

const styles = {
  container: {
    display: "grid",
    gap: "2rem",
    animation: "fadeIn 0.4s ease-out",
  },
  hero: {
    position: "relative",
    padding: "2rem 2.25rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #fce7f3 0%, #dbeafe 50%, #e0e7ff 100%)",
    boxShadow: "0 20px 40px rgba(219, 39, 119, 0.1)",
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    top: "-30%",
    right: "-10%",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background: "rgba(236, 72, 153, 0.15)",
    filter: "blur(40px)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: "-20%",
    left: "10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "rgba(99, 102, 241, 0.12)",
    filter: "blur(30px)",
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
    color: "#be185d",
  },
  heroTitle: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #831843 0%, #6d28d9 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#6b21a8",
    opacity: 0.85,
    maxWidth: "500px",
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "1rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1.25rem",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  statIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    color: "white",
    fontSize: "1.1rem",
  },
  statContent: {
    display: "grid",
    gap: "0.1rem",
  },
  statValue: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#1e1b4b",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    color: "white",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 200ms ease",
    boxShadow: "0 8px 20px rgba(236, 72, 153, 0.3)",
  },
  editBtnHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 28px rgba(236, 72, 153, 0.4)",
  },
  servicesGrid: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  serviceCard: {
    position: "relative",
    padding: "1.5rem",
    borderRadius: "18px",
    background: "white",
    border: "1.5px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    transition: "all 250ms ease",
    animation: "slideIn 0.3s ease-out",
  },
  serviceCardHover: {
    borderColor: "rgba(236, 72, 153, 0.3)",
    boxShadow: "0 16px 40px rgba(236, 72, 153, 0.1)",
    transform: "translateY(-4px)",
  },
  serviceCardEditing: {
    borderColor: "rgba(139, 92, 246, 0.5)",
    boxShadow: "0 16px 40px rgba(139, 92, 246, 0.15)",
  },
  serviceCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  },
  categoryBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "3rem",
    height: "3rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%)",
    fontSize: "1.4rem",
    flexShrink: 0,
  },
  serviceHeaderContent: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1.3,
  },
  categoryName: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    marginTop: "0.35rem",
    padding: "0.25rem 0.65rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#be185d",
  },
  serviceDescription: {
    margin: "0 0 1rem 0",
    fontSize: "0.9rem",
    color: "#64748b",
    lineHeight: 1.6,
  },
  metaGrid: {
    display: "grid",
    gap: "0.75rem",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 0.85rem",
    borderRadius: "12px",
    background: "rgba(248, 250, 252, 0.8)",
  },
  metaIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "8px",
    background: "white",
    fontSize: "0.9rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  metaContent: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  metaValue: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#334155",
    marginTop: "0.1rem",
  },
  productsUsed: {
    marginTop: "0.5rem",
    padding: "0.85rem",
    borderRadius: "12px",
    background: "linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)",
    border: "1px dashed rgba(148, 163, 184, 0.3)",
  },
  productsLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "0.5rem",
  },
  productsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
  },
  productTag: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    background: "white",
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#475569",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1.25rem 1.5rem",
    borderRadius: "16px",
    fontSize: "0.95rem",
    fontWeight: 500,
    animation: "slideIn 0.3s ease-out",
  },
  noticeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  noticeLoading: {
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    color: "#1e40af",
  },
  noticeLoadingIcon: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "white",
  },
  noticeError: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#b91c1c",
  },
  noticeErrorIcon: {
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "white",
  },
  noticeEmpty: {
    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    color: "#92400e",
  },
  noticeEmptyIcon: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "white",
  },
  emptyStateActions: {
    marginTop: "1rem",
  },
  addServiceBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.65rem 1.25rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    boxShadow: "0 6px 16px rgba(245, 158, 11, 0.3)",
  },
  // Edit card button styles
  cardEditBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.5rem 0.85rem",
    borderRadius: "8px",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    background: "rgba(139, 92, 246, 0.1)",
    color: "#7c3aed",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  cardEditBtnHover: {
    background: "rgba(139, 92, 246, 0.2)",
    borderColor: "#7c3aed",
  },
  // Edit form styles
  editFormContainer: {
    marginTop: "1rem",
    padding: "1.25rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
  },
  fieldGrid: {
    display: "grid",
    gap: "1rem",
  },
  fieldRow: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  field: {
    display: "grid",
    gap: "0.4rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#374151",
  },
  labelIcon: {
    fontSize: "0.9rem",
    opacity: 0.8,
  },
  labelHint: {
    fontSize: "0.7rem",
    fontWeight: 400,
    color: "#9ca3af",
  },
  input: {
    padding: "0.7rem 0.85rem",
    borderRadius: "10px",
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: "0.9rem",
    color: "#1f2937",
    transition: "all 180ms ease",
    outline: "none",
  },
  inputFocus: {
    borderColor: "#8b5cf6",
    boxShadow: "0 0 0 3px rgba(139, 92, 246, 0.1)",
  },
  inputError: {
    borderColor: "#ef4444",
    background: "#fef2f2",
  },
  select: {
    padding: "0.7rem 0.85rem",
    borderRadius: "10px",
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: "0.9rem",
    color: "#1f2937",
    cursor: "pointer",
    transition: "all 180ms ease",
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.85rem center",
    paddingRight: "2rem",
  },
  textarea: {
    padding: "0.7rem 0.85rem",
    borderRadius: "10px",
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: "0.9rem",
    color: "#1f2937",
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "all 180ms ease",
    outline: "none",
  },
  fieldError: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.75rem",
    color: "#dc2626",
    fontWeight: 500,
  },
  pricingToggle: {
    display: "flex",
    gap: "0.4rem",
    padding: "0.25rem",
    borderRadius: "10px",
    background: "#f1f5f9",
  },
  pricingOption: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3rem",
    padding: "0.55rem 0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  pricingOptionActive: {
    background: "white",
    color: "#7c3aed",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  locationToggle: {
    display: "flex",
    gap: "0.5rem",
  },
  locationOption: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.65rem",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    background: "white",
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
    fontSize: "1.2rem",
  },
  locationLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textAlign: "center",
  },
  editFormActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.6rem",
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid rgba(148, 163, 184, 0.2)",
  },
  cancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#4b5563",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(139, 92, 246, 0.3)",
    transition: "all 180ms ease",
  },
  saveBtnHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 8px 20px rgba(139, 92, 246, 0.4)",
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none",
  },
  spinner: {
    width: "0.9rem",
    height: "0.9rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: "0.75rem 0 0.5rem 0",
  },
  sectionIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.5rem",
    height: "1.5rem",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
    fontSize: "0.75rem",
  },
  sectionTitle: {
    fontSize: "0.7rem",
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
  successMessage: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#166534",
    fontSize: "0.85rem",
    fontWeight: 500,
    marginBottom: "1rem",
    animation: "slideIn 0.3s ease-out",
  },
};

// Helper functions
const normaliseNumber = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseInteger = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const splitListInput = (value) => {
  const trimmed = normaliseString(value);
  if (!trimmed) return [];
  return trimmed
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

// Convert API service to edit form format
const serviceToEditForm = (service) => {
  const durationMinutes = service.service_duration_seconds
    ? Math.round(service.service_duration_seconds / 60)
    : 60;
  const productsUsed = Array.isArray(service.products_used)
    ? service.products_used.join(", ")
    : "";

  // Determine pricing mode based on which price fields are set
  // If fixed_price exists and is not null → fixed pricing
  // If min_price and max_price exist and are not null → range pricing
  const hasFixedPrice = service.fixed_price != null;
  const hasRangePrice = service.min_price != null && service.max_price != null;

  let pricing = "fixed";
  let fixedPrice = "";
  let minPrice = "";
  let maxPrice = "";

  if (hasFixedPrice) {
    pricing = "fixed";
    fixedPrice = String(service.fixed_price);
    // min and max should be null/empty for fixed pricing
    minPrice = "";
    maxPrice = "";
  } else if (hasRangePrice) {
    pricing = "range";
    fixedPrice = "";
    minPrice = String(service.min_price);
    maxPrice = String(service.max_price);
  }

  return {
    serviceCategoryId: String(service.service_category_id || ""),
    title: service.title || "",
    description: service.description || "",
    pricing,
    fixedPrice,
    minPrice,
    maxPrice,
    durationMinutes: String(durationMinutes),
    productsUsed,
    location: service.location || "on_premise",
  };
};

// Validate single service edit form
const validateEditForm = (form) => {
  const errors = {};

  const categoryId = normaliseInteger(form.serviceCategoryId);
  if (!categoryId || !SERVICE_CATEGORIES.some(({ id }) => id === categoryId)) {
    errors.serviceCategoryId = "Select a valid category.";
  }

  const title = normaliseString(form.title);
  if (title.length < 2) {
    errors.title = "Title must be at least 2 characters.";
  }

  const description = normaliseString(form.description);
  if (description.length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }

  const pricing = form.pricing === "range" ? "range" : "fixed";
  const fixedPrice = normaliseNumber(form.fixedPrice);
  const minPrice = normaliseNumber(form.minPrice);
  const maxPrice = normaliseNumber(form.maxPrice);

  if (pricing === "fixed") {
    if (fixedPrice == null || fixedPrice <= 0) {
      errors.fixedPrice = "Enter a price greater than zero.";
    }
  } else {
    if (minPrice == null || minPrice <= 0) {
      errors.minPrice = "Min price must be greater than zero.";
    }
    if (maxPrice == null || maxPrice <= 0) {
      errors.maxPrice = "Max price must be greater than zero.";
    }
    if (minPrice != null && maxPrice != null && maxPrice <= minPrice) {
      errors.maxPrice = "Max price must be greater than min price.";
    }
  }

  const durationMinutes = normaliseInteger(form.durationMinutes);
  if (durationMinutes == null || durationMinutes < MIN_DURATION_MINUTES) {
    errors.durationMinutes = `Duration must be at least ${MIN_DURATION_MINUTES} minutes.`;
  }

  const location = form.location;
  if (!LOCATION_OPTIONS_ARRAY.some(({ value }) => value === location)) {
    errors.location = "Select a valid location.";
  }

  return errors;
};

// Convert edit form to API payload
const editFormToPayload = (form) => {
  const pricing = form.pricing === "range" ? "range" : "fixed";
  const payload = {
    service_category_id: normaliseInteger(form.serviceCategoryId),
    title: normaliseString(form.title),
    description: normaliseString(form.description),
    pricing,
    service_duration_seconds: normaliseInteger(form.durationMinutes) * 60,
    products_used: splitListInput(form.productsUsed),
    location: form.location,
  };

  if (pricing === "fixed") {
    payload.fixed_price = normaliseNumber(form.fixedPrice);
    payload.min_price = null;
    payload.max_price = null;
  } else {
    payload.min_price = normaliseNumber(form.minPrice);
    payload.max_price = normaliseNumber(form.maxPrice);
    payload.fixed_price = null;
  }

  return payload;
};

// Section Divider Component
const SectionDivider = ({ icon, title }) => (
  <div style={styles.sectionDivider}>
    <span style={styles.sectionIcon}>{icon}</span>
    <span style={styles.sectionTitle}>{title}</span>
    <span style={styles.sectionLine} />
  </div>
);

// Edit Form Component
const ServiceEditForm = ({
  form,
  errors,
  onChange,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [focusedField, setFocusedField] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const pricing = form.pricing === "range" ? "range" : "fixed";

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
    <div style={styles.editFormContainer}>
      <div style={styles.fieldGrid}>
        <SectionDivider icon="📋" title="Basic Info" />

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🏷️</span>
              Category
            </label>
            <select
              name="serviceCategoryId"
              value={form.serviceCategoryId}
              onChange={onChange}
              onFocus={() => setFocusedField("serviceCategoryId")}
              onBlur={() => setFocusedField(null)}
              style={getSelectStyle("serviceCategoryId")}
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
            <label style={styles.label}>
              <span style={styles.labelIcon}>✏️</span>
              Service Title
            </label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={onChange}
              onFocus={() => setFocusedField("title")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("title")}
              placeholder="e.g., Premium Haircut & Style"
            />
            {errors?.title && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.title}
              </p>
            )}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            <span style={styles.labelIcon}>📝</span>
            Description
            <span style={styles.labelHint}>(min 10 characters)</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            style={getTextareaStyle("description")}
            placeholder="Describe what's included in this service..."
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
                  onChange({ target: { name: "pricing", value } })
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
            <label style={styles.label}>
              <span style={styles.labelIcon}>💵</span>
              Fixed Price (£)
            </label>
            <input
              name="fixedPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.fixedPrice}
              onChange={onChange}
              onFocus={() => setFocusedField("fixedPrice")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("fixedPrice")}
              placeholder="0.00"
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
              <label style={styles.label}>
                <span style={styles.labelIcon}>⬇️</span>
                Min Price (£)
              </label>
              <input
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.minPrice}
                onChange={onChange}
                onFocus={() => setFocusedField("minPrice")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("minPrice")}
                placeholder="0.00"
              />
              {errors?.minPrice && (
                <p style={styles.fieldError}>
                  <span>⚠️</span> {errors.minPrice}
                </p>
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>⬆️</span>
                Max Price (£)
              </label>
              <input
                name="maxPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.maxPrice}
                onChange={onChange}
                onFocus={() => setFocusedField("maxPrice")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("maxPrice")}
                placeholder="0.00"
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
            <label style={styles.label}>
              <span style={styles.labelIcon}>⏰</span>
              Duration
              <span style={styles.labelHint}>(minutes)</span>
            </label>
            <input
              name="durationMinutes"
              type="number"
              min={MIN_DURATION_MINUTES}
              step="15"
              value={form.durationMinutes}
              onChange={onChange}
              onFocus={() => setFocusedField("durationMinutes")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("durationMinutes")}
            />
            {errors?.durationMinutes && (
              <p style={styles.fieldError}>
                <span>⚠️</span> {errors.durationMinutes}
              </p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🧴</span>
              Products Used
              <span style={styles.labelHint}>(optional)</span>
            </label>
            <input
              name="productsUsed"
              value={form.productsUsed}
              onChange={onChange}
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
            {LOCATION_OPTIONS_ARRAY.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange({ target: { name: "location", value } })
                }
                style={{
                  ...styles.locationOption,
                  ...(form.location === value ? styles.locationOptionActive : {}),
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

      <div style={styles.editFormActions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          style={styles.cancelBtn}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          onMouseEnter={() => setHoveredBtn("save")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            ...styles.saveBtn,
            ...(hoveredBtn === "save" && !isSaving ? styles.saveBtnHover : {}),
            ...(isSaving ? styles.saveBtnDisabled : {}),
          }}
        >
          {isSaving ? (
            <>
              <span style={styles.spinner} />
              Saving...
            </>
          ) : (
            <>
              <span>💾</span> Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const FreelancerServicesView = () => {
  const navigate = useNavigate();
  const ensureFreelancer = useAuthenticatedGetRedirect(
    "/users/me/freelancer/",
    "/dashboard"
  );
  const authenticatedFetch = useAuthenticatedFetch();

  const [services, setServices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [hoveredEditBtn, setHoveredEditBtn] = useState(null);

  // Edit mode state
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const categoryLookup = useMemo(() => {
    const lookup = new Map();
    SERVICE_CATEGORIES.forEach(({ id, name, icon }) => {
      lookup.set(id, { name, icon });
    });
    return lookup;
  }, []);

  const redirectToLogin = useCallback(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  const extractStatusCode = useCallback((error) => {
    return (
      error?.status ??
      error?.response?.status ??
      error?.payload?.status ??
      null
    );
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchServices = async () => {
      setStatus("loading");
      setErrorMessage("");

      try {
        await ensureFreelancer.requestJson();
      } catch (error) {
        if (!isActive) {
          return;
        }

        const statusCode = extractStatusCode(error);

        if (statusCode === 404) {
          return;
        }

        redirectToLogin();
        return;
      }

      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/services/",
          {
            method: "GET",
          }
        );

        if (!isActive) {
          return;
        }

        const nextServices = Array.isArray(payload?.services)
          ? payload.services
          : [];

        setServices(nextServices);
        setStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        const statusCode = extractStatusCode(error);

        if (statusCode === 401 || statusCode === 403) {
          redirectToLogin();
          return;
        }

        if (statusCode === 404) {
          return;
        }

        const backendMessage =
          error?.payload?.error ??
          error?.payload?.message ??
          error?.message ??
          null;

        setErrorMessage(
          typeof backendMessage === "string" && backendMessage.trim().length > 0
            ? backendMessage
            : DEFAULT_ERROR_MESSAGE
        );
        setStatus("error");
      }
    };

    fetchServices();

    return () => {
      isActive = false;
    };
  }, [
    authenticatedFetch,
    ensureFreelancer,
    extractStatusCode,
    redirectToLogin,
  ]);

  const formatDuration = (seconds) => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
      return null;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes <= 0) {
      return null;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    if (hours > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }
    return `${minutes} min`;
  };

  const renderPrice = (service) => {
    const hasFixed = Object.prototype.hasOwnProperty.call(
      service,
      "fixed_price"
    );
    if (hasFixed && service.fixed_price != null) {
      const fixed = Number(service.fixed_price);
      if (Number.isFinite(fixed)) {
        return `£${fixed.toFixed(2)}`;
      }
    }

    const hasMin = Object.prototype.hasOwnProperty.call(service, "min_price");
    const hasMax = Object.prototype.hasOwnProperty.call(service, "max_price");
    if (hasMin && hasMax && service.min_price != null && service.max_price != null) {
      const min = Number(service.min_price);
      const max = Number(service.max_price);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `£${min.toFixed(2)} – £${max.toFixed(2)}`;
      }
    }

    return null;
  };

  const uniqueCategories = useMemo(() => {
    const ids = new Set();
    services.forEach((service) => {
      const categoryId =
        typeof service.service_category_id === "string"
          ? Number.parseInt(service.service_category_id, 10)
          : service.service_category_id;
      if (Number.isFinite(categoryId)) {
        ids.add(categoryId);
      }
    });
    return ids.size;
  }, [services]);

  const handleEditServices = () => {
    navigate("/settings/freelancer/services/edit");
  };

  // Start editing a service
  const handleStartEdit = (service) => {
    setEditingServiceId(service.id);
    setEditForm(serviceToEditForm(service));
    setEditErrors({});
    setSaveSuccess(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setEditForm(null);
    setEditErrors({});
  };

  // Handle form field change
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (editErrors[name]) {
      setEditErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Save edited service
  const handleSaveEdit = async () => {
    if (!editForm || !editingServiceId) return;

    // Validate
    const errors = validateEditForm(editForm);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSaving(true);
    setEditErrors({});

    try {
      const payload = editFormToPayload(editForm);
      const response = await authenticatedFetch.requestJson(
        `/users/me/freelancer/services/${editingServiceId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      // Update the service in the list
      if (response?.service) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingServiceId ? response.service : s
          )
        );
      }

      // Show success and close edit form
      setSaveSuccess(editingServiceId);
      setEditingServiceId(null);
      setEditForm(null);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
    } catch (error) {
      const statusCode = extractStatusCode(error);

      if (statusCode === 401 || statusCode === 403) {
        redirectToLogin();
        return;
      }

      const backendMessage =
        error?.payload?.error ??
        error?.payload?.message ??
        error?.message ??
        "Failed to save changes. Please try again.";

      setEditErrors({ _form: backendMessage });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <style>{keyframes}</style>
      <section style={styles.container}>
        {/* Hero Section */}
        <header style={styles.hero}>
          <div style={styles.heroDecor} />
          <div style={styles.heroDecor2} />
          <div style={styles.heroContent}>
            <span style={styles.heroEyebrow}>💼 My Services</span>
            <h1 style={styles.heroTitle}>Freelancer Services</h1>
            <p style={styles.heroSubtitle}>
              Review and manage the services that clients can book with you.
              Click on any service card to edit its details.
            </p>

            {status === "ready" && (
              <>
                <div style={styles.statsRow}>
                  <div style={styles.statCard}>
                    <span style={styles.statIcon}>📋</span>
                    <div style={styles.statContent}>
                      <span style={styles.statValue}>{services.length}</span>
                      <span style={styles.statLabel}>Total Services</span>
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statIcon}>🏷️</span>
                    <div style={styles.statContent}>
                      <span style={styles.statValue}>{uniqueCategories}</span>
                      <span style={styles.statLabel}>Categories</span>
                    </div>
                  </div>
                </div>

                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={()=> {
                      navigate("/settings/freelancer-services/create");
                    }}
                    onMouseEnter={() => setHoveredBtn("edit")}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...styles.editBtn,
                      ...(hoveredBtn === "edit" ? styles.editBtnHover : {}),
                    }}
                  >
                    <span>➕</span> Add New Services
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Loading State */}
        {status === "loading" && (
          <div style={{ ...styles.notice, ...styles.noticeLoading }} aria-live="polite">
            <span style={{ ...styles.noticeIcon, ...styles.noticeLoadingIcon }}>⏳</span>
            <span>Loading your freelancer services…</span>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div style={{ ...styles.notice, ...styles.noticeError }} role="alert">
            <span style={{ ...styles.noticeIcon, ...styles.noticeErrorIcon }}>⚠️</span>
            <span>{errorMessage || DEFAULT_ERROR_MESSAGE}</span>
          </div>
        )}

        {/* Empty State */}
        {status === "ready" && services.length === 0 && (
          <div style={{ ...styles.notice, ...styles.noticeEmpty }}>
            <span style={{ ...styles.noticeIcon, ...styles.noticeEmptyIcon }}>📭</span>
            <div>
              <span>You haven't added any freelancer services yet.</span>
              <div style={styles.emptyStateActions}>
                <button
                  type="button"
                  onClick={handleEditServices}
                  style={styles.addServiceBtn}
                >
                  <span>➕</span> Add Your First Service
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {status === "ready" && services.length > 0 && (
          <div style={styles.servicesGrid}>
            {services.map((service, index) => {
              const categoryId =
                typeof service.service_category_id === "string"
                  ? Number.parseInt(service.service_category_id, 10)
                  : service.service_category_id;
              const category = categoryLookup.get(
                Number.isFinite(categoryId) ? categoryId : null
              );
              const categoryName = category?.name ?? "Unknown";
              const categoryIcon = category?.icon ?? "📦";
              const durationLabel = formatDuration(
                service.service_duration_seconds
              );
              const priceLabel = renderPrice(service);
              const locationInfo = LOCATION_OPTIONS[service.location];
              const locationLabel = locationInfo?.label ?? service.location;
              const locationIcon = locationInfo?.icon ?? "📍";

              const isEditing = editingServiceId === service.id;
              const justSaved = saveSuccess === service.id;

              return (
                <article
                  key={service.id ?? `service-${index}`}
                  style={{
                    ...styles.serviceCard,
                    ...(isEditing
                      ? styles.serviceCardEditing
                      : hoveredCard === index
                      ? styles.serviceCardHover
                      : {}),
                    animationDelay: `${index * 0.05}s`,
                  }}
                  onMouseEnter={() => !isEditing && setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {justSaved && (
                    <div style={styles.successMessage}>
                      <span>✅</span> Changes saved successfully!
                    </div>
                  )}

                  <header style={styles.serviceCardHeader}>
                    <span style={styles.categoryBadge}>{categoryIcon}</span>
                    <div style={styles.serviceHeaderContent}>
                      <h2 style={styles.serviceTitle}>
                        {service.title ?? "Untitled service"}
                      </h2>
                      <span style={styles.categoryName}>
                        {categoryName}
                      </span>
                    </div>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(service)}
                        onMouseEnter={() => setHoveredEditBtn(service.id)}
                        onMouseLeave={() => setHoveredEditBtn(null)}
                        style={{
                          ...styles.cardEditBtn,
                          ...(hoveredEditBtn === service.id
                            ? styles.cardEditBtnHover
                            : {}),
                        }}
                      >
                        <span>✏️</span> Edit
                      </button>
                    )}
                  </header>

                  {isEditing ? (
                    <>
                      {editErrors._form && (
                        <div
                          style={{
                            ...styles.notice,
                            ...styles.noticeError,
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            animation: "shake 0.5s ease-in-out",
                          }}
                        >
                          <span
                            style={{
                              ...styles.noticeIcon,
                              ...styles.noticeErrorIcon,
                              width: "1.75rem",
                              height: "1.75rem",
                              fontSize: "0.9rem",
                            }}
                          >
                            ⚠️
                          </span>
                          <span>{editErrors._form}</span>
                        </div>
                      )}
                      <ServiceEditForm
                        form={editForm}
                        errors={editErrors}
                        onChange={handleFormChange}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        isSaving={isSaving}
                      />
                    </>
                  ) : (
                    <>
                      {service.description && (
                        <p style={styles.serviceDescription}>
                          {service.description}
                        </p>
                      )}

                      <div style={styles.metaGrid}>
                        {priceLabel && (
                          <div style={styles.metaItem}>
                            <span style={styles.metaIcon}>💰</span>
                            <div style={styles.metaContent}>
                              <span style={styles.metaLabel}>Pricing</span>
                              <span style={styles.metaValue}>{priceLabel}</span>
                            </div>
                          </div>
                        )}

                        {durationLabel && (
                          <div style={styles.metaItem}>
                            <span style={styles.metaIcon}>⏱️</span>
                            <div style={styles.metaContent}>
                              <span style={styles.metaLabel}>Duration</span>
                              <span style={styles.metaValue}>{durationLabel}</span>
                            </div>
                          </div>
                        )}

                        {locationLabel && (
                          <div style={styles.metaItem}>
                            <span style={styles.metaIcon}>{locationIcon}</span>
                            <div style={styles.metaContent}>
                              <span style={styles.metaLabel}>Location</span>
                              <span style={styles.metaValue}>{locationLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {Array.isArray(service.products_used) &&
                        service.products_used.length > 0 && (
                          <div style={styles.productsUsed}>
                            <span style={styles.productsLabel}>
                              <span>🧴</span> Products Used
                            </span>
                            <div style={styles.productsList}>
                              {service.products_used.map((product, idx) => (
                                <span key={idx} style={styles.productTag}>
                                  {product}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default FreelancerServicesView;
