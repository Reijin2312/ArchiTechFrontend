import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { Card } from '../../shared/ui/card/Card.js';
import { Input } from '../../shared/ui/form/Input.js';
import { Button } from '../../shared/ui/button/Button.js';
import { Seo } from '../../shared/seo/seo.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
export default function TwoFactorDisablePage() {
    useWallpaper();
    const navigate = useNavigate();
    const [step, setStep] = useState('password');
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState(null);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        void loadStatus();
    }, []);
    async function loadStatus() {
        setLoadingStatus(true);
        setStatusError(null);
        try {
            const { data } = await http.get(endpoints.account2faStatus, { withCredentials: true });
            if (data.enabled) {
                setStep('password');
            }
            else {
                setStep('already');
            }
        }
        catch (e) {
            setStatusError(normalizeDisableError(e, 'Не удалось загрузить состояние 2FA'));
        }
        finally {
            setLoadingStatus(false);
        }
    }
    function continueToCode() {
        if (!password.trim()) {
            setError('Введите пароль аккаунта');
            return;
        }
        setError(null);
        setStep('confirm');
    }
    async function disableTwoFa() {
        if (!/^\d{6}$/.test(code)) {
            setError('Введите 6-значный код из Google Authenticator');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await http.post(endpoints.account2faDisable, { password, code }, { withCredentials: true });
            setStep('done');
        }
        catch (e) {
            setError(normalizeDisableError(e, 'Не удалось отключить 2FA'));
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 2FA \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx("div", { className: "wrap", children: _jsxs(Card, { className: "w-full max-w-[560px]", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-techno text-techno-glow", children: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 2FA" }), _jsxs(Link, { to: "/settings/profile", className: "btn ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs", children: [_jsx("span", { "aria-hidden": "true", children: "\u21A9" }), "\u041A \u043F\u0440\u043E\u0444\u0438\u043B\u044E"] })] }), loadingStatus ? (_jsx("p", { className: "hint", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F..." })) : statusError ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: statusError }), _jsx("div", { className: "mt-4", children: _jsx(Button, { type: "button", variant: "ghost", onClick: loadStatus, children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }) })] })) : null, !loadingStatus && !statusError && step === 'already' && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200", children: "\u0414\u0432\u0443\u0445\u0444\u0430\u043A\u0442\u043E\u0440\u043D\u0430\u044F \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u0443\u0436\u0435 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430." }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { type: "button", onClick: () => navigate('/settings/profile'), children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F" }) })] })), !loadingStatus && !statusError && step === 'password' && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "label", children: "\u0428\u0430\u0433 1. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" }), error && (_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: error })), _jsx(Input, { type: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: continueToCode, children: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate('/settings/profile'), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] })), !loadingStatus && !statusError && step === 'confirm' && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "label", children: "\u0428\u0430\u0433 2. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434 \u0438\u0437 Google Authenticator" }), error && (_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: error })), _jsx(Input, { inputMode: "numeric", value: code, onChange: (e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6)), placeholder: "6 \u0446\u0438\u0444\u0440" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: disableTwoFa, disabled: busy, children: busy ? 'Отключение...' : 'Отключить 2FA' }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setStep('password'), children: "\u041D\u0430\u0437\u0430\u0434" })] })] })), !loadingStatus && !statusError && step === 'done' && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200", children: "2FA \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430." }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { type: "button", onClick: () => navigate('/settings/profile'), children: "\u041A \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }) })] }))] }) })] }));
}
function normalizeDisableError(error, fallback) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const code = typeof data === 'object' && data !== null ? data.error : null;
    if (code === 'bad_password' || status === 403)
        return 'Неверный пароль';
    if (code === 'invalid_2fa_code')
        return 'Неверный код из Google Authenticator';
    if (code === '2fa_not_enabled')
        return '2FA уже отключена';
    if (code === 'bad_request' || status === 400)
        return 'Проверьте введённые данные';
    if (status === 401)
        return 'Сессия истекла. Войдите снова';
    const message = error?.message;
    if (typeof message === 'string' && message.trim()) {
        if (/^Request failed with status code \d+$/i.test(message))
            return fallback;
        return message;
    }
    return fallback;
}
