import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import PasswordField from '../components/PasswordField';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Footer from '@/shared/ui/Footer';
import type { LoginRes } from '@/shared/api/types';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { endpoints } from '@/shared/api/endpoints';

const schema = z.object({
  email: z.string().email({ message: 'Некорректная почта' }),
  password: z.string().min(1, 'Введите пароль'),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const user = authStore((s) => s.user);
  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const rawRedirect = sp.get('redirect_uri') || sessionStorage.getItem('redirect_uri');

  useEffect(() => {
    const raw = sp.get('redirect_uri');
    if (raw) sessionStorage.setItem('redirect_uri', raw);
  }, [search]);

  const redirectUri = (() => {
    if (!rawRedirect) return null;
    let s = rawRedirect;
    try {
      for (let i = 0; i < 2 && /^https?%3A/i.test(s); i++) s = decodeURIComponent(s);
      const u = new URL(s);
      if (!/^https?:$/.test(u.protocol)) return null;
      if (!/^(localhost|127\.0\.0\.1|::1)$/i.test(u.hostname)) return null;
      if (!(u.pathname === '/cb' || u.pathname === '/cb/')) return null;
      return `${u.origin}/cb`;
    } catch { return null; }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    getValues,
    setError,
    watch,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    shouldFocusError: true,
  });
  watch();

  useEffect(() => {
    if (user && !redirectUri) navigate('/profile', { replace: true });
    setServerErr(null);
  }, [user, navigate, redirectUri]);

  useEffect(() => {
    if (!redirectUri) return;

    let cancelled = false;
    (async () => {
      try {      
        let me = await http.get(endpoints.profileMe, { withCredentials: true })
          .then(r => r.data).catch(() => null);

        let { data } = await http.post(endpoints.desktopToken, null, {
          withCredentials: true, validateStatus: () => true,
        });

        if (!data?.accessToken || !data?.refreshToken) {
          const r2 = await http.post(endpoints.desktopToken, null, {
            withCredentials: true, validateStatus: () => true,
          });
          if (r2?.data) data = r2.data;
        }

        if (!cancelled && data?.accessToken && data?.refreshToken) {
          await notifyLauncher({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: authStore.getState().user ?? me,
          });
          me = await finalizeAuth(data.accessToken).catch(() => me);
          if (me?.username) {
            navigate(`/u/${me.username}`, { replace: true });
            return;
          }
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [redirectUri, navigate]);

  async function onSubmit(v: Form) {
    try {
      const { data } = await http.post<LoginRes>(endpoints.login, v);
      const { accessToken, refreshToken, user } = data;
      const me = await finalizeAuth(data.accessToken);
      await notifyLauncher({accessToken, refreshToken, user: user ?? me,});
      setServerErr(null);
      navigate(`/u/${me.username}`, { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Неверная почта или пароль';
      setServerErr(msg);
      setError('password', { type: 'server', message: msg });
    }
  }

  async function notifyLauncher(tokens: {accessToken: string; refreshToken: string; user: any}) {
    if (!redirectUri) return;
    try {
      await fetch(redirectUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens),
        mode: 'cors',
        keepalive: true,
      });
    } catch {}
  }

  async function startReset() {
    const emailVal = (getValues('email') || '').trim();
    if (!emailVal) { setServerErr('Введите email для сброса пароля'); return; }

    try {
      const next = location.pathname + (location.search || '') || '/profile';
      const { data } = await http.post(
        endpoints.resetBegin,
        { email: emailVal },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      const qs = new URLSearchParams({
      ticket: data.ticket, email: emailVal, next,
      ...(redirectUri ? { redirect_uri: redirectUri } : {})
      }).toString();
      navigate('/auth/reset/code?' + qs, { replace: true });
    } catch (e: any) {
      setServerErr(e?.response?.data || e?.message || 'Не удалось начать сброс пароля');
    }
  }

  useEffect(() => {
    if (serverErr) setServerErr(null);
  }, [watch('email'), watch('password')]);

  return (
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Вход</h1>

        {serverErr && (
          <div className="error" role="alert" style={{ display: 'block' }}>
            {serverErr}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <label className="label">Почта</label>
          <Input
            autoComplete="email"
            {...register('email')}
            error={!!errors.email}
            className={errors.email ? 'is-err' : watch('email') ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.email}>{errors.email?.message}</FormHint>

          <label className="label">Пароль</label>
          <PasswordField
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            className={errors.password ? 'is-err' : watch('password') ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.password}>{errors.password?.message}</FormHint>

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              Войти
            </Button>
            <Button type="button" variant="ghost" onClick={startReset}>
              Забыли пароль?
            </Button>
            <Link to="/auth/register" className="btn ghost">
              Регистрация
            </Link>
          </div>
        </form>
      </Card>
      <Footer />
    </div>
  );
}
