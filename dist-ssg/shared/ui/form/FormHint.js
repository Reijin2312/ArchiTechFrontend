import { jsx as _jsx } from "react/jsx-runtime";
export function FormHint({ children, error }) {
    return _jsx("p", { className: `hint ${error ? 'error' : ''}`, children: children });
}
