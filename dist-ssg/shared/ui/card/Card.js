import { jsx as _jsx } from "react/jsx-runtime";
export function Card({ children, className, style }) {
    const cls = ['card', 'backdrop-blur-md', 'backdrop-saturate-150', className].filter(Boolean).join(' ');
    return (_jsx("div", { className: cls, style: style, children: children }));
}
