import { describe, expect, it } from 'vitest';
import { allowedNextStages, outcomesFor, validateMove } from './moveStage';

const STAGES = [
  { code: 'SCRUTINY', name: 'Scrutiny', next_stages: ['RE_SCRUTINY', 'EVC', 'DECIDED'], active: true },
  { code: 'RE_SCRUTINY', name: 'Re-scrutiny', next_stages: ['EVC'], active: true },
  { code: 'EVC', name: 'EVC', next_stages: ['DECIDED'], active: false },
  { code: 'DECIDED', name: 'Decided', next_stages: [], is_terminal: true, active: true },
];

describe('allowedNextStages', () => {
  it('offers only the stages the workflow allows from the current one', () => {
    expect(allowedNextStages(STAGES, 'SCRUTINY').map((s) => s.code)).toEqual(['RE_SCRUTINY', 'DECIDED']);
  });

  it('skips inactive stages', () => {
    expect(allowedNextStages(STAGES, 'RE_SCRUTINY')).toEqual([]);
  });

  it('offers nothing at the end of the workflow or for an unknown stage', () => {
    expect(allowedNextStages(STAGES, 'DECIDED')).toEqual([]);
    expect(allowedNextStages(STAGES, 'NOPE')).toEqual([]);
  });
});

describe('outcomesFor', () => {
  it('only scrutiny stages can record a deficiency', () => {
    expect(outcomesFor('SCRUTINY').map((o) => o.code)).toContain('DEFICIENCY_FOUND');
    expect(outcomesFor('RE_SCRUTINY').map((o) => o.code)).toContain('DEFICIENCY_FOUND');
    expect(outcomesFor('EVC').map((o) => o.code)).not.toContain('DEFICIENCY_FOUND');
  });
});

describe('validateMove', () => {
  const valid = { toStage: 'EVC', outcome: 'COMPLETED', notes: '', decision: '', targetIsDecision: false };

  it('accepts a complete form', () => {
    expect(validateMove(valid)).toEqual({});
  });

  it('requires a destination and an outcome', () => {
    const errors = validateMove({ ...valid, toStage: '', outcome: '' });
    expect(Object.keys(errors).sort()).toEqual(['outcome', 'toStage']);
  });

  it('requires notes when a deficiency is found', () => {
    expect(validateMove({ ...valid, outcome: 'DEFICIENCY_FOUND', notes: '' }).notes).toBeTruthy();
    expect(validateMove({ ...valid, outcome: 'DEFICIENCY_FOUND', notes: '  ' }).notes).toBeTruthy();
    expect(validateMove({ ...valid, outcome: 'DEFICIENCY_FOUND', notes: 'Fire NOC missing' })).toEqual({});
  });

  it('does not require notes for other outcomes', () => {
    expect(validateMove({ ...valid, outcome: 'COMPLETED', notes: '' }).notes).toBeUndefined();
  });

  it('requires a decision only when moving to a decision stage', () => {
    expect(validateMove({ ...valid, toStage: 'DECIDED', targetIsDecision: true }).decision).toBeTruthy();
    expect(validateMove({ ...valid, toStage: 'DECIDED', targetIsDecision: true, decision: 'APPROVED' })).toEqual({});
  });
});
