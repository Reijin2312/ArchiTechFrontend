import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';

const SERVER_NAME = 'ArchiTech MC';
const MAP_URL = '/map';
const RULES_URL = '/rules';
const SHOP_URL = '/shop';
const WIKI_URL = '/wiki';
const PROFILE_URL = '/profile';
const DISCORD_URL = 'https://discord.gg/your-invite';
const TELEGRAM_URL = 'https://t.me/your-channel';

export default function SiteHeader() {
  const user = authStore((s) => s.user);
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);

  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-950/50 border-b border-slate-800">
      <nav className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/favicon-192.png" alt="logo" className="size-8" />
          <span className="font-semibold tracking-wide">{SERVER_NAME}</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to={MAP_URL} className="hover:text-white text-slate-300">Карта</Link>
          <Link to={RULES_URL} className="hover:text-white text-slate-300">Правила</Link>
          <Link to={SHOP_URL} className="hover:text-white text-slate-300">Покупка проходки</Link>
          <Link to={WIKI_URL} className="hover:text-white text-slate-300">Вики</Link>
          <a href={DISCORD_URL} className="rounded-xl px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500">Discord</a>
          <a href={TELEGRAM_URL} className="rounded-xl px-3 py-1.5 bg-sky-500 hover:bg-sky-400">Telegram</a>
          {user ? (
            <Link to={PROFILE_URL} className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500">
              Профиль
            </Link>
          ) : (
            <Link to={`/auth/login?next=${next}`} className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500">
              Войти
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
