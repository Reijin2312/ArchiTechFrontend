import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
const sizeMap = {
    sm: { circle: 40, stroke: 3, text: 'text-xs' },
    md: { circle: 60, stroke: 4, text: 'text-sm' },
    lg: { circle: 80, stroke: 5, text: 'text-base' },
};
/**
 * Круговой индикатор прогресса загрузки
 */
export function UploadProgress({ progress, onCancel, className = '', size = 'md', }) {
    const { circle, stroke, text } = sizeMap[size];
    const radius = (circle - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return (_jsxs("div", { className: `relative inline-flex items-center justify-center ${className}`, children: [_jsxs("svg", { width: circle, height: circle, className: "transform -rotate-90", children: [_jsx("circle", { cx: circle / 2, cy: circle / 2, r: radius, stroke: "currentColor", strokeWidth: stroke, fill: "none", className: "text-slate-700" }), _jsx(motion.circle, { cx: circle / 2, cy: circle / 2, r: radius, stroke: "currentColor", strokeWidth: stroke, fill: "none", strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", className: "text-indigo-500", initial: { strokeDashoffset: circumference }, animate: { strokeDashoffset: offset }, transition: { duration: 0.3, ease: 'easeOut' } })] }), _jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: onCancel ? (_jsx("button", { onClick: onCancel, className: "hover:bg-red-500/20 rounded-full p-1 transition-colors", title: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443", children: _jsx("svg", { className: "w-4 h-4 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })) : (_jsxs("span", { className: `font-semibold text-slate-200 ${text}`, children: [Math.round(progress), "%"] })) })] }));
}
