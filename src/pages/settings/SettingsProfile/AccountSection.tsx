import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { TwoFactorStatusRes } from '@/shared/api/types';
import { Card, InputRow, inp } from './components';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { profileTranslations } from '@/shared/i18n/profileTranslations';

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
  const { language } = useI18n();
  const copy = profileTranslations[language].settings;
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
      onError(copy.emailRequired);
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
      onError(normalizeAccountError(e, copy.resetError));
    }
  };

  async function loadTwoFaStatus() {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const { data } = await http.get<TwoFactorStatusRes>(endpoints.account2faStatus, { withCredentials: true });
      setTwoFaStatus(data);
    } catch (e) {
      setTwoFaError(normalizeTwoFaError(e, copy.twoFaLoadError, language));
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
      <h2 className="mb-4 text-sm font-semibold text-sky-300">{copy.account}</h2>

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
            title={copy.changeEmail}
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

      <InputRow label={copy.password}>
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
            title={copy.changePassword}
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

      <InputRow label={copy.username}>
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
            title={copy.changeUsername}
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
        {usernameOk === false && <p className="mt-1 text-xs text-red-400">{copy.usernameUnavailable}</p>}
        {usernameOk === true && newUsername.toLowerCase() !== currentUsername.toLowerCase() && (
          <p className="mt-1 text-xs text-green-400">{copy.available}</p>
        )}
      </InputRow>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-sky-300">{copy.twoFa}</h3>
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
              {isTwoFaEnabled ? copy.enabled : copy.disabled}
            </span>
          )}
        </div>

        {twoFaError && <p className="mt-3 text-xs text-red-400">{twoFaError}</p>}
        {twoFaLoading && <p className="mt-3 text-xs text-slate-400">{copy.twoFaLoading}</p>}

        {!twoFaLoading && (
          <div className="mt-3 space-y-3">
            {isTwoFaEnabled ? (
              <button
                type="button"
                onClick={openTwoFaDisablePage}
                className="rounded-xl border border-red-500/60 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
              >
                {copy.twoFaDisable}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openTwoFaSetupPage}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800"
                >
                  {copy.twoFaSetup}
                </button>
                {twoFaStatus?.pendingSetup && (
                  <p className="text-xs text-amber-300">
                    {copy.twoFaPending}
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

function normalizeTwoFaError(error: unknown, fallback: string, language: 'ru' | 'en'): string {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const code = typeof data === 'object' && data !== null ? (data as { error?: unknown }).error : null;

  if (code === 'bad_password' || status === 403) return language === 'ru' ? 'Неверный пароль' : 'Incorrect password';
  if (code === 'invalid_2fa_code') return language === 'ru' ? 'Неверный код из Google Authenticator' : 'Invalid Google Authenticator code';
  if (code === '2fa_not_enabled') return language === 'ru' ? '2FA уже отключена' : '2FA is already disabled';
  if (code === 'bad_request' || status === 400) return language === 'ru' ? 'Проверьте введённые данные' : 'Check the entered data';

  const message = normalizeAccountError(error, fallback);
  if (/^Request failed with status code \d+$/i.test(message)) return fallback;
  return message;
}
