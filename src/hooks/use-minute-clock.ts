import { useEffect, useState } from 'react';

/** A `Date` that refreshes once a minute (aligned to the minute boundary). For "is it expired yet?" style flags. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = new Date();
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 25);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}
