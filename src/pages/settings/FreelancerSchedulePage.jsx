import { useCallback } from "react";
import FreelancerScheduleForm from "../../components/FreelancerScheduleForm.jsx";
import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useToast } from "../../hooks/useToast.jsx";

const FreelancerSchedulePage = () => {
  const toast = useToast();

  const handleSubmit = useCallback(
    (payload) => {
      console.log("[FreelancerSchedulePage] Schedule submitted", {
        schedules: payload,
      });
      toast?.success?.({
        title: "Schedule saved",
        message:
          "Mock schedule saved locally. Check the console to review the payload.",
      });
    },
    [toast]
  );

  return (
    <section className="page freelancer-schedule-page">
      <header className="page-header">
        <h1>Manage your schedule</h1>
        <p className="page-subtitle">
          Adjust availability and break times. All changes are kept locally for
          now.
        </p>
      </header>

      <FreelancerScheduleForm onSubmit={handleSubmit} />
    </section>
  );
};

const FreelancerSchedulePageWithAuth = withFreelancerAuth(
  FreelancerSchedulePage
);

FreelancerSchedulePageWithAuth.displayName =
  "FreelancerSchedulePageWithAuth";

export default FreelancerSchedulePageWithAuth;


