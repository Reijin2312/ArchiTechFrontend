import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { Button } from '../../shared/ui/button/Button.js';
import { Input } from '../../shared/ui/form/Input.js';
import { Card } from '../../shared/ui/card/Card.js';
import { FormHint } from '../../shared/ui/form/FormHint.js';
import { Seo } from '../../shared/seo/seo.js';
const schema = z.object({
    old: z.string().min(1, 'Введите текущий пароль'),
    pw1: z.string().min(8).regex(/[A-Za-z]/, 'нужны буквы').regex(/\d/, 'нужны цифры'),
    pw2: z.string()
}).refine(v => v.pw1 === v.pw2, { path: ['pw2'], message: 'Не совпадает' });
export default function ChangePasswordPage() {
    const nav = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
    async function onSubmit(v) {
        await http.post(endpoints.accountPasswordChange, {
            oldPassword: v.old,
            newPassword: v.pw1,
        });
        nav('/settings/profile', { replace: true });
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u0421\u0431\u0440\u043E\u0441 \u043F\u0430\u0440\u043E\u043B\u044F \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx("div", { className: "wrap", children: _jsxs(Card, { children: [_jsx("h1", { className: "text-2xl mb-4", children: "\u0421\u043C\u0435\u043D\u0430 \u043F\u0430\u0440\u043E\u043B\u044F" }), _jsx("label", { className: "label", children: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C" }), _jsx(Input, { type: "password", autoComplete: "current-password", ...register('old') }), _jsx(FormHint, { children: errors.old?.message }), _jsx("label", { className: "label mt-3", children: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C" }), _jsx(Input, { type: "password", autoComplete: "new-password", ...register('pw1') }), _jsx(FormHint, { children: errors.pw1?.message || 'Мин. 8 символов, буквы и цифры' }), _jsx("label", { className: "label mt-3", children: "\u041F\u043E\u0432\u0442\u043E\u0440" }), _jsx(Input, { type: "password", autoComplete: "new-password", ...register('pw2') }), _jsx(FormHint, { children: errors.pw2?.message }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx(Button, { disabled: isSubmitting, children: "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C" }), _jsx(Button, { variant: "ghost", onClick: () => nav('/settings/profile'), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) })] }));
}
