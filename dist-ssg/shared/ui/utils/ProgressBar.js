import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
export function ProgressBar({ value, max = 100, label, showPercentage = true, className = '', color = 'sky' }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const colorClasses = {
        sky: 'bg-sky-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        indigo: 'bg-indigo-500'
    };
    return (_jsxs("div", { className: className, children: [(label || showPercentage) && (_jsxs("div", { className: "mb-1.5 flex items-center justify-between text-xs", children: [label && _jsx("span", { className: "text-slate-300", children: label }), showPercentage && _jsxs("span", { className: "text-slate-400", children: [percentage.toFixed(0), "%"] })] })), _jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-slate-800", children: _jsx(motion.div, { className: `h-full rounded-full ${colorClasses[color]}`, initial: { width: 0 }, animate: { width: `${percentage}%` }, transition: { duration: 0.5, ease: 'easeOut' } }) })] }));
}
