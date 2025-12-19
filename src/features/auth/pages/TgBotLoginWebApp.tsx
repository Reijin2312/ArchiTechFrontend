import { useEffect, useState } from 'react';

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  sendData?: (data: string) => void;
  close?: () => void;
};

function useTelegramWebApp(): { tg: TelegramWebApp | null; loading: boolean } {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const current = (window as any)?.Telegram?.WebApp;
    if (current) {
      setTg(current);
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      setTg((window as any)?.Telegram?.WebApp ?? null);
      setLoading(false);
    };
    script.onerror = () => setLoading(false);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  return { tg, loading };
}

export default function TgBotLoginWebApp() {
  const { tg, loading } = useTelegramWebApp();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (tg?.ready) tg.ready();
    if (tg?.expand) tg.expand();
  }, [tg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nick = nickname.trim();
    const pwd = password;
    if (!nick || !pwd) {
      setError('Введите ник и пароль.');
      return;
    }

    try {
      tg?.sendData?.(JSON.stringify({ nickname: nick, password: pwd }));
      setSent(true);
      setPassword('');
      if (tg?.close) tg.close();
    } catch (err) {
      console.error('sendData failed', err);
      setError('Не удалось отправить данные боту. Попробуйте снова.');
    }
  };

  if (!loading && !tg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Откройте из Telegram</h1>
          <p>Эта форма работает только внутри Telegram-бота как WebApp. Откройте кнопку снова из бота.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div className="w-full max-w-md bg-slate-800/70 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Вход для бота</h1>
          <p className="text-sm text-slate-300">
            Ник и пароль отправятся в бота, не останутся в истории чата.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-slate-200">Ник</span>
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:border-sky-400 focus:outline-none"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ваш ник"
              autoComplete="username"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-200">Пароль</span>
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:border-sky-400 focus:outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="text-sm text-red-400">{error}</div>}
          {sent && <div className="text-sm text-green-400">Отправлено, можете закрыть окно.</div>}

          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2 transition"
          >
            Отправить в бота
          </button>
        </form>
      </div>
    </div>
  );
}
