import { useEffect, useState } from 'react';

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Good morning" etc. Re-evaluated once a minute (the patient home re-renders every second for this). */
export function useGreeting(): string {
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()));
  useEffect(() => {
    const id = setInterval(() => setGreeting(greetingFor(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}
