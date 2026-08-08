import React from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';

interface ToastEntry {
  id: number;
  type: 'success' | 'error';
  message: string;
  fading?: boolean;
}

interface ToastStackProps {
  toasts: ToastEntry[];
  onClose: (id: number) => void;
}

export function ToastStack({ toasts, onClose }: ToastStackProps) {
  const { language } = useI18n();
  if (!toasts.length) return null;
  
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-xl transition-all duration-300 ${
              toast.fading ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            } ${
              toast.type === 'error'
                ? 'border-red-800 bg-red-950/80 text-red-100'
                : 'border-sky-700 bg-sky-950/80 text-sky-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">{toast.message}</div>
              <button
                type="button"
                aria-label={language === 'ru' ? 'Закрыть уведомление' : 'Close notification'}
                onClick={() => onClose(toast.id)}
                className="text-xs text-slate-300 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
