import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { FormHint } from '@/shared/ui/FormHint';
import Footer from '@/shared/ui/Footer';
import { Seo } from '@/shared/seo/seo';

export default function ChangeEmailNewPage(){
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const ct = sp.get('ct') || '';
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string|undefined>();
  const [busy, setBusy] = useState(false);

  async function save(){
    if (!email.trim() || !ct) return;
    setBusy(true); setErr(undefined);
    try{
      await http.post(endpoints.accountEmailChangeSet, { changeToken: ct, email: email.trim() });
      nav('/settings/profile', { replace:true });
    }catch(e:any){
      setErr(e?.response?.data || e?.message || 'Не удалось сменить почту');
    }finally{ setBusy(false); }
  }

  return (
    <>
    <Seo title="Настройки — ArchiTech MC" robots="noindex,follow" />
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Новый e-mail</h1>
        {err && <div className="error mb-2" role="alert">{err}</div>}
        <label className="label">Новый e-mail</label>
        <Input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
        <FormHint>После сохранения адрес обновится в аккаунте</FormHint>
        <div className="flex gap-2 mt-3">
          <Button onClick={save} disabled={busy || !email.trim()}>Сохранить</Button>
          <Button variant="ghost" onClick={()=>nav('/settings/profile')}>Отмена</Button>
        </div>
      </Card>
      <Footer/>
    </div>
    </>
  );
}