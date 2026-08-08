import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TabButton({ active, onClick, label, count, badge }) {
    return (_jsxs("button", { onClick: onClick, className: [
            'relative flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
            active
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
        ].join(' '), children: [label, count !== undefined && count > 0 && (_jsx("span", { className: [
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                    active ? 'bg-indigo-500' : 'bg-slate-700'
                ].join(' '), children: count })), badge && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" }))] }));
}
