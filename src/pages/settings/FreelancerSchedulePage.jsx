import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FreelancerScheduleForm from "../../components/FreelancerScheduleForm.jsx";
import withFreelancerAuth from "../../hoc/withFreelancerAuth.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";

const FreelancerSchedulePage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialSchedule, setInitialSchedule] = useState(null);
  const [scheduleLoadStatus, setScheduleLoadStatus] = useState("loading");
  const [scheduleLoadError, setScheduleLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSchedule = async () => {
      setScheduleLoadStatus("loading");
      setScheduleLoadError(null);

      try {
        const payload = await authenticatedFetch.requestJson(
          "/users/me/freelancer/schedules/",
          { method: "GET" }
        );

        if (cancelled) {
          return;
        }

        const schedules = Array.isArray(payload?.schedules)
          ? payload.schedules
          : Array.isArray(payload)
          ? payload
          : null;

        setInitialSchedule(schedules);
        setScheduleLoadStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const statusCode =
          error?.status ??
          error?.response?.status ??
          error?.payload?.status ??
          error?.payload?.statusCode ??
          null;

        if (statusCode === 404) {
          setInitialSchedule(null);
          setScheduleLoadStatus("missing");
          setScheduleLoadError(null);
          return;
        }

        if (statusCode === 401 || statusCode === 403) {
          setInitialSchedule(null);
          setScheduleLoadStatus("unauthorized");
          setScheduleLoadError("You do not have access to this schedule.");
          return;
        }

        const detail =
          error?.payload?.detail ??
          error?.payload?.message ??
          error?.message ??
          "We couldn’t load your schedule right now. You can still create a new one.";
        setScheduleLoadError(detail);
        setScheduleLoadStatus("error");
        setInitialSchedule(null);
      }
    };

    fetchSchedule();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch]);

  const isScheduleLoading = scheduleLoadStatus === "loading";

  const handleSubmit = useCallback(
    async (payload) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await authenticatedFetch.requestJson(
          "/users/me/freelancer/schedules/",
          {
            method: "POST",
            body: JSON.stringify({ schedules: payload }),
          }
        );

        const schedulesFromResponse = Array.isArray(response?.schedules)
          ? response.schedules
          : Array.isArray(response)
          ? response
          : null;

        setInitialSchedule(schedulesFromResponse ?? payload);
        setScheduleLoadStatus("ready");

        toast?.success?.({
          title: "Schedule saved",
          message: "Your availability has been updated.",
        });
        navigate("/dashboard/freelancer", { replace: true });
      } catch (error) {
        const detail =
          error?.payload?.detail ??
          error?.payload?.message ??
          error?.message ??
          "Unable to save your schedule. Please try again.";
        toast?.error?.({
          title: "Schedule not saved",
          message: detail,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      authenticatedFetch,
      isSubmitting,
      navigate,
      toast,
    ]
  );

  return (
    <section className="page freelancer-schedule-page">
      <header className="page-header">
        <h1>Manage your schedule</h1>
        <p className="page-subtitle">
          Set your weekly availability and break times. Changes will be saved to
          your profile when you click save.
        </p>
      </header>

      {isScheduleLoading ? (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.75rem",
          padding: "1.5rem",
          borderRadius: "12px",
          background: "rgba(99, 102, 241, 0.08)",
          color: "#4f46e5"
        }}>
          <span style={{
            width: "1.25rem",
            height: "1.25rem",
            border: "2px solid rgba(99, 102, 241, 0.3)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <span style={{ fontWeight: 500 }}>Loading your saved schedule...</span>
        </div>
      ) : (
        <>
          {scheduleLoadError && (
            <p className="notice error" role="alert">
              {scheduleLoadError}
            </p>
          )}
          <FreelancerScheduleForm
            onSubmit={handleSubmit}
            initialSchedule={initialSchedule}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </section>
  );
};

const FreelancerSchedulePageWithAuth = withFreelancerAuth(
  FreelancerSchedulePage
);

FreelancerSchedulePageWithAuth.displayName =
  "FreelancerSchedulePageWithAuth";

export default FreelancerSchedulePageWithAuth;


