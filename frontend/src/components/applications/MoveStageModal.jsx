import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { apiErrorMessage } from '../common/ErrorBanner';
import { applicationsService } from '../../services/applicationsService';
import { allowedNextStages, outcomesFor, validateMove, DECISIONS } from '../../utils/moveStage';

const field = 'w-full text-sm bg-white border rounded-xl p-2.5';
const ok = 'border-slate-300';
const bad = 'border-red-400';

function Field({ id, label, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-[11px] font-medium text-red-700 mt-1">{error}</p>}
    </div>
  );
}

/**
 * Dialog for moving an application to its next stage.
 * Only the stages the workflow allows are offered, the outcome is required, and notes are
 * required when a deficiency is found.
 */
export function MoveStageModal({ isOpen, onClose, application, stages, onMoved }) {
  const options = useMemo(
    () => (application ? allowedNextStages(stages, application.current_stage_code) : []),
    [stages, application]
  );

  const [toStage, setToStage] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setToStage(options.length === 1 ? options[0].code : '');
    setOutcome('');
    setNotes('');
    setDecision('');
    setErrors({});
    setServerError(null);
  }, [isOpen, options]);

  if (!application) return null;

  const clearError = (key) => setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));

  const target = options.find((s) => s.code === toStage);
  const targetIsDecision = !!(target && (target.is_terminal || target.requires_decision));
  const outcomes = outcomesFor(application.current_stage_code);

  async function submit(e) {
    e.preventDefault();
    const found = validateMove({ toStage, outcome, notes, decision, targetIsDecision });
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setServerError(null);
    try {
      const updated = await applicationsService.moveStage(application.id, {
        to_stage: toStage,
        outcome,
        notes: notes.trim() || undefined,
        decision: targetIsDecision ? decision : undefined,
      });
      onMoved(updated, target);
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Could not move the application. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move ${application.application_number}`}>
      {options.length === 0 ? (
        <p className="text-sm text-slate-600">
          This application is at the end of the workflow, so there is no next stage to move to.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{serverError}</p>
          )}

          <Field id="move-stage" label="Move to" required error={errors.toStage}
            hint="Only stages the workflow allows from here are listed.">
            <select
              id="move-stage"
              value={toStage}
              onChange={(e) => { setToStage(e.target.value); clearError('toStage'); clearError('decision'); }}
              aria-invalid={!!errors.toStage}
              aria-describedby={errors.toStage ? 'move-stage-error' : undefined}
              className={`${field} ${errors.toStage ? bad : ok}`}
            >
              <option value="">Select a stage…</option>
              {options.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>

          <Field id="move-outcome" label="Outcome of the current stage" required error={errors.outcome}>
            <select
              id="move-outcome"
              value={outcome}
              onChange={(e) => { setOutcome(e.target.value); clearError('outcome'); clearError('notes'); }}
              aria-invalid={!!errors.outcome}
              aria-describedby={errors.outcome ? 'move-outcome-error' : undefined}
              className={`${field} ${errors.outcome ? bad : ok}`}
            >
              <option value="">Select an outcome…</option>
              {outcomes.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </Field>

          {targetIsDecision && (
            <Field id="move-decision" label="Final decision" required error={errors.decision}
              hint="You record the decision; the system never decides.">
              <select
                id="move-decision"
                value={decision}
                onChange={(e) => { setDecision(e.target.value); clearError('decision'); }}
                aria-invalid={!!errors.decision}
                aria-describedby={errors.decision ? 'move-decision-error' : undefined}
                className={`${field} ${errors.decision ? bad : ok}`}
              >
                <option value="">Select a decision…</option>
                {DECISIONS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
            </Field>
          )}

          <Field
            id="move-notes"
            label="Notes"
            required={outcome === 'DEFICIENCY_FOUND'}
            error={errors.notes}
            hint={outcome === 'DEFICIENCY_FOUND' ? undefined : 'Optional.'}
          >
            <textarea
              id="move-notes"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); clearError('notes'); }}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'move-notes-error' : undefined}
              placeholder={outcome === 'DEFICIENCY_FOUND' ? 'What is missing or incorrect?' : 'Anything the next officer should know'}
              className={`${field} ${errors.notes ? bad : ok}`}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl">
              {busy ? 'Moving…' : 'Confirm move'} {!busy && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
