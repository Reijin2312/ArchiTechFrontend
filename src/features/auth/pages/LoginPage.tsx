import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Button } from '@/shared/ui/button/Button';
import { Input } from '@/shared/ui/form/Input';
import AuthPageShell from '../components/AuthPageShell';
import { FormHint } from '@/shared/ui/form/FormHint';
import PasswordField from '../components/PasswordField';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { LoginRes, LoginSuccessRes } from '@/shared/api/types';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { endpoints } from '@/shared/api/endpoints';
import { normalizeErrorMessage, requestDesktopToken } from '@/shared/auth/utils';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { useSessionKeyStore } from '@/stores/sessionKeyStore';
import { clearPendingLoginPassword, setPendingLoginPassword } from '@/shared/auth/pendingLoginPassword';

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
  const deviceCode = sp.get('device') || null;

  const rawRedirect = sp.get('redirect_uri') || sessionStorage.getItem('redirect_uri');

  useEffect(() => {
    const raw = sp.get('redirect_uri');
    if (raw) sessionStorage.setItem('redirect_uri', raw);
  }, [search, sp]);

  const redirectUri = (() => {
    if (!rawRedirect || deviceCode) return null;
    try {
      const url = new URL(rawRedirect);
      const host = url.hostname;
      const isLoopback =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '[::1]' ||
        host.startsWith('127.');
      if (url.protocol === 'http:' && isLoopback) return rawRedirect;
      return null;
    } catch {
      return null;
    }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
    getValues,
    watch,
    setError,
    clearErrors,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    shouldFocusError: true,
  });
  watch();
  const emailValue = watch('email') ?? '';
  const passwordValue = watch('password') ?? '';
  const lastInputRef = useRef({ email: emailValue, password: passwordValue });
  const hasClientValidationErrors = Boolean(
    (errors.email && errors.email.type !== 'server') || (errors.password && errors.password.type !== 'server'),
  );
  const canSubmit =
    !isSubmitting &&
    !hasClientValidationErrors &&
    emailValue.trim().length > 0 &&
    passwordValue.trim().length > 0;
  const emailFieldHint = errors.email?.type === 'server' ? undefined : errors.email?.message;
  const passwordFieldHint = errors.password?.type === 'server' ? undefined : errors.password?.message;

  useEffect(() => {
    if (deviceCode) return;
    if (user && !redirectUri) navigate('/profile', { replace: true });
    setServerErr(null);
  }, [user, navigate, redirectUri, deviceCode]);

  useEffect(() => {
    if (!redirectUri) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await http.get(endpoints.profileMe, { withCredentials: true });
        const access = authStore.getState().accessToken || '';
        const tokens = await requestDesktopToken(access);

        if (tokens && redirectUri) {
          await notifyLauncher({ ...tokens, user: authStore.getState().user ?? me.data });
        }

        if (!cancelled && me?.data?.username) {
          navigate(`/u/${me.data.username}`, { replace: true });
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [redirectUri, navigate]);

  async function onSubmit(v: Form) {
    setServerErr(null);
    clearPendingLoginPassword();
    try {
      const { data } = await http.post<LoginRes>(endpoints.login, v);

      if ('requires2fa' in data && data.requires2fa) {
        setPendingLoginPassword(v.password);
        const qs = new URLSearchParams({
          challenge: data.challengeToken,
          ...(deviceCode ? { device: deviceCode } : {}),
          ...(redirectUri ? { redirect_uri: redirectUri } : {}),
        }).toString();
        navigate('/auth/login/2fa?' + qs, { replace: true });
        return;
      }

      const loginData = data as LoginSuccessRes;
      const me = deviceCode ? null : await finalizeAuth(loginData.accessToken);
      
      if (loginData.sessionId && loginData.deviceId) {
        authStore.getState().setSessionCredentials(loginData.sessionId, loginData.deviceId, loginData.sessionKey, loginData.sessionKeyIv);
        
        const sessionKeyStore = useSessionKeyStore.getState();
        if (loginData.sessionKey && me?.id) {
          sessionKeyStore.initializeSession(me.id, loginData.sessionKey, 1, v.password);
        }
      }
      

      const launcherUser = me ?? loginData.user;
      clearPendingLoginPassword();

      if (deviceCode) {
        const tokens = await requestDesktopToken(loginData.accessToken);
        if (!tokens) {
          setServerErr('Failed to issue launcher tokens. Try again later.');
          return;
        }
        await http.post(endpoints.deviceComplete, {
          deviceCode,
          payload: { ...tokens, user: launcherUser },
        });
        const tg = (window as any)?.Telegram?.WebApp;
        if (tg) {
          setServerErr('Готово! Можно закрыть окно.');
          try { tg.close(); } catch {}
        } else {
          navigate('/auth/device/done?seconds=4', { replace: true });
        }
        return;
      }

      if (redirectUri) {
        const tokens = await requestDesktopToken(loginData.accessToken);
        if (tokens) {
          await notifyLauncher({ ...tokens, user: launcherUser });
        }
        if (me?.username) navigate(`/u/${me.username}`, { replace: true });
      } else if (me?.username) {
        navigate(`/u/${me.username}`, { replace: true });
      }
    } catch (e: unknown) {
      clearPendingLoginPassword();
      const status = getHttpStatus(e);
      const code = getBackendErrorCode(e);

      if (status === 401 || code === 'invalid_credentials') {
        const msg = 'Неверная почта или пароль';
        setServerErr(msg);
        setError('email', { type: 'server' });
        setError('password', { type: 'server' });
        return;
      }

      setServerErr(mapLoginErrorToMessage(e));
    }
  }

  async function notifyLauncher(tokens: {
    accessToken: string;
    refreshToken: string;
    user: any;
    accessExpiresAt?: string;
    refreshExpiresAt?: string;
  }) {
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
    } catch (e: unknown) {
      const message = normalizeErrorMessage(e);
      setServerErr(message === 'Неизвестная ошибка' ? 'Не удалось начать сброс пароля' : message);
    }
  }

  useEffect(() => {
    const changed = lastInputRef.current.email !== emailValue || lastInputRef.current.password !== passwordValue;
    if (!changed) return;

    if (errors.email?.type === 'server') clearErrors('email');
    if (errors.password?.type === 'server') clearErrors('password');
    if (serverErr) setServerErr(null);

    lastInputRef.current = { email: emailValue, password: passwordValue };
  }, [emailValue, passwordValue, errors.email?.type, errors.password?.type, clearErrors, serverErr]);

  return (
    <>
      <Seo title="Вход — ArchiTech MC" robots="noindex,follow" />
      <AuthPageShell
        mode="login"
        title="Вход в аккаунт"
        description="Войдите, чтобы продолжить игру, управлять профилем и подключить лаунчер."
      >
        {serverErr && <div className="at-auth-alert" role="alert">{serverErr}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="at-auth-form">
          <div className="at-auth-field">
            <label className="at-auth-label" htmlFor="login-email">Почта</label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!errors.email}
              aria-describedby={emailFieldHint ? 'login-email-hint' : undefined}
              {...register('email')}
              error={!!errors.email}
              className={errors.email ? 'is-err' : touchedFields.email && emailValue && !errors.email ? 'is-ok' : ''}
            />
            <div id="login-email-hint"><FormHint error={!!emailFieldHint}>{emailFieldHint}</FormHint></div>
          </div>

          <div className="at-auth-field">
            <label className="at-auth-label" htmlFor="login-password">Пароль</label>
            <PasswordField
              id="login-password"
              placeholder="Введите пароль"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={passwordFieldHint ? 'login-password-hint' : undefined}
              {...register('password')}
              error={!!errors.password}
              className={errors.password ? 'is-err' : touchedFields.password && passwordValue && !errors.password ? 'is-ok' : ''}
            />
            <div id="login-password-hint"><FormHint error={!!passwordFieldHint}>{passwordFieldHint}</FormHint></div>
          </div>

          <div className="at-auth-form-actions">
            <Button className="at-auth-primary" type="submit" disabled={!canSubmit}>
              Войти <span aria-hidden="true">↗</span>
            </Button>
            <div className="at-auth-switch">
              <button className="at-auth-inline-link" type="button" onClick={startReset}>
                Забыли пароль?
              </button>
              <span>Нет аккаунта? <Link to="/auth/register">Регистрация</Link></span>
            </div>
          </div>
        </form>
      </AuthPageShell>
    </>
  );
}

