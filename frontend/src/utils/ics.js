// Builds a calendar file (.ics) for an EVC visit, so an officer can add it to their own calendar.

const escapeText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const compact = (isoDate) => isoDate.replace(/-/g, '');

/** The day after an ISO date, because an all-day event ends on the following date in iCalendar. */
function nextDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/** Lines longer than 75 characters must be folded, as the iCalendar format requires. */
function fold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/**
 * `visit` needs `id`, `scheduled_date` ("YYYY-MM-DD"), and may have `institution_name`, `application_number`,
 * `remarks`, `region` and `experts: [{ name, is_lead }]`.
 */
export function buildVisitIcs(visit, now = new Date()) {
  const day = visit.scheduled_date;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const committee = (visit.experts || []).map((e) => `${e.name}${e.is_lead ? ' (lead)' : ''}`).join(', ');
  const description = [
    visit.application_number && `Application ${visit.application_number}`,
    visit.region && `${visit.region} region`,
    committee && `Committee: ${committee}`,
    visit.remarks,
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Valid8//EVC Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:evc-${visit.id}@valid8`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(day)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(day))}`,
    `SUMMARY:${escapeText(`EVC visit: ${visit.institution_name || visit.application_number || 'institution'}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Starts a download of the calendar file in the browser. */
export function downloadVisitIcs(visit) {
  const blob = new Blob([buildVisitIcs(visit)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evc-visit-${visit.application_number || visit.id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
