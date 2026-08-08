import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../utils/cn.js';
export function Button({ className, variant = 'primary', ...p }) {
    return _jsx("button", { ...p, className: cn('btn', variant === 'primary' ? 'primary' : 'ghost', className) });
}
