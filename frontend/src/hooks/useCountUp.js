import { useEffect, useRef, useState } from 'react';

/** Counts up from 0 to `target` once, easing out. Jumps straight to the number for reduced-motion users. */
export function useCountUp(target, duration = 800) {
  const isNumber = typeof target === 'number' && Number.isFinite(target);
  const [value, setValue] = useState(isNumber ? 0 : target);
  const frame = useRef(0);

  useEffect(() => {
    if (!isNumber) {
      setValue(target);
      return undefined;
    }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === 0) {
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, isNumber]);

  return value;
}
