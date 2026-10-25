// Rules for the "Move to next stage" form. The server enforces the same rules; these only give
// the officer immediate, specific feedback before anything is sent.

export const SCRUTINY_STAGES = ['SCRUTINY', 'RE_SCRUTINY'];

export const DECISIONS = [
  { code: 'APPROVED', label: 'Approved' },
  { code: 'APPROVED_WITH_CONDITIONS', label: 'Approved with conditions' },
  { code: 'REJECTED', label: 'Rejected' },
];

/** Outcomes the officer can record for the stage being left. Deficiency only exists in scrutiny. */
export function outcomesFor(stageCode) {
  const common = [{ code: 'COMPLETED', label: 'Completed, no issues' }];
  return SCRUTINY_STAGES.includes(stageCode)
    ? [...common, { code: 'DEFICIENCY_FOUND', label: 'Deficiency found' }]
    : [...common, { code: 'CONDITIONS_NOTED', label: 'Completed with conditions noted' }];
}

/** Stages the application may move to, taken from the configured workflow (never hard-coded). */
export function allowedNextStages(stages, currentCode) {
  const current = stages.find((s) => s.code === currentCode);
  if (!current) return [];
  return (current.next_stages || [])
    .map((code) => stages.find((s) => s.code === code))
    .filter((s) => s && s.active !== false);
}

/** Returns an object of field -> message. Empty means the form is valid. */
export function validateMove({ toStage, outcome, notes, decision, targetIsDecision }) {
  const errors = {};
  if (!toStage) errors.toStage = 'Choose the stage to move to.';
  if (!outcome) errors.outcome = 'Record the outcome of the current stage.';
  if (outcome === 'DEFICIENCY_FOUND' && !(notes && notes.trim().length >= 3)) {
    errors.notes = 'Describe the deficiency so the institution knows what to fix.';
  }
  if (targetIsDecision && !decision) errors.decision = 'A final decision is required for this stage.';
  return errors;
}
