import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '../utils/cn.js';
export const Input = React.forwardRef(function I({ className, error, ...p }, ref) {
    return (_jsx("input", { ref: ref, ...p, className: cn('input', error ? 'input-error' : '', className) }));
});
