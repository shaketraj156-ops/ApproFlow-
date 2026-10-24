/**
 * Formats day offsets into user-friendly SLA strings.
 * e.g., "5 days left", "1 day left", "Due today", "3 days overdue".
 */
export function formatDays(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return 'No deadline';
  
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return '1 day left';
  if (daysLeft === 0) return 'Due today';
  
  const overdue = Math.abs(daysLeft);
  return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
}
