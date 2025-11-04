import withAuth from "../hoc/withAuth.jsx";
import AddressForm from "./address/AddressForm.jsx";

const REQUIREMENT_ITEMS = [
  {
    id: "label",
    title: "Address label",
    body: 'Use at least 2 characters so you can recognise the location later (e.g. "Home" or "Office").',
  },
  {
    id: "type",
    title: "Address type",
    body: "Select whether this is a house, apartment, or office. This must match one of the supported options.",
  },
  {
    id: "line1",
    title: "Address line 1",
    body: "Provide the primary street address with at least 2 characters.",
  },
  {
    id: "country",
    title: "Country",
    body: "Country is mandatory so we can route your requests correctly.",
  },
  {
    id: "coordinates",
    title: "Latitude & Longitude",
    body: "Enter decimal coordinates between -90 and 90 for latitude, and -180 to 180 for longitude.",
  },
  {
    id: "optional",
    title: "Optional fields",
    body: "You can add town, governorate, road number, and additional directions to help providers find you faster.",
  },
];

const CreateAddress = () => {
  return (
    <section className="page address-page">
      <header className="page-header">
        <h1>Create your default address</h1>
        <p className="page-subtitle">
          Fill in the details below. We validate everything before sending it to keep your profile consistent with the backend requirements.
        </p>
      </header>

      <aside className="info-box" aria-label="Address input requirements">
        <h2>What we need from you</h2>
        <ul>
          {REQUIREMENT_ITEMS.map((item) => (
            <li key={item.id}>
              <strong>{item.title}:</strong> {item.body}
            </li>
          ))}
        </ul>
      </aside>

      <AddressForm />
    </section>
  );
};

const ProtectedCreateAddress = withAuth(CreateAddress);

export default ProtectedCreateAddress;

