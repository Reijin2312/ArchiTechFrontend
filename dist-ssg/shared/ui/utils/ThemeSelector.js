import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ColorPicker } from '../form/ColorPicker.js';
const THEMES = [
    {
        id: 'default',
        name: 'По умолчанию',
        gradient: 'from-slate-900 to-slate-950',
        preview: 'bg-linear-to-br from-slate-900 to-slate-950'
    },
    {
        id: 'ocean',
        name: 'Океан',
        gradient: 'from-cyan-900 to-blue-950',
        preview: 'bg-linear-to-br from-cyan-900 to-blue-950'
    },
    {
        id: 'sunset',
        name: 'Закат',
        gradient: 'from-orange-900 to-rose-950',
        preview: 'bg-linear-to-br from-orange-900 to-rose-950'
    },
    {
        id: 'forest',
        name: 'Лес',
        gradient: 'from-emerald-900 to-green-950',
        preview: 'bg-linear-to-br from-emerald-900 to-green-950'
    },
    {
        id: 'purple',
        name: 'Аметист',
        gradient: 'from-purple-900 to-indigo-950',
        preview: 'bg-linear-to-br from-purple-900 to-indigo-950'
    },
    {
        id: 'fire',
        name: 'Огонь',
        gradient: 'from-red-900 to-orange-950',
        preview: 'bg-linear-to-br from-red-900 to-orange-950'
    },
];
export function ThemeSelector({ value = 'default', customColor1, customColor2, onChange, className = '' }) {
    const [localColor1, setLocalColor1] = useState(customColor1 || '#0ea5e9');
    const [localColor2, setLocalColor2] = useState(customColor2 || '#1e40af');
    const isCustom = value === 'custom';
    return (_jsxs("div", { className: className, children: [_jsx("div", { className: "mb-3 text-sm font-semibold text-slate-300", children: "\u0422\u0435\u043C\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [THEMES.map((theme) => {
                        const isSelected = value === theme.id;
                        return (_jsxs(motion.button, { type: "button", onClick: () => onChange(theme.id), whileHover: { scale: 1.05 }, whileTap: { scale: 0.98 }, className: `group relative overflow-hidden rounded-xl border transition-all ${isSelected
                                ? 'border-sky-500 ring-2 ring-sky-500/40'
                                : 'border-slate-700 hover:border-slate-500'}`, children: [_jsx("div", { className: `h-20 w-full ${theme.preview}` }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100", children: _jsx("span", { className: "text-sm font-medium text-white", children: theme.name }) }), isSelected && (_jsx(motion.div, { layoutId: "selected-theme", className: "absolute inset-0 border-2 border-sky-500 rounded-xl", transition: { type: 'spring', stiffness: 300, damping: 30 } }))] }, theme.id));
                    }), _jsxs(motion.button, { type: "button", onClick: () => onChange('custom', localColor1, localColor2), whileHover: { scale: 1.05 }, whileTap: { scale: 0.98 }, className: `group relative overflow-hidden rounded-xl border transition-all ${isCustom
                            ? 'border-sky-500 ring-2 ring-sky-500/40'
                            : 'border-slate-700 hover:border-slate-500'}`, children: [_jsx("div", { className: "h-20 w-full", style: {
                                    background: `linear-gradient(to bottom right, ${localColor1}, ${localColor2})`
                                } }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100", children: _jsx("span", { className: "text-sm font-medium text-white", children: "\uD83C\uDFA8 \u0421\u0432\u043E\u044F \u0442\u0435\u043C\u0430" }) }), isCustom && (_jsx(motion.div, { layoutId: "selected-theme", className: "absolute inset-0 border-2 border-sky-500 rounded-xl", transition: { type: 'spring', stiffness: 300, damping: 30 } }))] })] }), isCustom && (_jsxs(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, className: "mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-2 block text-xs text-slate-400", children: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0446\u0432\u0435\u0442" }), _jsx(ColorPicker, { value: localColor1, onChange: (color) => {
                                    setLocalColor1(color);
                                    onChange('custom', color, localColor2);
                                } })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-2 block text-xs text-slate-400", children: "\u0412\u0442\u043E\u0440\u043E\u0439 \u0446\u0432\u0435\u0442" }), _jsx(ColorPicker, { value: localColor2, onChange: (color) => {
                                    setLocalColor2(color);
                                    onChange('custom', localColor1, color);
                                } })] }), _jsxs("div", { className: "rounded-lg border border-slate-700 p-3", children: [_jsx("div", { className: "mb-1 text-xs text-slate-400", children: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440:" }), _jsx("div", { className: "h-16 rounded-lg", style: {
                                    background: `linear-gradient(to bottom right, ${localColor1}, ${localColor2})`
                                } })] })] }))] }));
}
const GRADIENT_ALPHA = 0.65;
function toRgbaWithAlpha(color, alpha) {
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        if (hex.length !== 3 && hex.length !== 6)
            return trimmed;
        const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        if ([r, g, b].some((v) => Number.isNaN(v)))
            return trimmed;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
        const parts = rgbMatch[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .slice(0, 3)
            .map((part) => parseInt(part, 10));
        if (parts.length === 3 && parts.every((v) => !Number.isNaN(v))) {
            const [r, g, b] = parts;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return trimmed;
}
function buildGradient(colorA, colorB, alpha = GRADIENT_ALPHA) {
    return `linear-gradient(to bottom right, ${toRgbaWithAlpha(colorA, alpha)}, ${toRgbaWithAlpha(colorB, alpha)})`;
}
export function getThemeGradient(themeId, color1, color2) {
    if (!themeId)
        return '';
    if (themeId === 'custom' && color1 && color2) {
        return buildGradient(color1, color2);
    }
    const gradientMap = {
        'default': buildGradient('rgb(15 23 42)', 'rgb(2 6 23)'),
        'ocean': buildGradient('rgb(22 78 99)', 'rgb(23 37 84)'),
        'sunset': buildGradient('rgb(124 45 18)', 'rgb(76 5 25)'),
        'forest': buildGradient('rgb(6 78 59)', 'rgb(5 46 22)'),
        'purple': buildGradient('rgb(88 28 135)', 'rgb(49 46 129)'),
        'fire': buildGradient('rgb(127 29 29)', 'rgb(67 20 7)'),
    };
    return gradientMap[themeId] || '';
}
