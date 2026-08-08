import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skin3DViewer } from './Skin3DViewer.js';
export function Skin3DPreview({ skinUrl, className = '', autoRotate = false, compact = false }) {
    const [loading] = useState(false);
    return (_jsxs("div", { className: `relative ${className}`, children: [_jsx(AnimatePresence, { children: loading && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl z-10", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" }) })) }), _jsx(Skin3DViewer, { skinUrl: skinUrl, autoRotate: autoRotate, className: "h-full w-full" })] }));
}
