import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { http } from '@/shared/api/http';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import Footer from '@/shared/ui/Footer';


export default function CodeVerifyPage({ mode }:{ mode: 'email-verify'|'reset' }){
const [sp] = useSearchParams();
const email = sp.get('email') || '';
const ticket = sp.get('ticket') || '';
const nav = useNavigate();
const { setTokens } = authStore();


const [code, setCode] = useState('');
const [resendLock, setResendLock] = useState(0);


useEffect(()=>{
if (resendLock<=0) return; const id = setInterval(()=>setResendLock(x=>x-1), 1000); return ()=>clearInterval(id);
}, [resendLock]);


async function confirm(){
if (!/^\d{6}$/.test(code)) return;
if (mode === 'email-verify'){
const { data } = await http.post(endpoints.verifyEmailConfirm, { ticket, code });
setTokens(data.accessToken, data.refreshToken);
nav('/', { replace: true });
} else {
const { data } = await http.post(endpoints.resetConfirm, { ticket, code });
nav(`/auth/reset/new?token=${encodeURIComponent(data.resetToken)}&email=${encodeURIComponent(email)}`);
}
}


async function resend(){
const url = mode==='email-verify' ? endpoints.verifyEmailResend : endpoints.resetResend;
await http.post(url, { ticket });
setResendLock(60);
}


return (
<div className="wrap">
<Card>
<h1 className="text-2xl mb-2">Код из письма</h1>
<p className="hint mb-3">Мы отправили код на {email}</p>


<label className="label">Код</label>
<Input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="6 цифр" />


<div className="flex gap-2 mt-4">
<Button onClick={confirm} disabled={!/^\d{6}$/.test(code)}>Подтвердить</Button>
<Button variant="ghost" onClick={resend} disabled={resendLock>0}>
{resendLock>0 ? `Повторить через ${resendLock}s` : 'Отправить код снова'}
</Button>
</div>
</Card>
<Footer />
</div>
);
}