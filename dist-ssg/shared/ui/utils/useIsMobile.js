import { useEffect, useState } from 'react';
const WIDTH_QUERY = '(max-width: 768px)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';
function getIsMobile() {
    if (typeof window === 'undefined')
        return false;
    const byWidth = window.matchMedia(WIDTH_QUERY).matches;
    const byPointer = window.matchMedia(COARSE_POINTER_QUERY).matches;
    const byTouchPoints = navigator.maxTouchPoints ? navigator.maxTouchPoints > 0 : false;
    return byWidth || (byPointer && window.innerWidth <= 1200) || (byTouchPoints && window.innerWidth <= 1200);
}
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(getIsMobile);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const widthMq = window.matchMedia(WIDTH_QUERY);
        const pointerMq = window.matchMedia(COARSE_POINTER_QUERY);
        const handleChange = () => setIsMobile(getIsMobile());
        handleChange();
        if (widthMq.addEventListener) {
            widthMq.addEventListener('change', handleChange);
            pointerMq.addEventListener('change', handleChange);
            window.addEventListener('resize', handleChange);
        }
        else {
            widthMq.addListener(handleChange);
            pointerMq.addListener(handleChange);
            window.addEventListener('resize', handleChange);
        }
        return () => {
            if (widthMq.removeEventListener) {
                widthMq.removeEventListener('change', handleChange);
                pointerMq.removeEventListener('change', handleChange);
                window.removeEventListener('resize', handleChange);
            }
            else {
                widthMq.removeListener(handleChange);
                pointerMq.removeListener(handleChange);
                window.removeEventListener('resize', handleChange);
            }
        };
    }, []);
    return isMobile;
}
