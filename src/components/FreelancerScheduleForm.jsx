import { useEffect, useMemo, useRef, useState } from "react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun", icon: "🌅" },
  { value: 1, label: "Monday", short: "Mon", icon: "🌙" },
  { value: 2, label: "Tuesday", short: "Tue", icon: "🔥" },
  { value: 3, label: "Wednesday", short: "Wed", icon: "🌿" },
  { value: 4, label: "Thursday", short: "Thu", icon: "⚡" },
  { value: 5, label: "Friday", short: "Fri", icon: "🎉" },
  { value: 6, label: "Saturday", short: "Sat", icon: "✨" },
];

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

const createEmptyBreak = () => ({
  startTime: "",
  endTime: "",
});

const createDaySchedule = (dayOfWeek) => ({
  dayOfWeek,
  isActive: false,
  startTime: DEFAULT_START_TIME,
  endTime: DEFAULT_END_TIME,
  breaks: [],
});

const cloneDaySchedule = (day, overrides = {}) => ({
  dayOfWeek:
    overrides.dayOfWeek !== undefined ? overrides.dayOfWeek : day.dayOfWeek,
  isActive: overrides.isActive ?? day.isActive,
  startTime: overrides.startTime ?? day.startTime,
  endTime: overrides.endTime ?? day.endTime,
  breaks: (overrides.breaks ?? day.breaks).map((breakPeriod) => ({
    startTime: breakPeriod.startTime,
    endTime: breakPeriod.endTime,
  })),
});

const isTimeRangeValid = (start, end) => {
  if (!start || !end) {
    return false;
  }
  return start < end;
};

const isBreakWithinDay = (breakPeriod, day) => {
  if (!isTimeRangeValid(breakPeriod.startTime, breakPeriod.endTime)) {
    return false;
  }
  if (!isTimeRangeValid(day.startTime, day.endTime)) {
    return false;
  }
  return (
    breakPeriod.startTime >= day.startTime &&
    breakPeriod.endTime <= day.endTime
  );
};

const validateSchedule = (schedule) => {
  const errors = {};
  schedule.forEach((day) => {
    if (!day.isActive) {
      return;
    }

    const dayErrors = {};
    if (!isTimeRangeValid(day.startTime, day.endTime)) {
      dayErrors.timeRange = "Start time must be before end time.";
    }

    const breakErrors = day.breaks.map((breakPeriod) => {
      const breakError = {};
      if (!isTimeRangeValid(breakPeriod.startTime, breakPeriod.endTime)) {
        breakError.range = "Break start time must be before end time.";
      } else if (!isBreakWithinDay(breakPeriod, day)) {
        breakError.range = "Break must be within your availability window.";
      }
      return breakError;
    });

    const hasBreakErrors = breakErrors.some(
      (breakError) => Object.keys(breakError).length > 0
    );

    if (Object.keys(dayErrors).length > 0 || hasBreakErrors) {
      errors[day.dayOfWeek] = {
        ...dayErrors,
        breaks: breakErrors,
      };
    }
  });

  return errors;
};

const createSubmissionPayload = (schedule) =>
  schedule
    .filter((day) => day.isActive)
    .map((day) => ({
      day_of_week: day.dayOfWeek,
      start_time: day.startTime,
      end_time: day.endTime,
      breaks: day.breaks
        .filter((breakPeriod) =>
          isTimeRangeValid(breakPeriod.startTime, breakPeriod.endTime)
        )
        .map((breakPeriod) => ({
          start_time: breakPeriod.startTime,
          end_time: breakPeriod.endTime,
        })),
    }));

