import { useState } from "react";
import withAuth from "../hoc/withAuth.jsx";
import AddressForm from "./address/AddressForm.jsx";

const REQUIREMENT_ITEMS = [
  {
    id: "label",
    icon: "🏷️",
    title: "Address Label",
    body: 'Use at least 2 characters so you can recognise the location later (e.g. "Home" or "Office").',
    required: true,
  },
  {
    id: "type",
    icon: "🏠",
    title: "Address Type",
    body: "Select whether this is a house, apartment, or office.",
    required: true,
  },
  {
    id: "line1",
    icon: "📍",
    title: "Street Address",
    body: "Provide the primary street address with at least 2 characters.",
    required: true,
  },
  {
    id: "country",
    icon: "🌍",
    title: "Country",
    body: "Country is mandatory so we can route your requests correctly.",
    required: true,
  },
  {
    id: "coordinates",
    icon: "🗺️",
    title: "Coordinates",
    body: "Latitude (-90 to 90) and longitude (-180 to 180) in decimal degrees.",
    required: true,
  },
  {
    id: "optional",
    icon: "✨",
    title: "Extra Details",
    body: "Town, governorate, road number, and directions help providers find you faster.",
    required: false,
  },
];

const CreateAddress = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="create-address-page">
      {/* Background decorations */}
      <div className="create-address-page__bg" aria-hidden="true" />

      {/* Hero Header */}
      <header className="create-address-header">
        <div className="create-address-header__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="create-address-header__title">Create Your Address</h1>
        <p className="create-address-header__subtitle">
          Set up your default location so service providers can find you easily. 
          All fields marked with <span className="required-marker">*</span> are required.
        </p>
      </header>

      {/* Main Content */}
      <main className="create-address-content">
        {/* Quick Guide Toggle */}
        <button 
          type="button"
          className={`guide-toggle ${showGuide ? 'guide-toggle--active' : ''}`}
          onClick={() => setShowGuide(!showGuide)}
          aria-expanded={showGuide}
        >
          <span className="guide-toggle__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className="guide-toggle__text">
            {showGuide ? 'Hide' : 'Show'} field guide
          </span>
          <span className={`guide-toggle__chevron ${showGuide ? 'guide-toggle__chevron--open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {/* Collapsible Guide */}
        {showGuide && (
          <aside className="field-guide" aria-label="Address field requirements">
            <div className="field-guide__grid">
              {REQUIREMENT_ITEMS.map((item) => (
                <div key={item.id} className="field-guide__card">
                  <div className="field-guide__card-icon">{item.icon}</div>
                  <div className="field-guide__card-content">
                    <h3 className="field-guide__card-title">
                      {item.title}
                      {item.required && <span className="required-badge">Required</span>}
                    </h3>
                    <p className="field-guide__card-body">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Form Card */}
        <section className="address-form-card">
          <div className="address-form-card__header">
            <h2 className="address-form-card__title">Address Details</h2>
            <p className="address-form-card__desc">
              Enter your location information below. We'll validate everything automatically.
            </p>
          </div>
          <AddressForm 
            className="form address-form address-form--enhanced"
            submitLabel="Save Address"
            submittingLabel="Saving..."
          />
        </section>
      </main>
    </div>
  );
};

const ProtectedCreateAddress = withAuth(CreateAddress);

export default ProtectedCreateAddress;

