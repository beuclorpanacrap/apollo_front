import { describe, expect, it } from '@jest/globals';

import { recordedAtFor } from './recorded-at';

const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s);

describe('recordedAtFor', () => {
  it('for today, stays a few minutes behind the clock so a fast clock is never in the future', () => {
    const now = local(2026, 10, 13, 14, 30, 15);
    const sent = new Date(recordedAtFor('2026-10-13', now));
    expect(sent.getTime()).toBeLessThan(now.getTime());
    expect(now.getTime() - sent.getTime()).toBeLessThanOrEqual(10 * 60_000);
  });

  it('for an earlier day, keeps that day and the current time of day', () => {
    const now = local(2026, 10, 13, 14, 30, 15);
    expect(new Date(recordedAtFor('2026-10-06', now)).getTime()).toBe(local(2026, 10, 6, 14, 30, 15).getTime());
  });

  it('never moves a result to the day before when it is just after midnight', () => {
    const now = local(2026, 10, 13, 0, 2, 0);
    const sent = new Date(recordedAtFor('2026-10-13', now));
    expect(sent.getFullYear()).toBe(2026);
    expect(sent.getMonth()).toBe(9);
    expect(sent.getDate()).toBe(13);
  });
});
