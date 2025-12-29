import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import Turnstile from 'react-turnstile';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { notifyLauncher, requestDesktopToken } from '@/shared/auth/utils';
import { useRedirectUri } from '@/shared/hooks/useRedirectUri';

const schema = z
  .object({
    email: z.string().min(1, 'Введите почту').email({ message: 'Некорректная почта' }),
    username: z
      .string()
      .min(3, 'Минимум 3 символа')
      .max(16, 'Максимум 16 символов')
      .regex(/^[A-Za-z0-9_]+$/, 'Только латиница, цифры и _'),
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(/[A-Za-z]/, 'Нужна хотя бы одна буква')
      .regex(/\d/, 'Нужна хотя бы одна цифра'),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    path: ['password2'],
    message: 'Пароли не совпадают',
  });

type Form = z.infer<typeof schema>;

type RegisterRes =
  | { needVerify: true; ticket: string; email: string; resendAfterSec?: number }
  | { needVerify: false; accessToken: string; refreshToken: string; user: any };

export default function RegisterPage() {
  useWallpaper();

  const user = authStore((s) => s.user);
  const navigate = useNavigate();
  const { search } = useLocation();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { redirectUri } = useRedirectUri();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, touchedFields },
    setError,
    clearErrors,
    watch,
	control,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',

    shouldFocusError: true,
  });
  watch();

  const emailV = useWatch({ control, name: 'email' }) ?? '';
  const userV  = useWatch({ control, name: 'username' }) ?? '';
  const passV  = useWatch({ control, name: 'password' }) ?? '';
  const pass2V = useWatch({ control, name: 'password2' }) ?? '';

  const allFieldsValid = isValid && 
    emailV.trim() !== '' && 
    userV.trim() !== '' && 
    passV.trim() !== '' && 
    pass2V.trim() !== '' &&
    !errors.email && 
    !errors.username && 
    !errors.password && 
    !errors.password2;

  const emailAbort = useRef<AbortController | null>(null);
  const userAbort = useRef<AbortController | null>(null);

  function firstError(fe?: any): string {
    if (!fe) return '';
    if (fe.message) return String(fe.message);
    const t = fe.types;
    if (t && typeof t === 'object') {
      const v = Object.values(t)[0];
      return Array.isArray(v) ? String(v[0]) : String(v);
    }
    return '';
  }

  useEffect(() => {
    if (!emailV) {
      clearErrors('email');
      return;
    }
   
    if (errors.email && errors.email.type !== 'server') return;

    emailAbort.current?.abort();
    const ctrl = new AbortController();
    emailAbort.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const { data } = await http.get('/api/validate/email', {
          params: { email: emailV },
          signal: ctrl.signal,
        });
        if (!data?.format) {
          setError('email', { type: 'server', message: 'Некорректная почта' });
          return;
        }
        if (!data?.mx) {
          setError('email', { type: 'server', message: 'У домена нет MX-записи' });
          return;
        }
        if (data?.available === false) {
          setError('email', { type: 'server', message: 'Эта почта уже занята' });
          return;
        }
        clearErrors('email');
      } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      }
    }, 400);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [emailV]);

  useEffect(() => {
    if (!userV) {
      clearErrors('username');
      return;
    }
    if (errors.username && errors.username.type !== 'server') return;

    userAbort.current?.abort();
    const ctrl = new AbortController();
    userAbort.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const { data } = await http.get('/api/validate/username', {
          params: { username: userV },
          signal: ctrl.signal,
        });
        if (!data?.valid) {
          setError('username', { type: 'server', message: data?.reason || 'Недопустимый ник' });
          return;
        }
        if (data?.available === false) {
          setError('username', { type: 'server', message: 'Ник уже занят' });
          return;
        }
        clearErrors('username');
      } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      }
    }, 400);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [userV]);

  useEffect(() => {
    if (user) navigate('/profile', { replace: true });
    setServerErr(null);
  }, [user, navigate]);

  useEffect(() => { if (serverErr) setCaptchaToken(null); }, [serverErr]);

  const next = new URLSearchParams(search).get('next') || '/profile';

  async function onSubmit(v: Form) {
    if (!termsAccepted) return;
    try {
      const resp = await http.post<RegisterRes>(
        '/api/auth/register',
        { email: v.email, username: v.username, password: v.password, captcha: captchaToken },
        { validateStatus: () => true }
      );

      if (resp.status === 202 && (resp.data as any)?.needVerify) {
        const d = resp.data as any;
        const qs = new URLSearchParams({ ticket: d.ticket ?? '', email: d.email ?? '', next });
        setServerErr(null);
        navigate('/auth/verify?' + qs.toString(), { replace: true });
        return;
      }

      if (resp.status === 200 && (resp.data as any)?.accessToken) {
        const d = resp.data as any;

        if (redirectUri) {
          const tokens = await requestDesktopToken(d.accessToken);
          if (tokens) {
            await notifyLauncher(redirectUri, { ...tokens, user: d.user });
          }
        }
      
		    authStore.getState().setAuth(d.user, d.accessToken);  
        setServerErr(null);
        navigate(next, { replace: true });
        return;
      }

      const code = resp.status;
      const text: string =
        typeof resp.data === 'string' ? resp.data : (resp.data as any)?.message || '';

      if (code === 400) {
        if (/invalid_email/i.test(text)) {
          setError('email', { type: 'server', message: 'Некорректная почта' });
          setServerErr('Некорректная почта');
          return;
        }
        if (/invalid_username/i.test(text)) {
          setError('username', { type: 'server', message: 'Ник: 3–16, латиницnpmа/цифры/_' });
          setServerErr('Некорректный ник');
          return;
        }
        if (/weak_password/i.test(text)) {
          setError('password', { type: 'server', message: 'Пароль слишком простой' });
          setServerErr('Пароль слишком простой');
          return;
        }
        setServerErr(text || 'Некорректные данные');
        return;
      }

      if (code === 409 && /conflict/i.test(text)) {
        setError('email', { type: 'server', message: 'Почта или ник уже заняты' });
        setError('username', { type: 'server', message: 'Почта или ник уже заняты' });
        setServerErr('Почта или ник уже заняты');
        return;
      }

      setServerErr(text || `Ошибка регистрации (${code})`);
    } catch (e: any) {
      const msg =
        (typeof e?.response?.data === 'string' && e.response.data) ||
        e?.response?.data?.message ||
        e?.message ||
        'Ошибка регистрации';
      setServerErr(msg);
    }
  }

  // Используем общую утилиту notifyLauncher

  useEffect(() => {
    if (serverErr) setServerErr(null);
    if (errors.email?.type === 'server') clearErrors('email');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailV]);

  useEffect(() => {
    if (serverErr) setServerErr(null);
    if (errors.username?.type === 'server') clearErrors('username');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userV]);

  useEffect(() => {
    if (serverErr) setServerErr(null);
    if (errors.password?.type === 'server') clearErrors('password');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passV]);

  useEffect(() => {
    if (serverErr) setServerErr(null);
    if (errors.password2?.type === 'server') clearErrors('password2');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pass2V]);

  return (
    <>
    <Seo title="Регистрация — ArchiTech MC" robots="noindex,follow" />
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4 text-center">Регистрация</h1>

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
            className={errors.email ? 'is-err' : (touchedFields.email && emailV && !errors.email) ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.email}>{firstError(errors.email)}</FormHint>

          <label className="label">Ник</label>
          <Input
            autoComplete="username"
            {...register('username')}
            error={!!errors.username}
            className={errors.username ? 'is-err' : (touchedFields.username && userV && !errors.username) ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.username}>{firstError(errors.username)}</FormHint>

          <label className="label">Пароль</label>
          <PasswordField
            autoComplete="new-password"
            {...register('password')}
            error={!!errors.password}
            className={errors.password ? 'is-err' : (touchedFields.password && passV && !errors.password) ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.password}>{firstError(errors.password)}</FormHint>

          <label className="label">Повторите пароль</label>
          <PasswordField
            autoComplete="new-password"
            {...register('password2')}
            error={!!errors.password2}
            className={errors.password2 ? 'is-err' : (touchedFields.password2 && pass2V && !errors.password2) ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.password2}>{firstError(errors.password2)}</FormHint>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 1fr',
              alignItems: 'start',
              columnGap: 8,
              marginTop: 8,
              width: '100%',
              gridColumn: '1 / -1',
            }}
          >
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                margin: 2,
                padding: 0,
                display: 'block',
                flex: '0 0 16px',
              }}
            />
            <label htmlFor="terms" style={{ fontSize: 14, lineHeight: '20px', margin: 0 }}>
              Я принимаю{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                Условия использования сервисов
              </a>{' '}и{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                Политику конфиденциальности
              </a>.
            </label>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Turnstile
              sitekey="0x4AAAAAAB95ajuXGWziFGzi"
              theme="dark"
              appearance="always"
              action="register"
              onVerify={(t) => setCaptchaToken(t)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Button
              type="submit"
              disabled={!allFieldsValid || isSubmitting || !termsAccepted}
              style={{ width: '100%', padding: '12px 16px' }}
            >
            Зарегистрироваться
            </Button>

            <Link
              to="/auth/login"
              style={{
                display: 'block',
                marginTop: 8,
                textAlign: 'center',
                textDecoration: 'underline',
                fontSize: 14,
                opacity: 0.9
              }}
            >
              Уже есть аккаунт?
            </Link>
          </div>

        </form>
      </Card>
    </div>
    </>
  );
}
