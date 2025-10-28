import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import Footer from '@/shared/ui/Footer';

export default function ChangeEmailPage(){
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode]   = useState('');
  const [err, setErr] = useState<string|undefined>();
  const [notice, setNotice] = useState<string|undefined>();
  const [busy, setBusy] = useState<'send'|'confirm'|null>(null);

  async function send(){
    if(!email.trim()) return;
    setBusy('send'); setErr(undefined); setNotice(undefined);
    try{
      await http.post(endpoints.accountEmailChange, { email: email.trim() });
      setNotice('Код отправлен на почту. Введите код из письма.');
    }catch(e:any){
      setErr(e?.response?.data || e?.message || 'Ошибка запроса');
    }finally{ setBusy(null); }
  }

  async function confirm(){
    if(!code.trim()) return;
    setBusy('confirm'); setErr(undefined);
    try{
      await http.post(endpoints.accountEmailConfirm, { code: code.trim() });
      nav('/settings/profile', { replace:true });
    }catch(e:any){
      setErr(e?.response?.data || e?.message || 'Неверный или просроченный код');
    }finally{ setBusy(null); }
  }

  return (
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Смена e-mail</h1>

        {err && <div className="error mb-2" role="alert">{err}</div>}
        {notice && <div className="hint mb-2">{notice}</div>}

        <label className="label">Новый e-mail</label>
        <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
        <FormHint>На этот адрес придёт код подтверждения</FormHint>

        <div className="flex gap-2 mt-3">
          <Button onClick={send} disabled={busy==='send' || !email.trim()}>Отправить код</Button>
          <Button variant="ghost" onClick={()=>nav('/settings/profile')}>Отмена</Button>
        </div>

        <div className="sep" />

        <label className="label">Код из письма</label>
        <Input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" placeholder="6 цифр"/>
        <div className="flex gap-2 mt-3">
          <Button onClick={confirm} disabled={busy==='confirm' || !code.trim()}>Подтвердить</Button>
        </div>
      </Card>
      <Footer />
    </div>
  );
}
