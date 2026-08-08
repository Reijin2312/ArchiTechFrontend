import { useState, useEffect } from 'react';
export function useAsyncValidation(value, validationFn, delay = 400, shouldValidate) {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    useEffect(() => {
        const trimmed = value.trim();
        if (!trimmed) {
            setStatus('idle');
            setError(null);
            return;
        }
        // Проверка перед запуском валидации
        if (shouldValidate && !shouldValidate(trimmed)) {
            setStatus('invalid');
            return;
        }
        setStatus('validating');
        setError(null);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const result = await validationFn(trimmed, controller.signal);
                if (controller.signal.aborted)
                    return;
                if (!result.valid) {
                    setStatus('invalid');
                    setError(result.reason || 'Невалидное значение');
                }
                else if (result.available === false) {
                    setStatus('invalid');
                    setError('Уже занято');
                }
                else {
                    setStatus('valid');
                    setError(null);
                }
            }
            catch (e) {
                if (controller.signal.aborted)
                    return;
                const err = e;
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED')
                    return;
                setStatus('invalid');
                setError('Ошибка проверки');
            }
        }, delay);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [value, validationFn, delay, shouldValidate]);
    return { status, error, isValid: status === 'valid', isInvalid: status === 'invalid' };
}
