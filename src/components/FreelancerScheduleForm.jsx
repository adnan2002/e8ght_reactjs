import { useEffect, useMemo, useRef, useState } from "react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
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
  if (Array.isArray(initialSchedule) && initialSchedule.length === 7) {
    return initialSchedule.map((day) => ({
      ...createDaySchedule(day.dayOfWeek),
      ...day,
      breaks: Array.isArray(day.breaks)
        ? day.breaks.map((breakPeriod) => ({
            startTime: breakPeriod.startTime ?? "",
            endTime: breakPeriod.endTime ?? "",
          }))
        : [],
    }));
  }

  return DAYS_OF_WEEK.map((day) => createDaySchedule(day.value));
};

const DayScheduleCard = ({
  day,
  onToggle,
  onTimeChange,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
  errors,
}) => {
  return (
    <article className="schedule-card">
      <header className="schedule-card__header">
        <h3>{DAYS_OF_WEEK.find((entry) => entry.value === day.dayOfWeek)?.label}</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={day.isActive}
            onChange={(event) => onToggle(day.dayOfWeek, event.target.checked)}
          />
          <span>Available</span>
        </label>
      </header>

      <div className="schedule-card__body">
        <div className="field">
          <label htmlFor={`day-${day.dayOfWeek}-start`}>Start time</label>
          <input
            id={`day-${day.dayOfWeek}-start`}
            type="time"
            value={day.startTime}
            onChange={(event) =>
              onTimeChange(day.dayOfWeek, "startTime", event.target.value)
            }
            disabled={!day.isActive}
          />
        </div>
        <div className="field">
          <label htmlFor={`day-${day.dayOfWeek}-end`}>End time</label>
          <input
            id={`day-${day.dayOfWeek}-end`}
            type="time"
            value={day.endTime}
            onChange={(event) =>
              onTimeChange(day.dayOfWeek, "endTime", event.target.value)
            }
            disabled={!day.isActive}
          />
        </div>
      </div>
      {errors?.timeRange && <p className="field-error">{errors.timeRange}</p>}

      <section className="schedule-card__breaks">
        <header>
          <h4>Breaks</h4>
          <button
            type="button"
            onClick={() => onAddBreak(day.dayOfWeek)}
            disabled={!day.isActive}
          >
            Add break
          </button>
        </header>

        {day.breaks.length === 0 ? (
          <p className="schedule-card__empty">
            {day.isActive
              ? "No breaks added yet."
              : "Enable availability to add breaks."}
          </p>
        ) : (
          <ul className="break-list">
            {day.breaks.map((breakPeriod, index) => (
              <li key={index}>
                <div className="field">
                  <label htmlFor={`day-${day.dayOfWeek}-break-${index}-start`}>
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
                    disabled={!day.isActive}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`day-${day.dayOfWeek}-break-${index}-end`}>
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
                    disabled={!day.isActive}
                  />
                </div>
                <button
                  type="button"
                  className="break-remove"
                  onClick={() => onRemoveBreak(day.dayOfWeek, index)}
                  disabled={!day.isActive}
                >
                  Remove
                </button>
                {errors?.breaks?.[index]?.range && (
                  <p className="field-error">{errors.breaks[index].range}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
};

const FreelancerScheduleForm = ({ initialSchedule, onSubmit }) => {
  const [schedule, setSchedule] = useState(() =>
    normaliseSchedule(initialSchedule)
  );
  const [errors, setErrors] = useState({});
  const [copyFromDay, setCopyFromDay] = useState(0);
  const [copyToDay, setCopyToDay] = useState(1);
  const [submissionNotice, setSubmissionNotice] = useState(null);
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
      onSubmit(payload);
    } else {
      console.log("Freelancer schedule submission", {
        schedules: payload,
      });
    }
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

  return (
    <section className="freelancer-schedule-form">
      <header>
        <h2>Plan your weekly availability</h2>
        <p>
          Select when you are available to take orders and add breaks for each
          day. Copy schedules between days to save time.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <aside className="schedule-copy">
          <div className="field">
            <label htmlFor="copy-from">Copy from</label>
            <select
              id="copy-from"
              value={copyFromDay}
              onChange={(event) => setCopyFromDay(Number(event.target.value))}
            >
              {DAYS_OF_WEEK.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="copy-to">Copy to</label>
            <select
              id="copy-to"
              value={copyToDay}
              onChange={(event) => setCopyToDay(Number(event.target.value))}
            >
              {DAYS_OF_WEEK.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleCopyDay}>
            Copy schedule
          </button>
          <button type="button" className="btn-ghost" onClick={handleReset}>
            Reset schedule
          </button>
        </aside>

        <div className="schedule-grid">
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

        <footer className="form-footer">
          <button type="submit" className="btn-primary">
            Save schedule
          </button>
          <p className="schedule-summary">
            {activeDayCount > 0
              ? `${activeDayCount} day${activeDayCount === 1 ? "" : "s"} active`
              : "No availability selected yet."}
          </p>
        </footer>
        {submissionNotice && (
          <p className={`notice ${submissionNotice.type}`}>
            {submissionNotice.text}
          </p>
        )}
      </form>
    </section>
  );
};

export default FreelancerScheduleForm;


