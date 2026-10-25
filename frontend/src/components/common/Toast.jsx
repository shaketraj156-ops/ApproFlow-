import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const KINDS = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconTone: 'text-emerald-600', label: 'Success' },
  error: { icon: AlertCircle, ring: 'border-red-200', iconTone: 'text-red-600', label: 'Error' },
  info: { icon: Info, ring: 'border-slate-200', iconTone: 'text-slate-700', label: 'Info' },
};

/** Small confirmation messages that fade away by themselves. Icon and word, never colour alone. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((kind, message, duration = 4500) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-3), { id, kind, message, duration }]);
    return id;
  }, []);

  const api = useMemo(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message, 7000),
    info: (message) => push('info', message),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const kind = KINDS[toast.kind] || KINDS.info;
  const Icon = kind.icon;

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xl animate-toastIn ${kind.ring}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${kind.iconTone}`} aria-hidden="true" />
      <p className="flex-1 text-sm text-slate-800">
        <span className="sr-only">{kind.label}: </span>
        {toast.message}
      </p>
      <button
        onClick={() => onClose(toast.id)}
        aria-label="Dismiss notification"
        className="p-0.5 rounded text-slate-400 hover:text-slate-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
