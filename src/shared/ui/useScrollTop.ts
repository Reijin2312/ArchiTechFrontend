import { useLayoutEffect } from 'react';

export function useScrollTop() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
}