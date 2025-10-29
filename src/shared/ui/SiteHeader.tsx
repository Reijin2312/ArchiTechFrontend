import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';

const SERVER_NAME = 'ArchiTech MC';
const MAIN_URL = '';
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

  const linkCls = (active: boolean) =>
    [
      'relative px-2 py-1.5 text-sm transition-colors',
      active
        ?
          'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 ' +
          'after:absolute after:left-1.5 after:right-1.5 after:-bottom-[3px] after:h-[2px] after:rounded-full ' +
          'after:bg-gradient-to-r after:from-sky-400 after:to-blue-500 after:content-[""]'
        : 'text-slate-300 hover:text-sky-300',
    ].join(' ');

  const isActive = (to: string, end = false) => {
    const t = to || '/';
    if (end) return pathname === t;
    return pathname === t || pathname.startsWith(t + '/');
  };

  const isProfileActive =
    pathname.startsWith('/u/') || pathname === PROFILE_URL || pathname.startsWith(PROFILE_URL + '/');

  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-backdrop-filter:bg-slate-950/50 border-b border-slate-800">
      <nav className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/favicon-192.png" alt="logo" className="size-8" />
          <span className="font-semibold tracking-wide">{SERVER_NAME}</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to={MAIN_URL} className={linkCls(isActive(MAIN_URL, true))} aria-current={isActive(MAIN_URL, true) ? 'page' : undefined}>
            Главная
          </Link>
          <Link to={RULES_URL} className={linkCls(isActive(RULES_URL))} aria-current={isActive(RULES_URL) ? 'page' : undefined}>
            Правила
          </Link>
          <Link to={SHOP_URL} className={linkCls(isActive(SHOP_URL))} aria-current={isActive(SHOP_URL) ? 'page' : undefined}>
            Покупка проходки
          </Link>
          <Link to={WIKI_URL} className={linkCls(isActive(WIKI_URL))} aria-current={isActive(WIKI_URL) ? 'page' : undefined}>
            Вики
          </Link>

          <a href={DISCORD_URL} className="rounded-xl px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500">Discord</a>
          <a href={TELEGRAM_URL} className="rounded-xl px-3 py-1.5 bg-sky-500 hover:bg-sky-400">Telegram</a>

          {user ? (
            <>
              <Link
                to={`/u/${user.username}`}
                className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500"
                title="Профиль"
              >
                {user.username}
              </Link>

              {}
              <Link
                to={`/u/${user.username}`}
                className="ml-2 inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700"
                title="Профиль"
              >
                {(user as any)?.avatarUrl ? (
                  <img
                    src={(user as any).avatarUrl as string}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-full text-center text-xs leading-8 text-slate-300">
                    {(user.username?.[0] || '?').toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <Link
              to={`/auth/login?next=${next}`}
              className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500"
            >
              Войти
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