const normaliseSchedule = (initialSchedule) => {
  const scheduleEntries = Array.isArray(initialSchedule)
    ? initialSchedule
    : Array.isArray(initialSchedule?.schedules)
    ? initialSchedule.schedules
    : null;

  if (!scheduleEntries || scheduleEntries.length === 0) {
    return DAYS_OF_WEEK.map((day) => createDaySchedule(day.value));
  }

  const toBreakPeriod = (breakPeriod) => ({
    startTime:
      breakPeriod?.startTime ??
      breakPeriod?.start_time ??
      breakPeriod?.start ??
      "",
    endTime:
      breakPeriod?.endTime ??
      breakPeriod?.end_time ??
      breakPeriod?.end ??
      "",
  });

  const inferIsActive = (day) => {
    if (day.isActive !== undefined) {
      return Boolean(day.isActive);
    }
    if (day.is_active !== undefined) {
      return Boolean(day.is_active);
    }
    if (
      day.startTime ||
      day.start_time ||
      day.endTime ||
      day.end_time ||
      (Array.isArray(day.breaks) && day.breaks.length > 0)
    ) {
      return true;
    }
    return false;
  };

  const toScheduleEntry = (day) => {
    if (!day || typeof day !== "object") {
      return null;
    }

    const dayOfWeek =
      typeof day.dayOfWeek === "number"
        ? day.dayOfWeek
        : typeof day.day_of_week === "number"
        ? day.day_of_week
        : typeof day.day === "number"
        ? day.day
        : null;

    if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
      return null;
    }

    return {
      dayOfWeek,
      isActive: inferIsActive(day),
      startTime:
        day.startTime ??
        day.start_time ??
        day.start ??
        DEFAULT_START_TIME,
      endTime:
        day.endTime ??
        day.end_time ??
        day.end ??
        DEFAULT_END_TIME,
      breaks: Array.isArray(day.breaks)
        ? day.breaks.map(toBreakPeriod)
        : [],
    };
  };

  const scheduleByDay = new Map();

  scheduleEntries.forEach((entry) => {
    const normalisedEntry = toScheduleEntry(entry);
    if (normalisedEntry) {
      scheduleByDay.set(normalisedEntry.dayOfWeek, normalisedEntry);
    }
  });

  if (scheduleByDay.size === 0) {
    return DAYS_OF_WEEK.map((day) => createDaySchedule(day.value));
  }

  return DAYS_OF_WEEK.map((day) => {
    const base = createDaySchedule(day.value);
    const override = scheduleByDay.get(day.value);
    if (!override) {
      return base;
    }
    return {
      ...base,
      ...override,
      isActive:
        override.isActive !== undefined ? override.isActive : true,
      breaks: Array.isArray(override.breaks)
        ? override.breaks.map((breakPeriod) => ({
            startTime: breakPeriod.startTime ?? "",
            endTime: breakPeriod.endTime ?? "",
          }))
        : [],
    };
  });
};

