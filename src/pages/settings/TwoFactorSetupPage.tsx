import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { TwoFactorSetupStartRes, TwoFactorStatusRes } from '@/shared/api/types';
import { Card } from '@/shared/ui/card/Card';
import { Input } from '@/shared/ui/form/Input';
import { Button } from '@/shared/ui/button/Button';
import { Seo } from '@/shared/seo/seo';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import QRCode from 'qrcode';

type SetupStep = 'password' | 'confirm' | 'done' | 'already';

export default function TwoFactorSetupPage() {
  useWallpaper();

  const navigate = useNavigate();

  const [step, setStep] = useState<SetupStep>('password');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'start' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupStartRes | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      if (!setupData?.otpauthUri) {
        setQrDataUrl('');
        setQrError(null);
        setQrLoading(false);
        return;
      }

      setQrLoading(true);
      setQrError(null);
      try {
        const dataUrl = await QRCode.toDataURL(setupData.otpauthUri, {
          width: 260,
          margin: 1,
          color: {
            dark: '#e2e8f0',
            light: '#00000000',
          },
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl('');
          setQrError('Не удалось сгенерировать QR-код');
        }
      } finally {
        if (!cancelled) {
          setQrLoading(false);
        }
      }
    }

    void buildQr();
    return () => {
      cancelled = true;
    };
  }, [setupData?.otpauthUri]);

  async function loadStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const { data } = await http.get<TwoFactorStatusRes>(endpoints.account2faStatus, { withCredentials: true });
      if (data.enabled) {
        setStep('already');
      } else {
        setStep('password');
      }
    } catch (e) {
      setStatusError(normalizeSetupError(e, 'Не удалось загрузить состояние 2FA'));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function startSetup() {
    if (!password.trim()) {
      setError('Введите пароль аккаунта');
      return;
    }

    setBusy('start');
    setError(null);
    try {
      const { data } = await http.post<TwoFactorSetupStartRes>(
        endpoints.account2faSetupStart,
        { password },
        { withCredentials: true },
      );
      setSetupData(data);
      setCode('');
      setStep('confirm');
    } catch (e) {
      setError(normalizeSetupError(e, 'Не удалось начать настройку 2FA'));
    } finally {
      setBusy(null);
    }
  }

  async function confirmSetup() {
    if (!/^\d{6}$/.test(code)) {
      setError('Введите 6-значный код из Google Authenticator');
      return;
    }

    setBusy('confirm');
    setError(null);
    try {
      await http.post(endpoints.account2faSetupConfirm, { code }, { withCredentials: true });
      setStep('done');
    } catch (e) {
      setError(normalizeSetupError(e, 'Не удалось включить 2FA'));
    } finally {
      setBusy(null);
    }
  }

  async function copySecret() {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Seo title="Настройка 2FA — ArchiTech MC" robots="noindex,follow" />
      <div className="wrap">
        <Card className="w-full max-w-[560px]">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-techno text-techno-glow">Настройка 2FA</h1>
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
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Двухфакторная аутентификация уже включена.
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
                <Button type="button" onClick={startSetup} disabled={busy === 'start'}>
                  {busy === 'start' ? 'Проверка...' : 'Продолжить'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/settings/profile')}>
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {!loadingStatus && !statusError && step === 'confirm' && setupData && (
            <div className="space-y-4">
              <p className="label">Шаг 2. Добавьте аккаунт в Google Authenticator</p>
              {error && (
                <div className="error" role="alert" style={{ display: 'block' }}>
                  {error}
                </div>
              )}

              <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
                <div className="mx-auto mb-4 w-fit rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                  {qrLoading ? (
                    <div className="grid h-[220px] w-[220px] place-items-center rounded-lg bg-slate-900 text-xs text-slate-400">
                      Генерация QR...
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR код для 2FA"
                      className="h-[220px] w-[220px] rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-[220px] w-[220px] place-items-center rounded-lg bg-slate-900 px-4 text-center text-xs text-red-300">
                      {qrError || 'QR недоступен'}
                    </div>
                  )}
                </div>

                <p className="mb-2 text-xs text-slate-300">Или введите этот ключ вручную:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-black/40 px-3 py-1 text-[12px] text-sky-300">{setupData.secret}</code>
                  <button
                    type="button"
                    onClick={copySecret}
                    title={copied ? 'Скопировано' : 'Скопировать ключ'}
                    aria-label={copied ? 'Скопировано' : 'Скопировать ключ'}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                      copied
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/60 hover:text-sky-200'
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Код из Google Authenticator</label>
                <Input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 цифр"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={confirmSetup} disabled={busy === 'confirm'}>
                  {busy === 'confirm' ? 'Подтверждение...' : 'Включить 2FA'}
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
                2FA успешно включена. При следующем входе будет запрошен код из Google Authenticator.
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

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <rect x="5" y="5" width="10" height="10" rx="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function normalizeSetupError(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const code = typeof data === 'object' && data !== null ? (data as { error?: unknown }).error : null;

  if (code === 'bad_password' || status === 403) return 'Неверный пароль';
  if (code === 'invalid_2fa_code') return 'Неверный код из Google Authenticator';
  if (code === 'bad_request' || status === 400) return 'Проверьте введённые данные';
  if (status === 401) return 'Сессия истекла. Войдите снова';

  const message = (error as { message?: string })?.message;
  if (typeof message === 'string' && message.trim()) {
    if (/^Request failed with status code \d+$/i.test(message)) return fallback;
    return message;
  }

  return fallback;
}
