import withCustomerAuth from "../../hoc/withCustomerAuth.jsx";

export const CustomerDashboard = () => (
  <section className="page dashboard customer-dashboard">
    <h1>Customer Dashboard</h1>
    <p>Welcome back! Your customer workspace is ready.</p>
  </section>
);

const CustomerDashboardWithAuth = withCustomerAuth(CustomerDashboard);

CustomerDashboardWithAuth.displayName = "CustomerDashboardWithAuth";

export default CustomerDashboardWithAuth;

