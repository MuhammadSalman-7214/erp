import { format, isValid, parseISO } from "date-fns";

const DATE_FORMAT = "dd-MM-yyyy";
const DATETIME_FORMAT = "dd-MM-yyyy HH:mm";

export const toDateObject = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return isValid(date) ? date : null;
  }

  const parsed = parseISO(raw);
  if (isValid(parsed)) return parsed;

  const fallback = new Date(raw);
  return isValid(fallback) ? fallback : null;
};

export const getDateTimestamp = (value) => {
  const date = toDateObject(value);
  return date ? date.getTime() : 0;
};

export const formatDateLabel = (value, fallback = "-") => {
  const date = toDateObject(value);
  return date ? format(date, DATE_FORMAT) : fallback;
};

export const formatDateTimeLabel = (value, fallback = "-") => {
  const date = toDateObject(value);
  return date ? format(date, DATETIME_FORMAT) : fallback;
};

export const formatInputDateValue = (value) => {
  const date = toDateObject(value);
  return date ? format(date, "yyyy-MM-dd") : "";
};

export const sortByDateValue = (items = [], accessor, direction = "asc") => {
  const sortMultiplier = direction === "desc" ? -1 : 1;

  return [...items].sort((a, b) => {
    const aTime = getDateTimestamp(
      typeof accessor === "function" ? accessor(a) : a?.[accessor],
    );
    const bTime = getDateTimestamp(
      typeof accessor === "function" ? accessor(b) : b?.[accessor],
    );

    if (aTime !== bTime) {
      return (aTime - bTime) * sortMultiplier;
    }

    return 0;
  });
};
