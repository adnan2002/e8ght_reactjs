import withFreelancerOnly from "../../hoc/withFreelancerOnly.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";

const LOG_PREFIX = "[FreelancerScheduleManageButton]";

const FreelancerScheduleManageButton = () => {
  const { user, freelancerProfile } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    console.log(LOG_PREFIX, "Schedule manage CTA clicked", {
      userId: user?.id ?? null,
      freelancerId: freelancerProfile?.id ?? null,
    });
    navigate("/settings/freelancer-schedule");
  };

  return (
    <section className="freelancer-schedule-manage-cta">
      <header>
        <h2>Keep your schedule up to date</h2>
        <p>
          Add or adjust the hours you&rsquo;re available so clients can book you
          when it works best.
        </p>
      </header>
      <button type="button" className="btn-primary" onClick={handleClick}>
        Add or modify schedule
      </button>
    </section>
  );
};

const FreelancerScheduleManageButtonWithAuth =
  withFreelancerOnly(FreelancerScheduleManageButton);

FreelancerScheduleManageButtonWithAuth.displayName =
  "FreelancerScheduleManageButtonWithAuth";

export default FreelancerScheduleManageButtonWithAuth;
export { FreelancerScheduleManageButton };


