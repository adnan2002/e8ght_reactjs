import { useEffect, useMemo, useState } from "react";

const SERVICE_CATEGORIES = [
  { id: 1, name: "Hair" },
  { id: 2, name: "Nails" },
  { id: 3, name: "Makeup" },
  { id: 4, name: "Skincare" },
  { id: 5, name: "Lashes & Brows" },
  { id: 6, name: "Body & Spa" },
  { id: 7, name: "Health & Fitness" },
  { id: 8, name: "Waxing & Hair Removal" },
  { id: 9, name: "Massage & Wellness" },
  { id: 10, name: "Bridal Services" },
];

const LOCATION_OPTIONS = [
  { value: "on_premise", label: "At my location" },
  { value: "door_step", label: "At client's location" },
];

const PRICING_OPTIONS = [
  { value: "fixed", label: "Fixed price" },
  { value: "range", label: "Price range" },
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

const ServiceCard = ({
  service,
  index,
  onChange,
  onRemove,
  disableRemove,
  errors,
}) => {
  const pricing = service.pricing === "range" ? "range" : "fixed";
  return (
    <article className="service-card">
      <header className="service-card__header">
        <h3>Service {index + 1}</h3>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disableRemove}
        >
          Remove
        </button>
      </header>

      <div className="field">
        <label htmlFor={`service-${index}-category`}>Category</label>
        <select
          id={`service-${index}-category`}
          name="serviceCategoryId"
          value={service.serviceCategoryId}
          onChange={(event) => onChange(index, event)}
          required
        >
          <option value="">Select a category</option>
          {SERVICE_CATEGORIES.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        {errors?.serviceCategoryId && (
          <p className="field-error">{errors.serviceCategoryId}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`service-${index}-title`}>Title</label>
        <input
          id={`service-${index}-title`}
          name="title"
          type="text"
          value={service.title}
          onChange={(event) => onChange(index, event)}
          minLength={2}
          required
        />
        {errors?.title && <p className="field-error">{errors.title}</p>}
      </div>

      <div className="field">
        <label htmlFor={`service-${index}-description`}>Description</label>
        <textarea
          id={`service-${index}-description`}
          name="description"
          value={service.description}
          onChange={(event) => onChange(index, event)}
          minLength={10}
          required
        />
        {errors?.description && (
          <p className="field-error">{errors.description}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`service-${index}-pricing`}>Pricing</label>
        <select
          id={`service-${index}-pricing`}
          name="pricing"
          value={pricing}
          onChange={(event) => onChange(index, event)}
        >
          {PRICING_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {pricing === "fixed" ? (
        <div className="field">
          <label htmlFor={`service-${index}-fixed-price`}>Fixed price</label>
          <input
            id={`service-${index}-fixed-price`}
            name="fixedPrice"
            type="number"
            min="0"
            step="0.01"
            value={service.fixedPrice}
            onChange={(event) => onChange(index, event)}
            required
          />
          {errors?.fixedPrice && (
            <p className="field-error">{errors.fixedPrice}</p>
          )}
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor={`service-${index}-min-price`}>Min price</label>
            <input
              id={`service-${index}-min-price`}
              name="minPrice"
              type="number"
              min="0"
              step="0.01"
              value={service.minPrice}
              onChange={(event) => onChange(index, event)}
              required
            />
            {errors?.minPrice && (
              <p className="field-error">{errors.minPrice}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor={`service-${index}-max-price`}>Max price</label>
            <input
              id={`service-${index}-max-price`}
              name="maxPrice"
              type="number"
              min="0"
              step="0.01"
              value={service.maxPrice}
              onChange={(event) => onChange(index, event)}
              required
            />
            {errors?.maxPrice && (
              <p className="field-error">{errors.maxPrice}</p>
            )}
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor={`service-${index}-duration`}>
          Duration (minutes)
        </label>
        <input
          id={`service-${index}-duration`}
          name="durationMinutes"
          type="number"
          min={MIN_DURATION_MINUTES}
          step="15"
          value={service.durationMinutes}
          onChange={(event) => onChange(index, event)}
          required
        />
        {errors?.durationMinutes && (
          <p className="field-error">{errors.durationMinutes}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`service-${index}-products`}>
          Products used (optional, comma or line separated)
        </label>
        <textarea
          id={`service-${index}-products`}
          name="productsUsed"
          value={service.productsUsed}
          onChange={(event) => onChange(index, event)}
        />
      </div>

      <div className="field">
        <label htmlFor={`service-${index}-location`}>Location</label>
        <select
          id={`service-${index}-location`}
          name="location"
          value={service.location}
          onChange={(event) => onChange(index, event)}
        >
          {LOCATION_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors?.location && (
          <p className="field-error">{errors.location}</p>
        )}
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

  return (
    <section className="freelancer-services-form">
      <header>
        <h2>{headline}</h2>
        <p>
          Share the services you offer. You can add up to {MAX_SERVICES} and
          must include at least one.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {formError && <p className="notice error">{formError}</p>}

        <div className="service-grid">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              index={index}
              service={service}
              onChange={handleFieldChange}
              onRemove={handleRemoveService}
              disableRemove={disableRemove}
              errors={serviceErrors[index]}
            />
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={handleAddService}
            disabled={!canAddMore}
          >
            Add another service
          </button>
        </div>

        <footer className="form-footer">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save services"}
          </button>
        </footer>
      </form>
    </section>
  );
};

export default FreelancerServicesForm;

export { SERVICE_CATEGORIES, validateServices };


