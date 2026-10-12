/** How far behind the device clock a timestamp is kept, so a slightly fast clock is never "in the future". */
const CLOCK_MARGIN_MS = 5 * 60_000;

/**
 * The instant to send as `recordedAt` for a result taken on `takenOn` ("YYYY-MM-DD", local).
 *
 * It is the chosen day plus the current time of day, which keeps the values of one
 * submission together. The backend rejects a `recordedAt` that is ahead of its own clock,
 * and a device clock only a few seconds fast is enough to hit that when the day is today,
 * so the time is held a few minutes back, but never before the start of the chosen day.
 */
export function recordedAtFor(takenOn: string, now: Date = new Date()): string {
  const [y, m, d] = takenOn.split('-').map(Number);
  const dayStart = new Date(y!, m! - 1, d!);
  const sameTimeThatDay = new Date(
    y!, m! - 1, d!, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds(),
  );
  const latestSafe = new Date(Math.max(dayStart.getTime(), now.getTime() - CLOCK_MARGIN_MS));
  return new Date(Math.min(sameTimeThatDay.getTime(), latestSafe.getTime())).toISOString();
}
