import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
/**
 * Компонент изображения с индикатором загрузки и плавным появлением
 */
export function ImageWithLoader({ src, alt, className = '', placeholderClassName = '', onClick, onLoad, onError, showSpinner = true, }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageSrc, setImageSrc] = useState(src);
    useEffect(() => {
        if (src !== imageSrc) {
            setLoading(true);
            setError(false);
            setImageSrc(src);
        }
    }, [src]);
    const handleLoad = () => {
        setLoading(false);
        onLoad?.();
    };
    const handleError = () => {
        setLoading(false);
        setError(true);
        onError?.();
    };
    if (!imageSrc) {
        return (_jsx("div", { className: `bg-slate-800/50 flex items-center justify-center ${placeholderClassName || className}`, children: _jsx("svg", { className: "w-8 h-8 text-slate-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) }) }));
    }
    return (_jsxs("div", { className: `relative ${className}`, children: [_jsx(AnimatePresence, { mode: "wait", children: loading && showSpinner && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-10", children: _jsx(motion.div, { animate: { rotate: 360 }, transition: { duration: 1, repeat: Infinity, ease: 'linear' }, className: "w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" }) })) }), error ? (_jsxs("div", { className: `bg-slate-800/50 flex flex-col items-center justify-center gap-2 ${placeholderClassName || className}`, children: [_jsx("svg", { className: "w-8 h-8 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "text-xs text-red-400", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" })] })) : (_jsx(motion.img, { initial: { opacity: 0 }, animate: { opacity: loading ? 0 : 1 }, transition: { duration: 0.3 }, src: imageSrc, alt: alt, className: className, onClick: onClick, onLoad: handleLoad, onError: handleError }))] }));
}
