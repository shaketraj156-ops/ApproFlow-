import { describe, expect, it } from 'vitest';
import { daysUntil, formatCount } from './dates';

// 2026-10-25 12:00 IST
const NOW = new Date('2026-10-25T06:30:00Z');

describe('daysUntil', () => {
  it('counts whole calendar days for date-only API values', () => {
    expect(daysUntil('2026-10-25', NOW)).toBe(0);
    expect(daysUntil('2026-10-26', NOW)).toBe(1);
    expect(daysUntil('2026-11-10', NOW)).toBe(16);
    expect(daysUntil('2026-10-20', NOW)).toBe(-5);
  });

  it('works across a month and year boundary', () => {
    expect(daysUntil('2027-01-01', NOW)).toBe(68);
  });

  it('reads full timestamps in IST, not UTC', () => {
    // 18:30Z on the 9th is already the 10th in India
    expect(daysUntil('2026-11-09T18:30:00Z', NOW)).toBe(16);
  });

  it('treats just-after-midnight IST as the new day', () => {
    const justAfterMidnightIst = new Date('2026-10-24T18:31:00Z'); // 00:01 on the 25th in IST
    expect(daysUntil('2026-10-25', justAfterMidnightIst)).toBe(0);
  });

  it('returns null for missing or unusable input', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil('', NOW)).toBeNull();
    expect(daysUntil('not a date', NOW)).toBeNull();
  });
});

describe('formatCount', () => {
  it('shows a dash instead of undefined or null', () => {
    expect(formatCount(undefined)).toBe('—');
    expect(formatCount(null)).toBe('—');
    expect(formatCount(0)).toBe('0');
  });
});
