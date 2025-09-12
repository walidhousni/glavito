'use client'

import * as React from 'react';

type ToastVariant = 'success' | 'error' | 'info'

interface ToastAction {
  label: string;
  onClick?: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  // Push a toast by message or by options
  push: (message: string | Omit<ToastItem, 'id'>, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  const push = React.useCallback((messageOrOpts: string | Omit<ToastItem, 'id'>, variant?: ToastVariant, duration?: number) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const defaults: Omit<ToastItem, 'id'> = {
      message: typeof messageOrOpts === 'string' ? messageOrOpts : messageOrOpts.message,
      variant: typeof messageOrOpts === 'string' ? (variant || 'success') : (messageOrOpts.variant || 'success'),
      duration: typeof messageOrOpts === 'string' ? (duration || 2500) : (messageOrOpts.duration || 2500),
      action: typeof messageOrOpts === 'string' ? undefined : messageOrOpts.action,
    };
    setToasts((prev) => [...prev, { id, ...defaults }]);
    window.setTimeout(() => dismiss(id), defaults.duration);
  }, [dismiss]);

  const success = React.useCallback((message: string, duration = 2500) => push(message, 'success', duration), [push]);
  const error = React.useCallback((message: string, duration = 3000) => push(message, 'error', duration), [push]);
  const info = React.useCallback((message: string, duration = 2500) => push(message, 'info', duration), [push]);

  return (
    <ToastContext.Provider value={{ push, success, error, info, dismiss, clear }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] space-y-2"
        role="region"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.slice(-5).map((t) => (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={
              `flex items-center gap-2 rounded-md px-3 py-2 shadow text-white animate-in fade-in-0 zoom-in-95 ` +
              (t.variant === 'error' ? 'bg-red-600' : t.variant === 'info' ? 'bg-slate-700' : 'bg-emerald-600')
            }
          >
            <span className="text-sm">{t.message}</span>
            {t.action ? (
              <button
                className="ml-auto underline text-white/90 hover:text-white text-xs"
                onClick={() => {
                  try { t.action?.onClick?.() } catch { /* ignore */ }
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              className="ml-1 text-white/80 hover:text-white text-xs"
              aria-label="Close"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
