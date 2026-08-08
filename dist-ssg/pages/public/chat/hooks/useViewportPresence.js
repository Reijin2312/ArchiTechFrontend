import { useCallback, useEffect, useState } from 'react';
export function useViewportPresence({ disabled = false, rootMargin = '220px', threshold = 0.01, } = {}) {
    const [node, setNode] = useState(null);
    const [isInViewport, setIsInViewport] = useState(true);
    const ref = useCallback((next) => {
        setNode(next);
    }, []);
    useEffect(() => {
        if (disabled || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
            setIsInViewport(true);
            return;
        }
        if (!node)
            return;
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            setIsInViewport(!!entry && (entry.isIntersecting || entry.intersectionRatio > 0));
        }, {
            root: null,
            rootMargin,
            threshold,
        });
        observer.observe(node);
        return () => {
            observer.disconnect();
        };
    }, [disabled, node, rootMargin, threshold]);
    return { ref, isInViewport };
}
