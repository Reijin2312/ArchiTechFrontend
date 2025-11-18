import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Seo } from '@/shared/seo/seo';

export default function EmailChangeStartPage(){
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function begin(){
    try{
      setBusy(true); setErr(null);
      const { data } = await http.post(
        endpoints.accountEmailChangeOldBegin,
        {},
        { withCredentials: true }
      );
      const qs = new URLSearchParams({ ticket: data.ticket, email: data.email, next: '/settings/email/new' });
      nav('/verify/email-change-old?' + qs.toString(), { replace: true });
    }catch(e:any){
      setErr(e?.response?.data?.message || e?.message || 'Не удалось начать смену почты');
    }finally{ setBusy(false); }
  }

  return (
    <>
    <Seo title="Настройки — ArchiTech MC" robots="noindex,follow" />
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Смена e-mail</h1>
        {err && <div className="error mb-2" role="alert">{err}</div>}
        <p className="hint mb-3">Шаг 1. Подтвердите владение текущим адресом. Мы отправим код на вашу старую почту.</p>
        <Button onClick={begin} disabled={busy}>Отправить код на старый e-mail</Button>
      </Card>
    </div>
    </>
  );
}
