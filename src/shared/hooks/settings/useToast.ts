import { useState, useCallback, useEffect, useRef } from 'react';

interface ToastEntry {
  id: number;
  type: 'success' | 'error';
  message: string;
  fading?: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastTimers = useRef<Map<number, number[]>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = toastTimers.current.get(id);
    if (timers) {
      timers.forEach((handle) => window.clearTimeout(handle));
      toastTimers.current.delete(id);
    }
  }, []);

  const closeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
    const timers = toastTimers.current.get(id);
    if (timers) {
      timers.forEach((handle) => window.clearTimeout(handle));
      toastTimers.current.delete(id);
    }
    const removeTimer = window.setTimeout(() => removeToast(id), 200);
    toastTimers.current.set(id, [removeTimer]);
  }, [removeToast]);

  const pushToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);

      const hideTimer = window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
      }, 3200);
      const removeTimer = window.setTimeout(() => removeToast(id), 3600);
      toastTimers.current.set(id, [hideTimer, removeTimer]);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timers) => timers.forEach((handle) => window.clearTimeout(handle)));
      toastTimers.current.clear();
    };
  }, []);

  return { toasts, pushToast, closeToast };
}
