import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
import { logger } from '../../../shared/lib/logger.js';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        logger.error('ErrorBoundary caught error', { error, errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (_jsx("div", { role: "alert", className: "p-4 text-red-600", children: "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A. \u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443." }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
