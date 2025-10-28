import React, { useEffect, useState } from 'react';
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
import type { LoginReq, LoginRes } from '@/shared/api/types';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { endpoints } from '@/shared/api/endpoints';

const schema = z.object({
  email: z.string().email({ message: 'Некорректная почта' }),
  password: z.string().min(1, 'Введите пароль'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  //const { setTokens, setUser } = authStore();
  const user = authStore((s) => s.user);
  const navigate = useNavigate();
  const { search } = useLocation();
  const [serverErr, setServerErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    getValues,
    setError,
    clearErrors,
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
    if (user) navigate('/profile', { replace: true });
    setServerErr(null);
  }, [user, navigate]);

  const next = new URLSearchParams(search).get('next') || '/profile';

  async function onSubmit(v: Form) {
    try {
      const { data } = await http.post<{ accessToken: string }>(endpoints.login, v);
      const me = await finalizeAuth(data.accessToken);
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

  function startReset() {
    const email = getValues('email') || '';
    const qs = new URLSearchParams({ email }).toString();
    navigate('/auth/reset?' + qs);
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
