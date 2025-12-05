import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Button } from '@/shared/ui/button/Button';
import { Input } from '@/shared/ui/form/Input';
import { Card } from '@/shared/ui/card/Card';
import { FormHint } from '@/shared/ui/form/FormHint';
import PasswordField from '../components/PasswordField';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { LoginRes } from '@/shared/api/types';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { endpoints } from '@/shared/api/endpoints';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { useSessionKeyStore } from '@/stores/sessionKeyStore';

const schema = z.object({
  email: z.string().email({ message: 'Некорректная почта' }),
  password: z.string().min(1, 'Введите пароль'),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  useWallpaper();

  const user = authStore((s) => s.user);
  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const rawRedirect = sp.get('redirect_uri') || sessionStorage.getItem('redirect_uri');

  useEffect(() => {
    const raw = sp.get('redirect_uri');
    if (raw) sessionStorage.setItem('redirect_uri', raw);
  }, [search, sp]);

  const redirectUri = (() => {
    if (!rawRedirect) return null;
    try {
      const url = new URL(rawRedirect);
      if (url.protocol === 'http:' && url.hostname === 'localhost') return rawRedirect;
      return null;
    } catch {
      return null;
    }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, touchedFields },
    getValues,
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
        let me = await http.get(endpoints.profileMe, { withCredentials: true });
        let data = await http.post(endpoints.desktopToken, null, {
          withCredentials: true,
          validateStatus: () => true,
        });

        if (data?.data?.accessToken && data?.data?.refreshToken) {
          const { accessToken, refreshToken } = data.data;
          await notifyLauncher({
            accessToken,
            refreshToken,
            user: authStore.getState().user ?? me.data,
          });
          
          if (!cancelled) {
            const user = await finalizeAuth(accessToken).catch(() => me.data);
            if (user?.username) {
              navigate(`/u/${user.username}`, { replace: true });
            }
          }
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [redirectUri, navigate]);

  async function onSubmit(v: Form) {
    try {
      const { data } = await http.post<LoginRes>(endpoints.login, v);
      const me = await finalizeAuth(data.accessToken);
      
      // ☁️ CLOUD MODEL: Store only session credentials for authentication
      if (data.sessionId && data.deviceId) {
        authStore.getState().setSessionCredentials(data.sessionId, data.deviceId, data.sessionKey, data.sessionKeyIv);
        
        // Initialize session store (only for authentication, not encryption)
        const sessionKeyStore = useSessionKeyStore.getState();
        if (data.sessionKey && me?.id) {
          sessionKeyStore.initializeSession(me.id, data.sessionKey, 1, v.password);
        }
      }
      
      // NOTE: WebSocket connection handled by SocialFloatingButton component
      // No need to connect here to avoid duplicate connections

      if (redirectUri && data.refreshToken) {
        await notifyLauncher({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: me,
        });
        if (me?.username) navigate(`/u/${me.username}`, { replace: true });
      } else if (me?.username) {
        navigate(`/u/${me.username}`, { replace: true });
      }
    } catch (e: any) {
      setServerErr(e?.response?.data || e?.message || 'Ошибка входа');
    }
  }

  async function notifyLauncher(tokens: { accessToken: string; refreshToken: string; user: any }) {
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
    <>
    <Seo title="Вход — ArchiTech MC" robots="noindex,follow" />
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4 text-center">Вход</h1>

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
            className={errors.email ? 'is-err' : (touchedFields.email && watch('email') && !errors.email) ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.email}>{errors.email?.message}</FormHint>

          <label className="label">Пароль</label>
          <PasswordField
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            className={errors.password ? 'is-err' : (touchedFields.password && watch('password') && !errors.password) ? 'is-ok' : ''}
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
    </div>
    </>
  );
}
