const IST = 'Asia/Kolkata';

// en-CA formats as YYYY-MM-DD, which is easy to turn into a whole-day difference.
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' });

function istDayNumber(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const [y, m, d] = dayFormatter.format(date).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

/**
 * Whole calendar days from today to the given date, counted in IST.
 * Negative when the date has passed, 0 for today, null when there is no usable date.
 * Works for date-only strings from the API ("2026-11-10") and full ISO timestamps.
 */
export function daysUntil(dateInput, now = new Date()) {
  if (!dateInput) return null;
  const target = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? Date.UTC(...dateInput.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) / 86400000
    : istDayNumber(dateInput);
  const today = istDayNumber(now);
  if (target === null || today === null) return null;
  return target - today;
}

/** Display helper for optional numbers: shows a dash instead of "undefined" or "null". */
export function formatCount(value) {
  return value === null || value === undefined ? '—' : String(value);
}

/**
 * The calendar date, as "YYYY-MM-DD", in India. A date-only string is returned unchanged; a full timestamp is
 * read in IST. Visit dates are whole days, so the screen works with this form.
 */
export function istDateString(input) {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return dayFormatter.format(date);
}
