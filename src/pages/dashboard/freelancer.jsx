import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";

export const FreelancerDashboard = () => (
  <section className="page dashboard freelancer-dashboard">
    <h1>Freelancer Dashboard</h1>
    <p>Welcome back! Your freelancer workspace is ready.</p>
  </section>
);

const FreelancerDashboardWithAuth = withFreelancerAuth(FreelancerDashboard);

FreelancerDashboardWithAuth.displayName = "FreelancerDashboardWithAuth";

export default FreelancerDashboardWithAuth;

