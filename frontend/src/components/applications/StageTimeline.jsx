import React from 'react';
import { Check, Pause } from 'lucide-react';

/**
 * Horizontal stepper for an application's journey. Scrolls sideways on narrow screens.
 * `stages` is the configured list ({ code, name }) in order; `currentCode` is where the application is now.
 */
export function StageTimeline({ stages, currentCode, decided = false, onHold = false, compact = false }) {
  const currentIndex = stages.findIndex((s) => s.code === currentCode);

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <ol className={`flex items-start ${compact ? 'min-w-[34rem]' : 'min-w-[44rem]'}`} aria-label="Application progress">
        {stages.map((stage, idx) => {
          const done = currentIndex >= 0 && (idx < currentIndex || (decided && idx === currentIndex));
          const current = idx === currentIndex && !decided;
          const last = idx === stages.length - 1;
          const paused = current && onHold;

          const state = done ? 'Completed' : paused ? 'On hold' : current ? 'In progress' : 'Upcoming';

          return (
            <li key={stage.code} className="flex-1 flex flex-col items-center text-center relative" aria-current={current ? 'step' : undefined}>
              {!last && (
                <span
                  aria-hidden="true"
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? 'bg-emerald-600' : 'bg-slate-200'}`}
                />
              )}
              <span
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  done
                    ? 'bg-emerald-600 text-white'
                    : paused
                    ? 'bg-slate-200 text-slate-700 ring-4 ring-slate-100'
                    : current
                    ? 'bg-white border-2 border-emerald-600 text-emerald-700 ring-4 ring-emerald-100'
                    : 'bg-white border border-slate-300 text-slate-400'
                }`}
              >
                {done ? <Check className="w-4 h-4" aria-hidden="true" /> : paused ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : idx + 1}
              </span>
              <span className={`mt-2 px-1 text-[11px] leading-tight font-semibold ${current ? 'text-emerald-800' : done ? 'text-slate-800' : 'text-slate-400'}`}>
                {stage.name}
              </span>
              <span className={`text-[10px] mt-0.5 ${current ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>{state}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
