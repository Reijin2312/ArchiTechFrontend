import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Avatar({ size = 54, avatarBg, avatarText, avatarUrl, online = false, }) {
    const dotSize = Math.max(14, Math.round(size * 0.28));
    return (_jsxs("div", { className: "relative shrink-0", style: {
            width: size,
            height: size,
        }, children: [_jsx("div", { className: "h-full w-full overflow-hidden rounded-full", style: {
                    background: avatarBg,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                }, children: avatarUrl ? (_jsx("img", { src: avatarUrl, alt: avatarText, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-white", style: { fontSize: size * 0.45, fontWeight: 700 }, children: avatarText })) }), online ? (_jsx("span", { className: "pointer-events-none absolute z-[3] rounded-full border-2 border-[#0e1118] bg-[#3b82f6] shadow-[0_0_0_1px_rgba(59,130,246,0.35)]", style: {
                    width: dotSize,
                    height: dotSize,
                    right: -1,
                    bottom: -1,
                }, "aria-hidden": true })) : null] }));
}
