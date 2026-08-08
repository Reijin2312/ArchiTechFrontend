import { useState, useCallback, useEffect, useRef } from 'react';
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const toastTimers = useRef(new Map());
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timers = toastTimers.current.get(id);
        if (timers) {
            timers.forEach((handle) => window.clearTimeout(handle));
            toastTimers.current.delete(id);
        }
    }, []);
    const closeToast = useCallback((id) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
        const timers = toastTimers.current.get(id);
        if (timers) {
            timers.forEach((handle) => window.clearTimeout(handle));
            toastTimers.current.delete(id);
        }
        const removeTimer = window.setTimeout(() => removeToast(id), 200);
        toastTimers.current.set(id, [removeTimer]);
    }, [removeToast]);
    const pushToast = useCallback((type, message) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, type, message }]);
        const hideTimer = window.setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
        }, 3200);
        const removeTimer = window.setTimeout(() => removeToast(id), 3600);
        toastTimers.current.set(id, [hideTimer, removeTimer]);
    }, [removeToast]);
    useEffect(() => {
        return () => {
            toastTimers.current.forEach((timers) => timers.forEach((handle) => window.clearTimeout(handle)));
            toastTimers.current.clear();
        };
    }, []);
    return { toasts, pushToast, closeToast };
}
