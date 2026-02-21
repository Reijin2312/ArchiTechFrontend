import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { TwoFactorStatusRes } from '@/shared/api/types';
import { Card } from '@/shared/ui/card/Card';
import { Input } from '@/shared/ui/form/Input';
import { Button } from '@/shared/ui/button/Button';
import { Seo } from '@/shared/seo/seo';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';

type DisableStep = 'password' | 'confirm' | 'done' | 'already';

export default function TwoFactorDisablePage() {
  useWallpaper();

  const navigate = useNavigate();

  const [step, setStep] = useState<DisableStep>('password');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const { data } = await http.get<TwoFactorStatusRes>(endpoints.account2faStatus, { withCredentials: true });
      if (data.enabled) {
        setStep('password');
      } else {
        setStep('already');
      }
    } catch (e) {
      setStatusError(normalizeDisableError(e, 'Не удалось загрузить состояние 2FA'));
    } finally {
      setLoadingStatus(false);
    }
  }

  function continueToCode() {
    if (!password.trim()) {
      setError('Введите пароль аккаунта');
      return;
    }
    setError(null);
    setStep('confirm');
  }

  async function disableTwoFa() {
    if (!/^\d{6}$/.test(code)) {
      setError('Введите 6-значный код из Google Authenticator');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await http.post(endpoints.account2faDisable, { password, code }, { withCredentials: true });
      setStep('done');
    } catch (e) {
      setError(normalizeDisableError(e, 'Не удалось отключить 2FA'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Отключение 2FA — ArchiTech MC" robots="noindex,follow" />
      <div className="wrap">
        <Card className="w-full max-w-[560px]">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-techno text-techno-glow">Отключение 2FA</h1>
            <Link
              to="/settings/profile"
              className="btn ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              <span aria-hidden="true">↩</span>
              К профилю
            </Link>
          </div>

          {loadingStatus ? (
            <p className="hint">Проверка состояния...</p>
          ) : statusError ? (
            <>
              <div className="error" role="alert" style={{ display: 'block' }}>
                {statusError}
              </div>
              <div className="mt-4">
                <Button type="button" variant="ghost" onClick={loadStatus}>Повторить</Button>
              </div>
            </>
          ) : null}

          {!loadingStatus && !statusError && step === 'already' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                Двухфакторная аутентификация уже отключена.
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => navigate('/settings/profile')}>Вернуться</Button>
              </div>
            </div>
          )}

          {!loadingStatus && !statusError && step === 'password' && (
            <div className="space-y-4">
              <p className="label">Шаг 1. Подтвердите пароль аккаунта</p>
              {error && (
                <div className="error" role="alert" style={{ display: 'block' }}>
                  {error}
                </div>
              )}
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={continueToCode}>Продолжить</Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/settings/profile')}>
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {!loadingStatus && !statusError && step === 'confirm' && (
            <div className="space-y-4">
              <p className="label">Шаг 2. Введите код из Google Authenticator</p>
              {error && (
                <div className="error" role="alert" style={{ display: 'block' }}>
                  {error}
                </div>
              )}
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 цифр"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={disableTwoFa} disabled={busy}>
                  {busy ? 'Отключение...' : 'Отключить 2FA'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep('password')}>
                  Назад
                </Button>
              </div>
            </div>
          )}

          {!loadingStatus && !statusError && step === 'done' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                2FA успешно отключена.
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => navigate('/settings/profile')}>К настройкам профиля</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function normalizeDisableError(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const code = typeof data === 'object' && data !== null ? (data as { error?: unknown }).error : null;

  if (code === 'bad_password' || status === 403) return 'Неверный пароль';
  if (code === 'invalid_2fa_code') return 'Неверный код из Google Authenticator';
  if (code === '2fa_not_enabled') return '2FA уже отключена';
  if (code === 'bad_request' || status === 400) return 'Проверьте введённые данные';
  if (status === 401) return 'Сессия истекла. Войдите снова';

  const message = (error as { message?: string })?.message;
  if (typeof message === 'string' && message.trim()) {
    if (/^Request failed with status code \d+$/i.test(message)) return fallback;
    return message;
  }

  return fallback;
}
