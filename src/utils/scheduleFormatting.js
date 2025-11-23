const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const toTwoDigits = (value) => value.toString().padStart(2, "0");

const normaliseTimePart = (value) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
};

const normaliseTimeString = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const [hours, minutes] = trimmed.split(":");
  const parsedHours = normaliseTimePart(hours);
  const parsedMinutes = normaliseTimePart(minutes);
  if (
    parsedHours == null ||
    parsedMinutes == null ||
    parsedHours < 0 ||
    parsedHours > 23 ||
    parsedMinutes < 0 ||
    parsedMinutes > 59
  ) {
    return null;
  }
  return `${toTwoDigits(parsedHours)}:${toTwoDigits(parsedMinutes)}`;
};

const formatTimeLabel = (value) => {
  const normalised = normaliseTimeString(value);
  if (!normalised) {
    return null;
  }
  const [hours, minutes] = normalised.split(":").map((part) => Number.parseInt(part, 10));
  const suffix = hours >= 12 ? "PM" : "AM";
  const hourOn12HourClock = hours % 12 === 0 ? 12 : hours % 12;
  return `${hourOn12HourClock}:${minutes.toString().padStart(2, "0")} ${suffix}`;
};

export const getDayLabel = (dayOfWeek) => {
  const index = Number.parseInt(dayOfWeek, 10);
  if (!Number.isFinite(index) || index < 0 || index > 6) {
    return null;
  }
  return DAY_LABELS[index];
};

export const formatTimeRangeLabel = (startTime, endTime) => {
  const startLabel = formatTimeLabel(startTime);
  const endLabel = formatTimeLabel(endTime);

  if (startLabel && endLabel) {
    return `${startLabel} – ${endLabel}`;
  }
  if (startLabel) {
    return `${startLabel} onwards`;
  }
  if (endLabel) {
    return `Until ${endLabel}`;
  }
  return null;
};

export const normaliseSchedules = (schedules) => {
  if (!Array.isArray(schedules)) {
    return [];
  }

  return schedules
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const dayOfWeek =
        typeof entry.day_of_week === "number"
          ? entry.day_of_week
          : typeof entry.dayOfWeek === "number"
          ? entry.dayOfWeek
          : typeof entry.day === "number"
          ? entry.day
          : null;

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return null;
      }

      const startTime =
        normaliseTimeString(entry.start_time ?? entry.startTime ?? entry.start) ?? null;
      const endTime = normaliseTimeString(entry.end_time ?? entry.endTime ?? entry.end) ?? null;

      return {
        id: entry.id ?? `schedule-${dayOfWeek}-${index}`,
        dayOfWeek,
        startTime,
        endTime,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      if (a.startTime !== b.startTime) {
        if (a.startTime == null) {
          return 1;
        }
        if (b.startTime == null) {
          return -1;
        }
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
};

export const formatSchedulesForDisplay = (schedules) =>
  normaliseSchedules(schedules).map((entry, index) => ({
    ...entry,
    key: `${entry.id ?? `schedule-${index}`}`,
    dayLabel: getDayLabel(entry.dayOfWeek) ?? "Unknown day",
    timeRangeLabel: formatTimeRangeLabel(entry.startTime, entry.endTime) ?? "All day",
  }));

