import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
export const sideNavVariants = {
    hidden: { x: -16 },
    show: {
        x: 0,
        transition: { duration: 0.45, ease: 'easeOut' },
    },
};
export const tocVariants = {
    hidden: { x: 16 },
    show: {
        x: 0,
        transition: { duration: 0.45, ease: 'easeOut', delay: 0.05 },
    },
};
export const pageVariants = {
    hidden: { y: 24 },
    show: {
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' },
    },
};
export const sectionVariants = {
    hidden: { y: 14, scale: 0.98 },
    show: {
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: 'easeOut' },
    },
};
export function LeftNav({ items, blurIntensity = 'md', bgOpacity = '40', disableMotion = false }) {
    const blurClass = blurIntensity === 'xl' ? 'backdrop-blur-xl' : 'backdrop-blur-md';
    const bgClass = bgOpacity === '60' ? 'bg-slate-950/60' : 'bg-slate-950/40';
    return (_jsx("nav", { className: `sticky top-20 rounded-2xl border border-slate-800/80 ${bgClass} p-4 ${blurClass} backdrop-saturate-150`, children: _jsxs(motion.div, { variants: disableMotion ? undefined : sideNavVariants, initial: disableMotion ? false : 'hidden', animate: disableMotion ? false : 'show', children: [_jsx("h2", { className: "mb-3 text-sky-400 text-sm font-semibold", children: "\u0420\u0430\u0437\u0434\u0435\u043B\u044B" }), _jsx("ul", { className: "space-y-2 text-sm", children: items.map((s) => (_jsx("li", { children: _jsx("a", { href: `#${s.id}`, className: "text-slate-300 hover:text-sky-300", children: s.title }) }, s.id))) })] }) }));
}
export function RightToc({ items, blurIntensity = 'md', bgOpacity = '40', linkTransition = false, disableMotion = false, }) {
    const [active, setActive] = useState(items[0]?.id);
    const observer = useRef(null);
    useEffect(() => {
        if (disableMotion) {
            observer.current?.disconnect();
            observer.current = null;
            return;
        }
        const headers = items.map((i) => document.getElementById(i.id)).filter(Boolean);
        observer.current?.disconnect();
        observer.current = new IntersectionObserver((entries) => {
            const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (vis)
                setActive(vis.target.id);
        }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] });
        headers.forEach((h) => observer.current.observe(h));
        return () => observer.current?.disconnect();
    }, [items, disableMotion]);
    const blurClass = blurIntensity === 'xl' ? 'backdrop-blur-xl' : 'backdrop-blur-md';
    const bgClass = bgOpacity === '60' ? 'bg-slate-950/60' : 'bg-slate-950/40';
    return (_jsx("nav", { className: `sticky top-20 rounded-2xl border border-slate-800/80 ${bgClass} p-4 ${blurClass} backdrop-saturate-150`, children: _jsxs(motion.div, { variants: disableMotion ? undefined : tocVariants, initial: disableMotion ? false : 'hidden', animate: disableMotion ? false : 'show', children: [_jsx("div", { className: "mb-2 text-slate-300 text-sm", children: "\u041D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435" }), _jsx("ol", { className: "space-y-2 text-sm", children: items.map((it, i) => {
                        const on = active === it.id;
                        return (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: `mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${on ? 'border-sky-500 text-sky-300' : 'border-slate-700 text-slate-400'}`, children: i + 1 }), _jsx("a", { href: `#${it.id}`, className: `${on ? 'text-sky-300' : 'text-slate-300 hover:text-sky-300'}${linkTransition ? ' transition-colors' : ''}`, children: it.title })] }, it.id));
                    }) })] }) }));
}
export function Section({ id, title, n, children, disableMotion = false }) {
    return (_jsx("section", { id: id, className: "scroll-mt-24", children: _jsxs(motion.div, { variants: disableMotion ? undefined : sectionVariants, initial: disableMotion ? false : 'hidden', whileInView: disableMotion ? undefined : 'show', viewport: disableMotion ? undefined : { once: true, amount: 0.01 }, children: [_jsxs("h2", { className: "mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 text-lg font-semibold", children: [_jsx("span", { className: "inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-slate-50 text-sm", children: n }), title] }), _jsx("div", { className: "mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150", children: children })] }) }));
}
export function Kbd({ children }) {
    return _jsx("kbd", { className: "rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs", children: children });
}
export function Callout({ title, children }) {
    return (_jsxs("div", { className: "mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "mb-1 text-base font-semibold", children: title }), children] }));
}
