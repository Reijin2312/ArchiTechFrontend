import { useCallback, useEffect, useState } from 'react';

type ViewportPresenceOptions = {
  disabled?: boolean;
  rootMargin?: string;
  threshold?: number;
};

export function useViewportPresence<T extends Element>({
  disabled = false,
  rootMargin = '220px',
  threshold = 0.01,
}: ViewportPresenceOptions = {}) {
  const [node, setNode] = useState<T | null>(null);
  const [isInViewport, setIsInViewport] = useState(true);

  const ref = useCallback((next: T | null) => {
    setNode(next);
  }, []);

  useEffect(() => {
    if (disabled || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setIsInViewport(true);
      return;
    }
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInViewport(!!entry && (entry.isIntersecting || entry.intersectionRatio > 0));
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [disabled, node, rootMargin, threshold]);

  return { ref, isInViewport };
}

