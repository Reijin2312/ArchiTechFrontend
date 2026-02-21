import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { TwoFactorStatusRes } from '@/shared/api/types';
import { Card, InputRow, inp } from './components';

interface AccountSectionProps {
  email: string;
  setEmail: (v: string) => void;
  pwdDummy: string;
  setPwdDummy: (v: string) => void;
  newUsername: string;
  setNewUsername: (v: string) => void;
  usernameOk: boolean | null;
  currentUsername: string;
  busy: string | null;
  onUsernameChange: () => void;
  onError: (msg: string) => void;
}

export function AccountSection({
  email,
  setEmail,
  pwdDummy,
  setPwdDummy,
  newUsername,
  setNewUsername,
  usernameOk,
  currentUsername,
  busy,
  onUsernameChange,
  onError,
}: AccountSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [twoFaStatus, setTwoFaStatus] = useState<TwoFactorStatusRes | null>(null);
  const [twoFaLoading, setTwoFaLoading] = useState(true);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  useEffect(() => {
    void loadTwoFaStatus();
  }, []);

  const handlePasswordReset = async () => {
    onError('');
    const emailVal = email.trim();
    if (!emailVal) {
      onError('Введите email для сброса пароля');
      return;
    }

    try {
      const next = location.pathname + (location.search || '') || '/profile';
      const { data } = await http.post(
        endpoints.resetBegin,
        { email: emailVal },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
      );
      const qs = new URLSearchParams({ ticket: data.ticket, email: emailVal, next }).toString();
      navigate('/auth/reset/code?' + qs, { replace: true });
    } catch (e: unknown) {
      onError(normalizeAccountError(e, 'Не удалось начать сброс пароля'));
    }
  };

  async function loadTwoFaStatus() {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const { data } = await http.get<TwoFactorStatusRes>(endpoints.account2faStatus, { withCredentials: true });
      setTwoFaStatus(data);
    } catch (e) {
      setTwoFaError(normalizeTwoFaError(e, 'Не удалось загрузить состояние 2FA'));
    } finally {
      setTwoFaLoading(false);
    }
  }

  function openTwoFaSetupPage() {
    navigate('/settings/2fa/setup');
  }

  function openTwoFaDisablePage() {
    navigate('/settings/2fa/disable');
  }

  const isTwoFaEnabled = !!twoFaStatus?.enabled;

  return (
    <Card className="mt-6">
      <h2 className="mb-4 text-sm font-semibold text-sky-300">Учётная запись</h2>

      <InputRow label="Email">
        <div className="flex w-full items-stretch gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={inp() + ' flex-1'}
          />
          <button
            type="button"
            onClick={() => navigate('/settings/email')}
            className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800"
            title="Изменить email"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </InputRow>

      <InputRow label="Пароль">
        <div className="flex w-full items-stretch gap-2">
          <input
            type="password"
            value={pwdDummy}
            onChange={(e) => setPwdDummy(e.target.value)}
            placeholder="••••••••"
            className={inp() + ' flex-1'}
          />
          <button
            type="button"
            disabled={busy === 'pwd'}
            onClick={handlePasswordReset}
            className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
            title="Изменить пароль"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </InputRow>

      <InputRow label="Логин">
        <div className="flex w-full items-stretch gap-2">
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inp() + ' flex-1'} />
          <button
            disabled={
              busy === 'username' ||
              !newUsername.trim() ||
              usernameOk !== true ||
              newUsername.trim().toLowerCase() === currentUsername.toLowerCase()
            }
            onClick={onUsernameChange}
            className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Сменить логин"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        {usernameOk === false && <p className="mt-1 text-xs text-red-400">Логин занят или некорректен</p>}
        {usernameOk === true && newUsername.toLowerCase() !== currentUsername.toLowerCase() && (
          <p className="mt-1 text-xs text-green-400">Доступен</p>
        )}
      </InputRow>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-sky-300">Двухфакторная аутентификация</h3>
            <p className="mt-1 text-xs text-slate-400">Google Authenticator (TOTP)</p>
          </div>
          {!twoFaLoading && (
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                isTwoFaEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700/60 text-slate-300 border border-slate-600'
              }`}
            >
              {isTwoFaEnabled ? 'Включено' : 'Выключено'}
            </span>
          )}
        </div>

        {twoFaError && <p className="mt-3 text-xs text-red-400">{twoFaError}</p>}
        {twoFaLoading && <p className="mt-3 text-xs text-slate-400">Загрузка состояния 2FA...</p>}

        {!twoFaLoading && (
          <div className="mt-3 space-y-3">
            {isTwoFaEnabled ? (
              <button
                type="button"
                onClick={openTwoFaDisablePage}
                className="rounded-xl border border-red-500/60 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
              >
                Открыть мастер отключения 2FA
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openTwoFaSetupPage}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800"
                >
                  Открыть мастер настройки 2FA
                </button>
                {twoFaStatus?.pendingSetup && (
                  <p className="text-xs text-amber-300">
                    Настройка уже начата, но не завершена. Откройте мастер и подтвердите код.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function normalizeAccountError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;

  const message = (error as { message?: string })?.message;
  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}

function normalizeTwoFaError(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const code = typeof data === 'object' && data !== null ? (data as { error?: unknown }).error : null;

  if (code === 'bad_password' || status === 403) return 'Неверный пароль';
  if (code === 'invalid_2fa_code') return 'Неверный код из Google Authenticator';
  if (code === '2fa_not_enabled') return '2FA уже отключена';
  if (code === 'bad_request' || status === 400) return 'Проверьте введённые данные';

  const message = normalizeAccountError(error, fallback);
  if (/^Request failed with status code \d+$/i.test(message)) return fallback;
  return message;
}
