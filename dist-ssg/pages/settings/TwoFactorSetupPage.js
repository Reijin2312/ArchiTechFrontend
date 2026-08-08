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
import QRCode from 'qrcode';
export default function TwoFactorSetupPage() {
    useWallpaper();
    const navigate = useNavigate();
    const [step, setStep] = useState('password');
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState(null);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [setupData, setSetupData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState(null);
    useEffect(() => {
        void loadStatus();
    }, []);
    useEffect(() => {
        if (!copied)
            return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);
    useEffect(() => {
        let cancelled = false;
        async function buildQr() {
            if (!setupData?.otpauthUri) {
                setQrDataUrl('');
                setQrError(null);
                setQrLoading(false);
                return;
            }
            setQrLoading(true);
            setQrError(null);
            try {
                const dataUrl = await QRCode.toDataURL(setupData.otpauthUri, {
                    width: 260,
                    margin: 1,
                    color: {
                        dark: '#e2e8f0',
                        light: '#00000000',
                    },
                });
                if (!cancelled) {
                    setQrDataUrl(dataUrl);
                }
            }
            catch {
                if (!cancelled) {
                    setQrDataUrl('');
                    setQrError('Не удалось сгенерировать QR-код');
                }
            }
            finally {
                if (!cancelled) {
                    setQrLoading(false);
                }
            }
        }
        void buildQr();
        return () => {
            cancelled = true;
        };
    }, [setupData?.otpauthUri]);
    async function loadStatus() {
        setLoadingStatus(true);
        setStatusError(null);
        try {
            const { data } = await http.get(endpoints.account2faStatus, { withCredentials: true });
            if (data.enabled) {
                setStep('already');
            }
            else {
                setStep('password');
            }
        }
        catch (e) {
            setStatusError(normalizeSetupError(e, 'Не удалось загрузить состояние 2FA'));
        }
        finally {
            setLoadingStatus(false);
        }
    }
    async function startSetup() {
        if (!password.trim()) {
            setError('Введите пароль аккаунта');
            return;
        }
        setBusy('start');
        setError(null);
        try {
            const { data } = await http.post(endpoints.account2faSetupStart, { password }, { withCredentials: true });
            setSetupData(data);
            setCode('');
            setStep('confirm');
        }
        catch (e) {
            setError(normalizeSetupError(e, 'Не удалось начать настройку 2FA'));
        }
        finally {
            setBusy(null);
        }
    }
    async function confirmSetup() {
        if (!/^\d{6}$/.test(code)) {
            setError('Введите 6-значный код из Google Authenticator');
            return;
        }
        setBusy('confirm');
        setError(null);
        try {
            await http.post(endpoints.account2faSetupConfirm, { code }, { withCredentials: true });
            setStep('done');
        }
        catch (e) {
            setError(normalizeSetupError(e, 'Не удалось включить 2FA'));
        }
        finally {
            setBusy(null);
        }
    }
    async function copySecret() {
        if (!setupData?.secret)
            return;
        try {
            await navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
        }
        catch {
            setCopied(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 2FA \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx("div", { className: "wrap", children: _jsxs(Card, { className: "w-full max-w-[560px]", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-techno text-techno-glow", children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 2FA" }), _jsxs(Link, { to: "/settings/profile", className: "btn ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs", children: [_jsx("span", { "aria-hidden": "true", children: "\u21A9" }), "\u041A \u043F\u0440\u043E\u0444\u0438\u043B\u044E"] })] }), loadingStatus ? (_jsx("p", { className: "hint", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F..." })) : statusError ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: statusError }), _jsx("div", { className: "mt-4", children: _jsx(Button, { type: "button", variant: "ghost", onClick: loadStatus, children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }) })] })) : null, !loadingStatus && !statusError && step === 'already' && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200", children: "\u0414\u0432\u0443\u0445\u0444\u0430\u043A\u0442\u043E\u0440\u043D\u0430\u044F \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u0443\u0436\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430." }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { type: "button", onClick: () => navigate('/settings/profile'), children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F" }) })] })), !loadingStatus && !statusError && step === 'password' && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "label", children: "\u0428\u0430\u0433 1. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" }), error && (_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: error })), _jsx(Input, { type: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: startSetup, disabled: busy === 'start', children: busy === 'start' ? 'Проверка...' : 'Продолжить' }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate('/settings/profile'), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] })), !loadingStatus && !statusError && step === 'confirm' && setupData && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "label", children: "\u0428\u0430\u0433 2. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0432 Google Authenticator" }), error && (_jsx("div", { className: "error", role: "alert", style: { display: 'block' }, children: error })), _jsxs("div", { className: "rounded-2xl border border-slate-700 bg-slate-950/50 p-4", children: [_jsx("div", { className: "mx-auto mb-4 w-fit rounded-xl border border-slate-700 bg-slate-900/70 p-3", children: qrLoading ? (_jsx("div", { className: "grid h-[220px] w-[220px] place-items-center rounded-lg bg-slate-900 text-xs text-slate-400", children: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F QR..." })) : qrDataUrl ? (_jsx("img", { src: qrDataUrl, alt: "QR \u043A\u043E\u0434 \u0434\u043B\u044F 2FA", className: "h-[220px] w-[220px] rounded-lg", loading: "lazy" })) : (_jsx("div", { className: "grid h-[220px] w-[220px] place-items-center rounded-lg bg-slate-900 px-4 text-center text-xs text-red-300", children: qrError || 'QR недоступен' })) }), _jsx("p", { className: "mb-2 text-xs text-slate-300", children: "\u0418\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043B\u044E\u0447 \u0432\u0440\u0443\u0447\u043D\u0443\u044E:" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("code", { className: "rounded-lg bg-black/40 px-3 py-1 text-[12px] text-sky-300", children: setupData.secret }), _jsx("button", { type: "button", onClick: copySecret, title: copied ? 'Скопировано' : 'Скопировать ключ', "aria-label": copied ? 'Скопировано' : 'Скопировать ключ', className: `inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${copied
                                                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                                        : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/60 hover:text-sky-200'}`, children: copied ? _jsx(CheckIcon, {}) : _jsx(CopyIcon, {}) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "\u041A\u043E\u0434 \u0438\u0437 Google Authenticator" }), _jsx(Input, { inputMode: "numeric", value: code, onChange: (e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6)), placeholder: "6 \u0446\u0438\u0444\u0440" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: confirmSetup, disabled: busy === 'confirm', children: busy === 'confirm' ? 'Подтверждение...' : 'Включить 2FA' }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setStep('password'), children: "\u041D\u0430\u0437\u0430\u0434" })] })] })), !loadingStatus && !statusError && step === 'done' && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200", children: "2FA \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430. \u041F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0432\u0445\u043E\u0434\u0435 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D \u043A\u043E\u0434 \u0438\u0437 Google Authenticator." }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { type: "button", onClick: () => navigate('/settings/profile'), children: "\u041A \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }) })] }))] }) })] }));
}
function CopyIcon() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", className: "h-5 w-5", fill: "none", stroke: "currentColor", strokeWidth: "1.8", children: [_jsx("rect", { x: "9", y: "9", width: "10", height: "10", rx: "2" }), _jsx("rect", { x: "5", y: "5", width: "10", height: "10", rx: "2" })] }));
}
function CheckIcon() {
    return (_jsx("svg", { viewBox: "0 0 24 24", className: "h-5 w-5", fill: "none", stroke: "currentColor", strokeWidth: "2.2", children: _jsx("path", { d: "M5 13l4 4L19 7" }) }));
}
function normalizeSetupError(error, fallback) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const code = typeof data === 'object' && data !== null ? data.error : null;
    if (code === 'bad_password' || status === 403)
        return 'Неверный пароль';
    if (code === 'invalid_2fa_code')
        return 'Неверный код из Google Authenticator';
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
