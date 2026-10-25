import { describe, expect, it } from 'vitest';
import { healthSegments } from './health';
import { displayName, initials, roleTheme } from './roleTheme';

describe('healthSegments', () => {
  it('splits open applications into on track, due soon and overdue', () => {
    expect(healthSegments({ open: 29, overdue: 10, dueSoon: 13 })).toEqual({
      total: 29, onTrack: 6, dueSoon: 13, overdue: 10, percentOnTrack: 21,
    });
  });

  it('treats an empty pipeline as fully healthy', () => {
    expect(healthSegments({ open: 0 }).percentOnTrack).toBe(100);
    expect(healthSegments().total).toBe(0);
  });

  it('never goes negative when the counts overlap or exceed the total', () => {
    const h = healthSegments({ open: 5, overdue: 4, dueSoon: 9 });
    expect(h.onTrack).toBe(0);
    expect(h.overdue + h.dueSoon + h.onTrack).toBe(5);
  });

  it('ignores negative inputs', () => {
    expect(healthSegments({ open: 4, overdue: -3, dueSoon: -1 })).toMatchObject({ onTrack: 4, overdue: 0, dueSoon: 0 });
  });
});

describe('roleTheme', () => {
  it('gives each kind of officer its own banner', () => {
    expect(roleTheme({ role: 'aicte_officer', officer_level: 'SECTION_OFFICER' }).key).toBe('section');
    expect(roleTheme({ role: 'aicte_officer', officer_level: 'REGIONAL_HEAD' }).key).toBe('regional');
    expect(roleTheme({ role: 'aicte_officer', officer_level: 'NATIONAL_HEAD' }).key).toBe('national');
    expect(roleTheme({ role: 'system_admin' }).key).toBe('admin');
    expect(roleTheme({ role: 'institution_admin' }).key).toBe('institution');
  });
});

describe('displayName and initials', () => {
  it('drops the role in brackets', () => {
    expect(displayName({ full_name: 'Dr. S. Sharma (Regional Head - WEST)' })).toBe('Dr. S. Sharma');
    expect(displayName({})).toBe('there');
  });

  it('builds initials without the title', () => {
    expect(initials({ full_name: 'Rajesh Kumar (Section Officer)' })).toBe('RK');
    expect(initials({ full_name: 'Dr. S. Sharma' })).toBe('SS');
    expect(initials({})).toBe('T');
  });
});