const styles = {
  container: {
    display: "grid",
    gap: "2rem",
  },
  hero: {
    position: "relative",
    padding: "2rem 2.25rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #fae8ff 100%)",
    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.12)",
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    top: "-30%",
    right: "-10%",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background: "rgba(99, 102, 241, 0.15)",
    filter: "blur(40px)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: "-20%",
    left: "10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "rgba(236, 72, 153, 0.12)",
    filter: "blur(30px)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: "0.75rem",
  },
  heroEyebrow: {
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#4f46e5",
  },
  heroTitle: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#3730a3",
    opacity: 0.85,
    maxWidth: "500px",
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "1rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1.25rem",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  statIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    fontSize: "1.1rem",
  },
  statContent: {
    display: "grid",
    gap: "0.1rem",
  },
  statValue: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#1e1b4b",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  form: {
    display: "grid",
    gap: "1.5rem",
  },
  copySection: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "1rem",
    padding: "1.25rem 1.5rem",
    borderRadius: "16px",
    background: "linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(248, 250, 252, 0.9) 100%)",
    border: "1px dashed rgba(148, 163, 184, 0.4)",
  },
  copyTitle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
    marginBottom: "0.25rem",
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#475569",
  },
  copyField: {
    display: "grid",
    gap: "0.4rem",
    minWidth: "140px",
  },
  copyLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#64748b",
  },
  copySelect: {
    padding: "0.65rem 1rem",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "white",
    fontSize: "0.9rem",
    color: "#1e293b",
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.75rem center",
    paddingRight: "2rem",
  },
  copyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.65rem 1rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    boxShadow: "0 6px 16px rgba(99, 102, 241, 0.3)",
  },
  resetBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.65rem 1rem",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "white",
    color: "#64748b",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  scheduleGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  },
  dayCard: {
    position: "relative",
    padding: "1.5rem",
    borderRadius: "18px",
    background: "white",
    border: "1.5px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    transition: "all 250ms ease",
    animation: "slideIn 0.3s ease-out",
  },
  dayCardActive: {
    borderColor: "rgba(99, 102, 241, 0.4)",
    boxShadow: "0 12px 32px rgba(99, 102, 241, 0.12)",
  },
  dayCardInactive: {
    opacity: 0.7,
    background: "rgba(248, 250, 252, 0.8)",
  },
  dayCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.25rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  },
  dayInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  dayIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
    fontSize: "1.25rem",
  },
  dayIconActive: {
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    boxShadow: "0 6px 16px rgba(99, 102, 241, 0.35)",
  },
  dayName: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1e293b",
  },
  dayStatus: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    fontWeight: 500,
  },
  dayStatusActive: {
    color: "#22c55e",
  },
  toggleSwitch: {
    position: "relative",
    width: "52px",
    height: "28px",
    cursor: "pointer",
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "999px",
    background: "#e2e8f0",
    transition: "all 200ms ease",
  },
  toggleSliderActive: {
    background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
  },
  toggleKnob: {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    background: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    transition: "all 200ms ease",
  },
  toggleKnobActive: {
    transform: "translateX(24px)",
  },
  timeRow: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "1fr 1fr",
    marginBottom: "1.25rem",
  },
  timeField: {
    display: "grid",
    gap: "0.4rem",
  },
  timeLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#64748b",
  },
  timeInput: {
    padding: "0.7rem 0.85rem",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "#fafafa",
    fontSize: "0.9rem",
    color: "#1e293b",
    outline: "none",
    transition: "all 180ms ease",
  },
  timeInputFocus: {
    borderColor: "#8b5cf6",
    background: "white",
    boxShadow: "0 0 0 3px rgba(139, 92, 246, 0.1)",
  },
  timeInputDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  breaksSection: {
    padding: "1rem",
    borderRadius: "12px",
    background: "rgba(241, 245, 249, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
  },
  breaksHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  },
  breaksTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    margin: 0,
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#475569",
  },
  addBreakBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.45rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    background: "rgba(99, 102, 241, 0.08)",
    color: "#6366f1",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  addBreakBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  breakEmpty: {
    margin: 0,
    padding: "0.75rem",
    textAlign: "center",
    fontSize: "0.85rem",
    color: "#94a3b8",
    fontStyle: "italic",
  },
  breakList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: "0.75rem",
  },
  breakItem: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "0.75rem",
    padding: "0.85rem",
    borderRadius: "10px",
    background: "white",
    border: "1px solid rgba(148, 163, 184, 0.15)",
  },
  breakField: {
    display: "grid",
    gap: "0.3rem",
    flex: "1 1 80px",
    minWidth: "80px",
  },
  breakLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94a3b8",
  },
  breakInput: {
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1.5px solid #e2e8f0",
    background: "#fafafa",
    fontSize: "0.85rem",
    color: "#1e293b",
    outline: "none",
    transition: "all 180ms ease",
  },
  breakRemoveBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    background: "rgba(254, 226, 226, 0.5)",
    color: "#dc2626",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 180ms ease",
  },
  breakRemoveBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  fieldError: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.75rem",
    color: "#dc2626",
    fontWeight: 500,
    marginTop: "0.25rem",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1.5rem 0",
    borderTop: "1px solid rgba(148, 163, 184, 0.2)",
  },
  footerSummary: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: "#64748b",
    fontSize: "0.9rem",
  },
  summaryDots: {
    display: "flex",
    gap: "0.35rem",
  },
  summaryDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#e2e8f0",
    transition: "all 200ms ease",
  },
  summaryDotActive: {
    background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
    boxShadow: "0 2px 6px rgba(34, 197, 94, 0.4)",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.9rem 2rem",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "white",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.35)",
    transition: "all 200ms ease",
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderRadius: "12px",
    animation: "slideIn 0.3s ease-out",
  },
  noticeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "50%",
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  noticeText: {
    margin: 0,
    fontWeight: 500,
    fontSize: "0.9rem",
  },
  noticeSuccess: {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    border: "1px solid #86efac",
  },
  noticeSuccessIcon: {
    background: "#22c55e",
    color: "white",
  },
  noticeSuccessText: {
    color: "#166534",
  },
  noticeError: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    border: "1px solid #fca5a5",
  },
  noticeErrorIcon: {
    background: "#ef4444",
    color: "white",
  },
  noticeErrorText: {
    color: "#991b1b",
  },
  noticeInfo: {
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    border: "1px solid #93c5fd",
  },
  noticeInfoIcon: {
    background: "#3b82f6",
    color: "white",
  },
  noticeInfoText: {
    color: "#1e40af",
  },
};

