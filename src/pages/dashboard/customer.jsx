import withCustomerAuth from "../../hoc/withCustomerAuth.jsx";

const CustomerDashboard = () => (
  <section className="page dashboard customer-dashboard">
    <h1>Customer Dashboard</h1>
    <p>Welcome back! Your customer workspace is ready.</p>
  </section>
);

export default withCustomerAuth(CustomerDashboard);

