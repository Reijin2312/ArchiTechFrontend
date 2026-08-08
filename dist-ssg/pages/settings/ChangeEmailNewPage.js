import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { Card } from '../../shared/ui/card/Card.js';
import { Input } from '../../shared/ui/form/Input.js';
import { Button } from '../../shared/ui/button/Button.js';
import { FormHint } from '../../shared/ui/form/FormHint.js';
import { Seo } from '../../shared/seo/seo.js';
export default function ChangeEmailNewPage() {
    const [sp] = useSearchParams();
    const nav = useNavigate();
    const ct = sp.get('ct') || '';
    const [email, setEmail] = useState('');
    const [err, setErr] = useState();
    const [busy, setBusy] = useState(false);
    async function save() {
        if (!email.trim() || !ct)
            return;
        setBusy(true);
        setErr(undefined);
        try {
            await http.post(endpoints.accountEmailChangeSet, { changeToken: ct, email: email.trim() });
            nav('/settings/profile', { replace: true });
        }
        catch (e) {
            setErr(e?.response?.data || e?.message || 'Не удалось сменить почту');
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx("div", { className: "wrap", children: _jsxs(Card, { children: [_jsx("h1", { className: "text-2xl mb-4", children: "\u041D\u043E\u0432\u044B\u0439 e-mail" }), err && _jsx("div", { className: "error mb-2", role: "alert", children: err }), _jsx("label", { className: "label", children: "\u041D\u043E\u0432\u044B\u0439 e-mail" }), _jsx(Input, { type: "email", autoComplete: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "you@example.com" }), _jsx(FormHint, { children: "\u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0430\u0434\u0440\u0435\u0441 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435" }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx(Button, { onClick: save, disabled: busy || !email.trim(), children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" }), _jsx(Button, { variant: "ghost", onClick: () => nav('/settings/profile'), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) })] }));
}
