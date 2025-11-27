import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
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
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      const qs = new URLSearchParams({ ticket: data.ticket, email: emailVal, next }).toString();
      navigate('/auth/reset/code?' + qs, { replace: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      onError(err?.response?.data as string || err?.message || 'Не удалось начать сброс пароля');
    }
  };

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
    </Card>
  );
}
