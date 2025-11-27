import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Card } from './components';

interface DangerZoneSectionProps {
  onLogout: () => void;
}

export function DangerZoneSection({ onLogout }: DangerZoneSectionProps) {
  const navigate = useNavigate();
  const [delOpen, setDelOpen] = useState(false);
  const [delPwd, setDelPwd] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const deleteAccount = async () => {
    if (delConfirm !== 'DELETE' || !delPwd) return;
    setDelBusy(true);
    setDelErr(null);
    try {
      const token = authStore.getState().accessToken;
      await http.delete('/api/v1/account', {
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        data: { password: delPwd },
      });
      
      // Выход после удаления
      try {
        await http.post('/api/auth/logout', null, { withCredentials: true });
      } catch {}
      authStore.setState({ accessToken: null, user: null });
      navigate('/auth/login', { replace: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      const msg = err?.response?.data || err?.message || 'Не удалось удалить аккаунт';
      setDelErr(String(msg));
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <>
      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-red-300">Опасная зона</h2>

        <div className="space-y-3">
          <button
            onClick={onLogout}
            className="w-full rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
          >
            Выйти из аккаунта
          </button>

          <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-red-300">Удалить аккаунт</div>
                <div className="text-xs text-red-400/80">
                  Действие необратимо! Восстановить аккаунт после удаления невозможно.
                </div>
              </div>
              <button
                onClick={() => setDelOpen(true)}
                className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
              >
                Удалить…
              </button>
            </div>
          </div>
        </div>
      </Card>

      {delOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDelOpen(false)} />
          <div className="relative z-10 w-[520px] max-w-[95vw] rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-red-300">Удалить аккаунт</h3>
            <p className="mb-4 text-sm text-slate-300">
              Это действие необратимо. Введите <b>DELETE</b> и пароль для подтверждения.
            </p>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-400">Подтверждение</label>
              <input
                value={delConfirm}
                onChange={(e) => setDelConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-400">Пароль</label>
              <input
                type="password"
                value={delPwd}
                onChange={(e) => setDelPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            {delErr && (
              <div className="mb-3 rounded-xl border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">{delErr}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDelOpen(false)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500"
              >
                Отмена
              </button>
              <button
                onClick={deleteAccount}
                disabled={delBusy || delConfirm !== 'DELETE' || !delPwd}
                className="rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20 disabled:opacity-50"
              >
                {delBusy ? 'Удаляю…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
