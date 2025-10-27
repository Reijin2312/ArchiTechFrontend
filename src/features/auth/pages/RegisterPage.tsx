import React, { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import PasswordField from '../components/PasswordField';
import Footer from '@/shared/ui/Footer';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
  //const { setTokens, setUser } = authStore();
  const user = authStore((s) => s.user);
  const navigate = useNavigate();
  const { search } = useLocation();

  const [serverErr, setServerErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
    watch,
	control,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    shouldFocusError: true,
  });
  watch();

  const emailV = useWatch({ control, name: 'email' }) ?? '';
  const userV  = useWatch({ control, name: 'username' }) ?? '';
  const passV  = useWatch({ control, name: 'password' }) ?? '';
  const pass2V = useWatch({ control, name: 'password2' }) ?? '';

  // async live-валидация
  const emailAbort = useRef<AbortController | null>(null);
  const userAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!emailV) {
      clearErrors('email');
      return;
    }
    // если локальная ошибка не серверная — сервер не трогаем
    if (errors.email && errors.email.type !== 'server') return;

    emailAbort.current?.abort();
    const ctrl = new AbortController();
    emailAbort.current = ctrl;

    const t = setTimeout(async () => {
      try {
        // GET /api/validate/email?email=...
        const { data } = await http.get('/api/validate/email', {
          params: { email: emailV },
          signal: ctrl.signal,
        });
        // ожидаем { format:boolean, mx:boolean, available:boolean }
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
        // молча игнорируем сетевые ошибки, не ломаем UX
      }
    }, 400);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // GET /api/validate/username?username=...
        const { data } = await http.get('/api/validate/username', {
          params: { username: userV },
          signal: ctrl.signal,
        });
        // ожидаем { valid:boolean, available:boolean, reason:string }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userV]);

  useEffect(() => {
    if (user) navigate('/profile', { replace: true });
    setServerErr(null);
  }, [user, navigate]);

  const next = new URLSearchParams(search).get('next') || '/profile';

  async function onSubmit(v: Form) {
    try {
      const resp = await http.post<RegisterRes>(
        '/api/auth/register',
        { email: v.email, username: v.username, password: v.password },
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
        //setTokens(d.accessToken, d.refreshToken);
		authStore.getState().setAuth(d.user, d.accessToken);
        //setUser(d.user);
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
          setError('username', { type: 'server', message: 'Ник: 3–16, латиница/цифры/_' });
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
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Регистрация</h1>

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
            className={errors.email ? 'is-err' : emailV ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.email}>{errors.email?.message}</FormHint>

          <label className="label">Ник</label>
          <Input
            autoComplete="username"
            {...register('username')}
            error={!!errors.username}
            className={errors.username ? 'is-err' : userV ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.username}>{errors.username?.message}</FormHint>

          <label className="label">Пароль</label>
          <PasswordField
            autoComplete="new-password"
            {...register('password')}
            error={!!errors.password}
            className={errors.password ? 'is-err' : passV ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.password}>{errors.password?.message}</FormHint>

          <label className="label">Повторите пароль</label>
          <PasswordField
            autoComplete="new-password"
            {...register('password2')}
            error={!!errors.password2}
            className={errors.password2 ? 'is-err' : pass2V ? 'is-ok' : ''}
          />
          <FormHint error={!!errors.password2}>{errors.password2?.message}</FormHint>

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              Зарегистрироваться
            </Button>
            <Link to="/auth/login" className="btn ghost">
              Уже есть аккаунт?
            </Link>
          </div>
        </form>
      </Card>
      <Footer />
    </div>
  );
}
