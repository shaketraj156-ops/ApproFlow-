/**
 * Splits open applications into "on track", "due soon" and "overdue" from the counts the server already
 * provides. Nothing here looks at dates: the server decides what is overdue and what is due this week.
 */
export function healthSegments({ open = 0, overdue = 0, dueSoon = 0 } = {}) {
  const total = Math.max(0, open);
  const late = Math.min(Math.max(0, overdue), total);
  const soon = Math.min(Math.max(0, dueSoon), total - late);
  const onTrack = total - late - soon;
  return {
    total,
    onTrack,
    dueSoon: soon,
    overdue: late,
    percentOnTrack: total === 0 ? 100 : Math.round((onTrack / total) * 100),
  };
}