const keyframes = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <label style={styles.toggleSwitch}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      style={styles.toggleInput}
    />
    <span
      style={{
        ...styles.toggleSlider,
        ...(checked ? styles.toggleSliderActive : {}),
      }}
    />
    <span
      style={{
        ...styles.toggleKnob,
        ...(checked ? styles.toggleKnobActive : {}),
      }}
    />
  </label>
);

const DayScheduleCard = ({
  day,
  onToggle,
  onTimeChange,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
  errors,
}) => {
  const [focusedField, setFocusedField] = useState(null);
  const dayInfo = DAYS_OF_WEEK.find((entry) => entry.value === day.dayOfWeek);

  const getTimeInputStyle = (fieldName) => ({
    ...styles.timeInput,
    ...(focusedField === fieldName ? styles.timeInputFocus : {}),
    ...(!day.isActive ? styles.timeInputDisabled : {}),
  });

  return (
    <article
      style={{
        ...styles.dayCard,
        ...(day.isActive ? styles.dayCardActive : styles.dayCardInactive),
      }}
    >
      <header style={styles.dayCardHeader}>
        <div style={styles.dayInfo}>
          <span
            style={{
              ...styles.dayIcon,
              ...(day.isActive ? styles.dayIconActive : {}),
            }}
          >
            {day.isActive ? "✓" : dayInfo?.icon}
          </span>
          <div>
            <h3 style={styles.dayName}>{dayInfo?.label}</h3>
            <span
              style={{
                ...styles.dayStatus,
                ...(day.isActive ? styles.dayStatusActive : {}),
              }}
            >
              {day.isActive ? "Available" : "Day off"}
            </span>
          </div>
        </div>
        <ToggleSwitch
          checked={day.isActive}
          onChange={(event) => onToggle(day.dayOfWeek, event.target.checked)}
        />
      </header>

      <div style={styles.timeRow}>
        <div style={styles.timeField}>
          <label style={styles.timeLabel} htmlFor={`day-${day.dayOfWeek}-start`}>
            <span>🌅</span> Start
          </label>
          <input
            id={`day-${day.dayOfWeek}-start`}
            type="time"
            value={day.startTime}
            onChange={(event) =>
              onTimeChange(day.dayOfWeek, "startTime", event.target.value)
            }
            onFocus={() => setFocusedField("start")}
            onBlur={() => setFocusedField(null)}
            style={getTimeInputStyle("start")}
            disabled={!day.isActive}
          />
        </div>
        <div style={styles.timeField}>
          <label style={styles.timeLabel} htmlFor={`day-${day.dayOfWeek}-end`}>
            <span>🌙</span> End
          </label>
          <input
            id={`day-${day.dayOfWeek}-end`}
            type="time"
            value={day.endTime}
            onChange={(event) =>
              onTimeChange(day.dayOfWeek, "endTime", event.target.value)
            }
            onFocus={() => setFocusedField("end")}
            onBlur={() => setFocusedField(null)}
            style={getTimeInputStyle("end")}
            disabled={!day.isActive}
          />
        </div>
      </div>
      {errors?.timeRange && (
        <p style={styles.fieldError}>
          <span>⚠️</span> {errors.timeRange}
        </p>
      )}

      <section style={styles.breaksSection}>
        <header style={styles.breaksHeader}>
          <h4 style={styles.breaksTitle}>
            <span>☕</span> Breaks
          </h4>
          <button
            type="button"
            onClick={() => onAddBreak(day.dayOfWeek)}
            disabled={!day.isActive}
            style={{
              ...styles.addBreakBtn,
              ...(!day.isActive ? styles.addBreakBtnDisabled : {}),
            }}
          >
            <span>+</span> Add
          </button>
        </header>

        {day.breaks.length === 0 ? (
          <p style={styles.breakEmpty}>
            {day.isActive
              ? "No breaks scheduled"
              : "Enable day to add breaks"}
          </p>
        ) : (
          <ul style={styles.breakList}>
            {day.breaks.map((breakPeriod, index) => (
              <li key={index} style={styles.breakItem}>
                <div style={styles.breakField}>
                  <label
                    style={styles.breakLabel}
                    htmlFor={`day-${day.dayOfWeek}-break-${index}-start`}
                  >
                    From
                  </label>
                  <input
                    id={`day-${day.dayOfWeek}-break-${index}-start`}
                    type="time"
                    value={breakPeriod.startTime}
                    onChange={(event) =>
                      onBreakChange(
                        day.dayOfWeek,
                        index,
                        "startTime",
                        event.target.value
                      )
                    }
                    style={styles.breakInput}
                    disabled={!day.isActive}
                  />
                </div>
                <div style={styles.breakField}>
                  <label
                    style={styles.breakLabel}
                    htmlFor={`day-${day.dayOfWeek}-break-${index}-end`}
                  >
                    To
                  </label>
                  <input
                    id={`day-${day.dayOfWeek}-break-${index}-end`}
                    type="time"
                    value={breakPeriod.endTime}
                    onChange={(event) =>
                      onBreakChange(
                        day.dayOfWeek,
                        index,
                        "endTime",
                        event.target.value
                      )
                    }
                    style={styles.breakInput}
                    disabled={!day.isActive}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveBreak(day.dayOfWeek, index)}
                  disabled={!day.isActive}
                  style={{
                    ...styles.breakRemoveBtn,
                    ...(!day.isActive ? styles.breakRemoveBtnDisabled : {}),
                  }}
                  title="Remove break"
                >
                  ✕
                </button>
                {errors?.breaks?.[index]?.range && (
                  <p style={{ ...styles.fieldError, width: "100%" }}>
                    <span>⚠️</span> {errors.breaks[index].range}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
};

const FreelancerScheduleForm = ({
  initialSchedule,
  onSubmit,
  isSubmitting = false,
}) => {
  const [schedule, setSchedule] = useState(() =>
    normaliseSchedule(initialSchedule)
  );
  const [errors, setErrors] = useState({});
  const [copyFromDay, setCopyFromDay] = useState(0);
  const [copyToDay, setCopyToDay] = useState(1);
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const baselineScheduleRef = useRef(normaliseSchedule(initialSchedule));

  useEffect(() => {
    const next = normaliseSchedule(initialSchedule);
    baselineScheduleRef.current = next;
    setSchedule(next);
    setErrors({});
    setSubmissionNotice(null);
  }, [initialSchedule]);

  const activeDayCount = useMemo(
    () => schedule.filter((day) => day.isActive).length,
    [schedule]
  );

  const totalBreaks = useMemo(
    () =>
      schedule.reduce(
        (sum, day) => sum + (day.isActive ? day.breaks.length : 0),
        0
      ),
    [schedule]
  );

  const handleToggleDay = (dayOfWeek, isActive) => {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              isActive,
              breaks: isActive ? day.breaks : [],
            }
          : day
      )
    );
    setErrors((previous) => {
      if (!previous[dayOfWeek]) {
        return previous;
      }
      const next = { ...previous };
      delete next[dayOfWeek];
      return next;
    });
  };

  const handleTimeChange = (dayOfWeek, field, value) => {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
    setErrors((previous) => {
      const dayErrors = previous[dayOfWeek];
      if (!dayErrors) {
        return previous;
      }
      const hasBreakErrors =
        Array.isArray(dayErrors.breaks) &&
        dayErrors.breaks.some(
          (breakError) => breakError && Object.keys(breakError).length > 0
        );
      if (hasBreakErrors) {
        return previous;
      }
      const next = { ...previous };
      delete next[dayOfWeek];
      return next;
    });
  };

  const handleAddBreak = (dayOfWeek) => {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breaks: [...day.breaks, createEmptyBreak()],
            }
          : day
      )
    );
  };

  const handleRemoveBreak = (dayOfWeek, breakIndex) => {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breaks: day.breaks.filter((_, index) => index !== breakIndex),
            }
          : day
      )
    );
    setErrors((previous) => {
      const dayErrors = previous[dayOfWeek];
      if (!dayErrors) {
        return previous;
      }
      if (!Array.isArray(dayErrors.breaks)) {
        const next = { ...previous };
        delete next[dayOfWeek];
        return next;
      }
      const nextBreakErrors = dayErrors.breaks.filter(
        (_, index) => index !== breakIndex
      );
      const hasRemainingBreakErrors = nextBreakErrors.some(
        (breakError) => Object.keys(breakError).length > 0
      );
      const next = { ...previous };
      if (!dayErrors.timeRange && !hasRemainingBreakErrors) {
        delete next[dayOfWeek];
      } else {
        next[dayOfWeek] = {
          ...dayErrors,
          breaks: nextBreakErrors,
        };
      }
      return next;
    });
  };

  const handleBreakChange = (dayOfWeek, index, field, value) => {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breaks: day.breaks.map((breakPeriod, breakIndex) =>
                breakIndex === index
                  ? {
                      ...breakPeriod,
                      [field]: value,
                    }
                  : breakPeriod
              ),
            }
          : day
      )
    );
    setErrors((previous) => {
      const dayErrors = previous[dayOfWeek];
      if (!dayErrors || !Array.isArray(dayErrors.breaks)) {
        return previous;
      }
      const nextBreakErrors = dayErrors.breaks.map((breakError, breakIndex) =>
        breakIndex === index ? {} : breakError
      );
      const hasDayErrors =
        (dayErrors.timeRange && dayErrors.timeRange.length > 0) ||
        nextBreakErrors.some(
          (breakError) => breakError && Object.keys(breakError).length > 0
        );
      if (!hasDayErrors) {
        const next = { ...previous };
        delete next[dayOfWeek];
        return next;
      }
      return {
        ...previous,
        [dayOfWeek]: {
          ...dayErrors,
          breaks: nextBreakErrors,
        },
      };
    });
  };

  const handleCopyDay = () => {
    if (copyFromDay === copyToDay) {
      setSubmissionNotice({
        type: "error",
        text: "Select two different days to copy.",
      });
      return;
    }
    const sourceDay = schedule.find((day) => day.dayOfWeek === copyFromDay);
    if (!sourceDay) {
      setSubmissionNotice({
        type: "error",
        text: "Pick a valid source day.",
      });
      return;
    }
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === copyToDay
          ? cloneDaySchedule(sourceDay, { dayOfWeek: copyToDay })
          : day
      )
    );
    setErrors((previous) => {
      if (!previous[copyToDay]) {
        return previous;
      }
      const next = { ...previous };
      delete next[copyToDay];
      return next;
    });
    setSubmissionNotice({
      type: "success",
      text: `Copied ${
        DAYS_OF_WEEK.find((entry) => entry.value === copyFromDay)?.label
      } to ${
        DAYS_OF_WEEK.find((entry) => entry.value === copyToDay)?.label
      }.`,
    });
  };

  const handleReset = () => {
    setSchedule(
      baselineScheduleRef.current.map((day) =>
        cloneDaySchedule(day, { dayOfWeek: day.dayOfWeek })
      )
    );
    setErrors({});
    setSubmissionNotice(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setSubmissionNotice(null);
    const validationErrors = validateSchedule(schedule);
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      setErrors(validationErrors);
      setSubmissionNotice({
        type: "error",
        text: "Please fix the highlighted errors.",
      });
      return;
    }
    setErrors({});

    const payload = createSubmissionPayload(schedule);
    if (onSubmit) {
      try {
        const maybePromise = onSubmit(payload);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.catch((error) => {
            console.warn(
              "[FreelancerScheduleForm] onSubmit promise rejected",
              error
            );
          });
        }
      } catch (error) {
        console.warn("[FreelancerScheduleForm] onSubmit threw", error);
      }
      return;
    }

    console.log("Freelancer schedule submission", {
      schedules: payload,
    });
    setSubmissionNotice(
      payload.length > 0
        ? {
            type: "success",
            text: "Schedule saved locally. Check the console for the payload.",
          }
        : {
            type: "info",
            text: "No days selected. Nothing to submit.",
          }
    );
  };

  const getNoticeStyles = (type) => {
    const base = { ...styles.notice };
    const iconBase = { ...styles.noticeIcon };
    const textBase = { ...styles.noticeText };

    switch (type) {
      case "success":
        return {
          container: { ...base, ...styles.noticeSuccess },
          icon: { ...iconBase, ...styles.noticeSuccessIcon },
          text: { ...textBase, ...styles.noticeSuccessText },
          iconChar: "✓",
        };
      case "error":
        return {
          container: { ...base, ...styles.noticeError },
          icon: { ...iconBase, ...styles.noticeErrorIcon },
          text: { ...textBase, ...styles.noticeErrorText },
          iconChar: "!",
        };
      case "info":
      default:
        return {
          container: { ...base, ...styles.noticeInfo },
          icon: { ...iconBase, ...styles.noticeInfoIcon },
          text: { ...textBase, ...styles.noticeInfoText },
          iconChar: "i",
        };
    }
  };

  return (
    <>
      <style>{keyframes}</style>
      <section style={styles.container}>
        <header style={styles.hero}>
          <div style={styles.heroDecor} />
          <div style={styles.heroDecor2} />
          <div style={styles.heroContent}>
            <span style={styles.heroEyebrow}>📅 Weekly Schedule</span>
            <h2 style={styles.heroTitle}>Plan your availability</h2>
            <p style={styles.heroSubtitle}>
              Set your working hours for each day. Add breaks when needed, and
              use the copy feature to quickly duplicate schedules.
            </p>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <span style={styles.statIcon}>📆</span>
                <div style={styles.statContent}>
                  <span style={styles.statValue}>{activeDayCount}/7</span>
                  <span style={styles.statLabel}>Days Active</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statIcon}>☕</span>
                <div style={styles.statContent}>
                  <span style={styles.statValue}>{totalBreaks}</span>
                  <span style={styles.statLabel}>Total Breaks</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} style={styles.form}>
          <aside style={styles.copySection}>
            <h4 style={styles.copyTitle}>
              <span>📋</span> Quick Copy
            </h4>
            <div style={styles.copyField}>
              <label style={styles.copyLabel} htmlFor="copy-from">
                From
              </label>
              <select
                id="copy-from"
                value={copyFromDay}
                onChange={(event) => setCopyFromDay(Number(event.target.value))}
                style={styles.copySelect}
              >
                {DAYS_OF_WEEK.map(({ value, label, icon }) => (
                  <option key={value} value={value}>
                    {icon} {label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.copyField}>
              <label style={styles.copyLabel} htmlFor="copy-to">
                To
              </label>
              <select
                id="copy-to"
                value={copyToDay}
                onChange={(event) => setCopyToDay(Number(event.target.value))}
                style={styles.copySelect}
              >
                {DAYS_OF_WEEK.map(({ value, label, icon }) => (
                  <option key={value} value={value}>
                    {icon} {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCopyDay}
              onMouseEnter={() => setHoveredBtn("copy")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...styles.copyBtn,
                ...(hoveredBtn === "copy"
                  ? { transform: "translateY(-2px)", boxShadow: "0 8px 20px rgba(99, 102, 241, 0.4)" }
                  : {}),
              }}
            >
              <span>→</span> Copy
            </button>
            <button
              type="button"
              onClick={handleReset}
              onMouseEnter={() => setHoveredBtn("reset")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...styles.resetBtn,
                ...(hoveredBtn === "reset"
                  ? { borderColor: "#94a3b8", color: "#475569" }
                  : {}),
              }}
            >
              <span>↺</span> Reset
            </button>
          </aside>

          {submissionNotice && (() => {
            const noticeStyles = getNoticeStyles(submissionNotice.type);
            return (
              <div style={noticeStyles.container}>
                <span style={noticeStyles.icon}>{noticeStyles.iconChar}</span>
                <p style={noticeStyles.text}>{submissionNotice.text}</p>
              </div>
            );
          })()}

          <div style={styles.scheduleGrid}>
            {schedule.map((day) => (
              <DayScheduleCard
                key={day.dayOfWeek}
                day={day}
                onToggle={handleToggleDay}
                onTimeChange={handleTimeChange}
                onAddBreak={handleAddBreak}
                onRemoveBreak={handleRemoveBreak}
                onBreakChange={handleBreakChange}
                errors={errors[day.dayOfWeek]}
              />
            ))}
          </div>

          <footer style={styles.footer}>
            <div style={styles.footerSummary}>
              <div style={styles.summaryDots}>
                {DAYS_OF_WEEK.map((day) => (
                  <span
                    key={day.value}
                    style={{
                      ...styles.summaryDot,
                      ...(schedule.find((s) => s.dayOfWeek === day.value)?.isActive
                        ? styles.summaryDotActive
                        : {}),
                    }}
                    title={day.label}
                  />
                ))}
              </div>
              <span>
                {activeDayCount > 0
                  ? `${activeDayCount} day${activeDayCount === 1 ? "" : "s"} available`
                  : "No availability set"}
              </span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              onMouseEnter={() => setHoveredBtn("submit")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                ...styles.submitBtn,
                ...(hoveredBtn === "submit" && !isSubmitting
                  ? { transform: "translateY(-2px)", boxShadow: "0 16px 32px rgba(99, 102, 241, 0.4)" }
                  : {}),
                ...(isSubmitting ? styles.submitBtnDisabled : {}),
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={styles.spinner} />
                  Saving...
                </>
              ) : (
                <>
                  Save Schedule
                  <span>→</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </>
  );
};

export default FreelancerScheduleForm;