function mapLoginErrorToMessage(error: unknown): string {
  const status = getHttpStatus(error);
  const code = getBackendErrorCode(error);
  const retrySec = getRetryAfterSec(error);

  if (code === 'invalid_credentials' || status === 401) {
    return 'Неверная почта или пароль';
  }
  if (code === 'bad_request' || status === 400) {
    return 'Заполните почту и пароль';
  }
  if (status === 429) {
    return retrySec && retrySec > 0
      ? `Слишком много попыток входа. Попробуйте через ${retrySec} сек.`
      : 'Слишком много попыток входа. Попробуйте позже';
  }
  if (status && status >= 500) {
    return 'Сервис авторизации временно недоступен';
  }

  const message = normalizeErrorMessage(error);
  const isTechnical = /^Request failed with status code \d+$/i.test(message);
  return message === 'Неизвестная ошибка' || isTechnical ? 'Ошибка входа' : message;
}

function getHttpStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  return typeof status === 'number' ? status : null;
}

function getBackendErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const code = (data as { error?: unknown }).error;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

function getRetryAfterSec(error: unknown): number | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return null;

  const retryAfterSec = (data as { retryAfterSec?: unknown }).retryAfterSec;
  if (typeof retryAfterSec === 'number' && Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
    return Math.ceil(retryAfterSec);
  }

  const retryAfterMs = (data as { retryAfterMs?: unknown }).retryAfterMs;
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.ceil(retryAfterMs / 1000);
  }

  return null;
}
