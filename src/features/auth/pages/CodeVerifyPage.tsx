import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { http } from '@/shared/api/http';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { endpoints } from '@/shared/api/endpoints';
import Footer from '@/shared/ui/Footer';
import type { VerifyEmailReq, VerifyEmailRes, ResetConfirmReq, ResetConfirmRes } from '@/shared/api/types';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { authStore } from '@/shared/store/auth';

export default function CodeVerifyPage({ mode }:{ mode: 'email-verify'|'reset' }){
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [serverErr, setServerErr] = useState<string|null>(null);
  const [resendLock, setResendLock] = useState(0);

  const ticket = sp.get('ticket') || '';
  const email  = sp.get('email')  || '';
  const next   = sp.get('next')   || '/profile';

  useEffect(() => {
    if (resendLock <= 0) return;
    const t = setTimeout(() => setResendLock((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [resendLock]);

  async function confirm() {
  try {
    setServerErr(null);
    if (mode === 'email-verify') {
      const body: VerifyEmailReq = { ticket, code };
      const at = authStore.getState().accessToken;
      const { data } = await http.post<VerifyEmailRes>(
        endpoints.verifyEmailConfirm,
        body,
        { headers: { Authorization: `Bearer ${at}` } }
      );

      const me = await finalizeAuth(data.accessToken);

      const target = next && next !== '/profile' ? next : `/u/${me.username}`;
      navigate(target, { replace: true });
      return;
    }

    const body: ResetConfirmReq = { ticket, code };
    const { data } = await http.post<ResetConfirmRes>(endpoints.resetConfirm, body);
    navigate(`/auth/reset/new?token=${encodeURIComponent(data.resetToken)}&next=${encodeURIComponent(next)}`, { replace: true });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || 'Неверный код';
    setServerErr(msg);
  }
}

  async function resend() {
    try {
      setServerErr(null);
      if (mode === 'email-verify') {
          const at = authStore.getState().accessToken;
          await http.post(
            endpoints.verifyEmailResend,
            { ticket, email },
            { headers: { Authorization: `Bearer ${at}` } }
          );
      } else {
        await http.post(endpoints.resetResend, { ticket, email });
      }
      setResendLock(30);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Не удалось отправить код';
      setServerErr(msg);
    }
  }

  return (
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">{mode === 'email-verify' ? 'Подтверждение почты' : 'Подтверждение сброса'}</h1>

        {serverErr && <div className="error" role="alert" style={{ display: 'block' }}>{serverErr}</div>}

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
