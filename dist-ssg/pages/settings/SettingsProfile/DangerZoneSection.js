import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../shared/api/http.js';
import { authStore } from '../../../shared/store/auth.js';
import { Card } from './components.js';
export function DangerZoneSection({ onLogout }) {
    const navigate = useNavigate();
    const [delOpen, setDelOpen] = useState(false);
    const [delPwd, setDelPwd] = useState('');
    const [delConfirm, setDelConfirm] = useState('');
    const [delBusy, setDelBusy] = useState(false);
    const [delErr, setDelErr] = useState(null);
    const deleteAccount = async () => {
        if (delConfirm !== 'DELETE' || !delPwd)
            return;
        setDelBusy(true);
        setDelErr(null);
        try {
            const token = authStore.getState().accessToken;
            await http.delete('/api/v1/account', {
                withCredentials: false,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                data: { password: delPwd },
            });
            // Выход после удаления
            try {
                await http.post('/api/auth/logout', null, { withCredentials: true });
            }
            catch { }
            authStore.setState({ accessToken: null, user: null });
            navigate('/auth/login', { replace: true });
        }
        catch (e) {
            const err = e;
            const msg = err?.response?.data || err?.message || 'Не удалось удалить аккаунт';
            setDelErr(String(msg));
        }
        finally {
            setDelBusy(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-red-300", children: "\u041E\u043F\u0430\u0441\u043D\u0430\u044F \u0437\u043E\u043D\u0430" }), _jsxs("div", { className: "space-y-3", children: [_jsx("button", { onClick: onLogout, className: "w-full rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20", children: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" }), _jsx("div", { className: "rounded-xl border border-red-900/60 bg-red-950/20 p-3", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-red-300", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }), _jsx("div", { className: "text-xs text-red-400/80", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E! \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u043F\u043E\u0441\u043B\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E." })] }), _jsx("button", { onClick: () => setDelOpen(true), className: "rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C\u2026" })] }) })] })] }), delOpen && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/60", onClick: () => setDelOpen(false) }), _jsxs("div", { className: "relative z-10 w-[520px] max-w-[95vw] rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl", children: [_jsx("h3", { className: "mb-2 text-base font-semibold text-red-300", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }), _jsxs("p", { className: "mb-4 text-sm text-slate-300", children: ["\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 ", _jsx("b", { children: "DELETE" }), " \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F."] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "mb-1 block text-xs text-slate-400", children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435" }), _jsx("input", { value: delConfirm, onChange: (e) => setDelConfirm(e.target.value), placeholder: "DELETE", className: "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500" })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "mb-1 block text-xs text-slate-400", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: delPwd, onChange: (e) => setDelPwd(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500" })] }), delErr && (_jsx("div", { className: "mb-3 rounded-xl border border-red-800 bg-red-950/40 p-2 text-sm text-red-300", children: delErr })), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => setDelOpen(false), className: "rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: deleteAccount, disabled: delBusy || delConfirm !== 'DELETE' || !delPwd, className: "rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20 disabled:opacity-50", children: delBusy ? 'Удаляю…' : 'Удалить' })] })] })] }))] }));
}
