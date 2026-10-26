import { describe, expect, it } from 'vitest';
import { buildVisitIcs } from './ics';

const visit = {
  id: 'v-1',
  scheduled_date: '2026-11-30',
  institution_name: 'Sahyadri Institute; Pune, West',
  application_number: 'AICTE-2026-10002',
  region: 'WEST',
  remarks: 'Labs and library',
  experts: [{ name: 'Prof. A', is_lead: true }, { name: 'Dr. B', is_lead: false }],
};
const NOW = new Date('2026-10-25T10:00:00Z');

describe('buildVisitIcs', () => {
  const ics = buildVisitIcs(visit, NOW);
  // Calendar apps join folded lines back together before reading them, so the tests do the same.
  const unfolded = ics.replace(/\r\n /g, '');

  it('is a well-formed calendar with one event', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('is an all-day event that ends on the next day', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261130');
    expect(ics).toContain('DTEND;VALUE=DATE:20261201');
  });

  it('crosses a month and year end correctly', () => {
    expect(buildVisitIcs({ ...visit, scheduled_date: '2026-12-31' }, NOW)).toContain('DTEND;VALUE=DATE:20270101');
  });

  it('escapes commas and semicolons in text', () => {
    expect(unfolded).toContain('Sahyadri Institute\\; Pune\\, West');
  });

  it('lists the committee and marks the lead', () => {
    expect(unfolded).toContain('Committee: Prof. A (lead)\\, Dr. B');
  });

  it('has a stable id so re-adding does not duplicate the event', () => {
    expect(ics).toContain('UID:evc-v-1@valid8');
  });

  it('folds long lines at 75 characters', () => {
    const long = buildVisitIcs({ ...visit, remarks: 'x'.repeat(300) }, NOW);
    expect(long.split('\r\n').every((line) => line.length <= 76)).toBe(true);
  });
});
