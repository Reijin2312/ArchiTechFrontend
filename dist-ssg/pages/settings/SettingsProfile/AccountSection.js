import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { http } from '../../../shared/api/http.js';
import { endpoints } from '../../../shared/api/endpoints.js';
import { Card, InputRow, inp } from './components.js';
export function AccountSection({ email, setEmail, pwdDummy, setPwdDummy, newUsername, setNewUsername, usernameOk, currentUsername, busy, onUsernameChange, onError, }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [twoFaStatus, setTwoFaStatus] = useState(null);
    const [twoFaLoading, setTwoFaLoading] = useState(true);
    const [twoFaError, setTwoFaError] = useState(null);
    useEffect(() => {
        void loadTwoFaStatus();
    }, []);
    const handlePasswordReset = async () => {
        onError('');
        const emailVal = email.trim();
        if (!emailVal) {
            onError('Введите email для сброса пароля');
            return;
        }
        try {
            const next = location.pathname + (location.search || '') || '/profile';
            const { data } = await http.post(endpoints.resetBegin, { email: emailVal }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
            const qs = new URLSearchParams({ ticket: data.ticket, email: emailVal, next }).toString();
            navigate('/auth/reset/code?' + qs, { replace: true });
        }
        catch (e) {
            onError(normalizeAccountError(e, 'Не удалось начать сброс пароля'));
        }
    };
    async function loadTwoFaStatus() {
        setTwoFaLoading(true);
        setTwoFaError(null);
        try {
            const { data } = await http.get(endpoints.account2faStatus, { withCredentials: true });
            setTwoFaStatus(data);
        }
        catch (e) {
            setTwoFaError(normalizeTwoFaError(e, 'Не удалось загрузить состояние 2FA'));
        }
        finally {
            setTwoFaLoading(false);
        }
    }
    function openTwoFaSetupPage() {
        navigate('/settings/2fa/setup');
    }
    function openTwoFaDisablePage() {
        navigate('/settings/2fa/disable');
    }
    const isTwoFaEnabled = !!twoFaStatus?.enabled;
    return (_jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u0423\u0447\u0451\u0442\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C" }), _jsx(InputRow, { label: "Email", children: _jsxs("div", { className: "flex w-full items-stretch gap-2", children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "user@example.com", className: inp() + ' flex-1' }), _jsx("button", { type: "button", onClick: () => navigate('/settings/email'), className: "flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800", title: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C email", children: _jsxs("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }) })] }) }), _jsx(InputRow, { label: "\u041F\u0430\u0440\u043E\u043B\u044C", children: _jsxs("div", { className: "flex w-full items-stretch gap-2", children: [_jsx("input", { type: "password", value: pwdDummy, onChange: (e) => setPwdDummy(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: inp() + ' flex-1' }), _jsx("button", { type: "button", disabled: busy === 'pwd', onClick: handlePasswordReset, className: "flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50", title: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C", children: _jsxs("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }) })] }) }), _jsxs(InputRow, { label: "\u041B\u043E\u0433\u0438\u043D", children: [_jsxs("div", { className: "flex w-full items-stretch gap-2", children: [_jsx("input", { value: newUsername, onChange: (e) => setNewUsername(e.target.value), className: inp() + ' flex-1' }), _jsx("button", { disabled: busy === 'username' ||
                                    !newUsername.trim() ||
                                    usernameOk !== true ||
                                    newUsername.trim().toLowerCase() === currentUsername.toLowerCase(), onClick: onUsernameChange, className: "flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", title: "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043B\u043E\u0433\u0438\u043D", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", className: "h-4 w-4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }) })] }), usernameOk === false && _jsx("p", { className: "mt-1 text-xs text-red-400", children: "\u041B\u043E\u0433\u0438\u043D \u0437\u0430\u043D\u044F\u0442 \u0438\u043B\u0438 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0435\u043D" }), usernameOk === true && newUsername.toLowerCase() !== currentUsername.toLowerCase() && (_jsx("p", { className: "mt-1 text-xs text-green-400", children: "\u0414\u043E\u0441\u0442\u0443\u043F\u0435\u043D" }))] }), _jsxs("div", { className: "mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-sky-300", children: "\u0414\u0432\u0443\u0445\u0444\u0430\u043A\u0442\u043E\u0440\u043D\u0430\u044F \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F" }), _jsx("p", { className: "mt-1 text-xs text-slate-400", children: "Google Authenticator (TOTP)" })] }), !twoFaLoading && (_jsx("span", { className: `rounded-full px-2 py-1 text-[11px] font-medium ${isTwoFaEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-700/60 text-slate-300 border border-slate-600'}`, children: isTwoFaEnabled ? 'Включено' : 'Выключено' }))] }), twoFaError && _jsx("p", { className: "mt-3 text-xs text-red-400", children: twoFaError }), twoFaLoading && _jsx("p", { className: "mt-3 text-xs text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F 2FA..." }), !twoFaLoading && (_jsx("div", { className: "mt-3 space-y-3", children: isTwoFaEnabled ? (_jsx("button", { type: "button", onClick: openTwoFaDisablePage, className: "rounded-xl border border-red-500/60 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F 2FA" })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: openTwoFaSetupPage, className: "rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0430\u0441\u0442\u0435\u0440 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 2FA" }), twoFaStatus?.pendingSetup && (_jsx("p", { className: "text-xs text-amber-300", children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u0442\u0430, \u043D\u043E \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440 \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043A\u043E\u0434." }))] })) }))] })] }));
}
function normalizeAccountError(error, fallback) {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim())
        return data;
    const message = error?.message;
    if (typeof message === 'string' && message.trim())
        return message;
    return fallback;
}
function normalizeTwoFaError(error, fallback) {
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
    const message = normalizeAccountError(error, fallback);
    if (/^Request failed with status code \d+$/i.test(message))
        return fallback;
    return message;
}
