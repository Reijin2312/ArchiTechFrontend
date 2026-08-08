import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadProgress } from './UploadProgress.js';
/**
 * Компонент предпросмотра загружаемого изображения с индикатором прогресса
 */
export function ImageUploadPreview({ file, progress, onCancel, error, className = '', }) {
    const [preview, setPreview] = useState('');
    // Создаем превью изображения
    useState(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result);
        };
        reader.readAsDataURL(file);
    });
    return (_jsxs("div", { className: `relative rounded-2xl overflow-hidden border-2 border-slate-700 ${className}`, children: [preview && (_jsx("img", { src: preview, alt: "Preview", className: "w-full h-full object-cover blur-sm" })), _jsx("div", { className: "absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center", children: _jsx(AnimatePresence, { mode: "wait", children: error ? (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("span", { className: "text-sm text-red-400 text-center max-w-xs", children: error }), onCancel && (_jsx("button", { onClick: onCancel, className: "mt-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }))] }, "error")) : progress < 100 ? (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "flex flex-col items-center gap-3", children: [_jsx(UploadProgress, { progress: progress, onCancel: onCancel, size: "lg" }), _jsx("span", { className: "text-sm text-slate-300", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F..." }), _jsx("span", { className: "text-xs text-slate-500", children: file.name })] }, "uploading")) : (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-green-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("span", { className: "text-sm text-green-400", children: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E!" })] }, "complete")) }) })] }));
}
