import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { Card } from '../../shared/ui/card/Card.js';
import { Button } from '../../shared/ui/button/Button.js';
import { Seo } from '../../shared/seo/seo.js';
export default function EmailChangeStartPage() {
    const nav = useNavigate();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    async function begin() {
        try {
            setBusy(true);
            setErr(null);
            const { data } = await http.post(endpoints.accountEmailChangeOldBegin, {}, { withCredentials: true });
            const qs = new URLSearchParams({ ticket: data.ticket, email: data.email, next: '/settings/email/new' });
            nav('/verify/email-change-old?' + qs.toString(), { replace: true });
        }
        catch (e) {
            setErr(e?.response?.data?.message || e?.message || 'Не удалось начать смену почты');
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx("div", { className: "wrap", children: _jsxs(Card, { children: [_jsx("h1", { className: "text-2xl mb-4", children: "\u0421\u043C\u0435\u043D\u0430 e-mail" }), err && _jsx("div", { className: "error mb-2", role: "alert", children: err }), _jsx("p", { className: "hint mb-3", children: "\u0428\u0430\u0433 1. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u043B\u0430\u0434\u0435\u043D\u0438\u0435 \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0430\u0434\u0440\u0435\u0441\u043E\u043C. \u041C\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043C \u043A\u043E\u0434 \u043D\u0430 \u0432\u0430\u0448\u0443 \u0441\u0442\u0430\u0440\u0443\u044E \u043F\u043E\u0447\u0442\u0443." }), _jsx(Button, { onClick: begin, disabled: busy, children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u0434 \u043D\u0430 \u0441\u0442\u0430\u0440\u044B\u0439 e-mail" })] }) })] }));
}
