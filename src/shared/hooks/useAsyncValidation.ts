import { useState, useEffect } from 'react';

interface ValidationResult {
  valid: boolean;
  available?: boolean;
  format?: boolean;
  mx?: boolean;
  reason?: string;
}

export function useAsyncValidation(
  value: string,
  validationFn: (value: string, signal: AbortSignal) => Promise<ValidationResult>,
  delay: number = 400,
  shouldValidate?: (value: string) => boolean
) {
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState<string | null>(null);

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
        
        if (controller.signal.aborted) return;
        
        if (!result.valid) {
          setStatus('invalid');
          setError(result.reason || 'Невалидное значение');
        } else if (result.available === false) {
          setStatus('invalid');
          setError('Уже занято');
        } else {
          setStatus('valid');
          setError(null);
        }
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        const err = e as { name?: string; code?: string };
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        
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
