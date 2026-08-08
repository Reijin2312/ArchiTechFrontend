import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ToastStack({ toasts, onClose }) {
    if (!toasts.length)
        return null;
    return (_jsx("div", { className: "pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4", children: _jsx("div", { className: "flex w-full max-w-sm flex-col gap-2", children: toasts.map((toast) => (_jsx("div", { className: `pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-xl transition-all duration-300 ${toast.fading ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'} ${toast.type === 'error'
                    ? 'border-red-800 bg-red-950/80 text-red-100'
                    : 'border-sky-700 bg-sky-950/80 text-sky-100'}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-1", children: toast.message }), _jsx("button", { type: "button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435", onClick: () => onClose(toast.id), className: "text-xs text-slate-300 transition-colors hover:text-white", children: "\u2715" })] }) }, toast.id))) }) }));
}
