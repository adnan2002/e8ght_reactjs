import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";

const FreelancerDashboard = () => (
  <section className="page dashboard freelancer-dashboard">
    <h1>Freelancer Dashboard</h1>
    <p>Welcome back! Your freelancer workspace is ready.</p>
  </section>
);

export default withFreelancerAuth(FreelancerDashboard);

