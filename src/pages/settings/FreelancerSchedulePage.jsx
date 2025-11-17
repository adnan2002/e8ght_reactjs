import { useCallback } from "react";
import FreelancerScheduleForm from "../../components/FreelancerScheduleForm.jsx";
import withFreelancerScheduleGuard from "../../hoc/withFreelancerScheduleGuard.jsx";
import { useToast } from "../../hooks/useToast.jsx";

const MOCK_SCHEDULE = [
  {
    dayOfWeek: 0,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [],
  },
  {
    dayOfWeek: 1,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [
      { startTime: "12:00", endTime: "12:30" },
      { startTime: "15:00", endTime: "15:15" },
    ],
  },
  {
    dayOfWeek: 2,
    isActive: true,
    startTime: "10:00",
    endTime: "18:00",
    breaks: [{ startTime: "13:30", endTime: "14:00" }],
  },
  {
    dayOfWeek: 3,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [{ startTime: "12:30", endTime: "13:00" }],
  },
  {
    dayOfWeek: 4,
    isActive: true,
    startTime: "09:00",
    endTime: "16:00",
    breaks: [{ startTime: "11:30", endTime: "11:45" }],
  },
  {
    dayOfWeek: 5,
    isActive: false,
    startTime: "09:00",
    endTime: "14:00",
    breaks: [],
  },
  {
    dayOfWeek: 6,
    isActive: false,
    startTime: "09:00",
    endTime: "12:00",
    breaks: [],
  },
];

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

      <FreelancerScheduleForm
        initialSchedule={MOCK_SCHEDULE}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

const FreelancerSchedulePageWithGuard = withFreelancerScheduleGuard(
  FreelancerSchedulePage
);

FreelancerSchedulePageWithGuard.displayName =
  "FreelancerSchedulePageWithGuard";

export default FreelancerSchedulePageWithGuard;


