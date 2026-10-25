import { useEffect, useState } from 'react';

const format = (date) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);

/** The current time in India as text such as "6:11 pm". Updates every 20 seconds. */
export function useClock() {
  const [time, setTime] = useState(() => format(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(format(new Date())), 20000);
    return () => clearInterval(id);
  }, []);
  return time;
}
