import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import FreelancerProfileEditForm from "../../components/freelancer/FreelancerProfileEditForm.jsx";
import FreelancerScheduleManageButton from "../../components/freelancer/FreelancerScheduleManageButton.jsx";

const STATUS_COPY = {
  loading: "Loading your freelancer profile…",
  unknown: "Checking your freelancer profile…",
  error:
    "We ran into a problem while loading your freelancer profile. Please try again shortly.",
  missing:
    "We could not locate your freelancer profile. Please create one before editing.",
};

const FreelancerProfileEdit = () => {
  const { freelancerProfile, freelancerProfileStatus } = useAuth();

  const statusMessage =
    STATUS_COPY[freelancerProfileStatus] ?? STATUS_COPY.loading;

  if (!freelancerProfile) {
    return (
      <section className="page freelancer-profile-edit" aria-busy="true">
        <header className="page-header">
          <h1>Freelancer Profile</h1>
          <p className="page-subtitle">{statusMessage}</p>
        </header>
      </section>
    );
  }

  return (
    <section className="page freelancer-profile-edit">
      <header className="page-header">
        <h1>Edit Freelancer Profile</h1>
        <p className="page-subtitle">
          Update your availability, share experience details, and refresh your
          verification documents.
        </p>
      </header>
      <FreelancerScheduleManageButton />
      <FreelancerProfileEditForm freelancer={freelancerProfile} />
    </section>
  );
};

const FreelancerProfileEditWithAuth =
  withFreelancerAuth(FreelancerProfileEdit);

FreelancerProfileEditWithAuth.displayName = "FreelancerProfileEditWithAuth";

export default FreelancerProfileEditWithAuth;


