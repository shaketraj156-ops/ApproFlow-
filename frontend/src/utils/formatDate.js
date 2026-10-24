/**
 * Formats ISO date or Date object strictly in Indian Standard Time (IST).
 */
export function formatDate(dateInput, includeTime = true) {
  if (!dateInput) return '—';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const options = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  };

  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatDateOnly(dateInput) {
  return formatDate(dateInput, false);
}
