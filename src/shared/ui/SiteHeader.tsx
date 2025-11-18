import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';
import { SECTIONS as RULES_SECTIONS } from '@/pages/RulesPage';
import { WIKI_SECTIONS } from '@/pages/WikiPage';
import { PRIVACY_SECTIONS } from '@/pages/PrivacyPolicyPage';
import { TERMS_SECTIONS } from '@/pages/UserAgreementPage';

const SERVER_NAME = 'ArchiTech MC';
const MAIN_URL = '/';
const RULES_URL = '/rules';
const SHOP_URL = '/shop';
const WIKI_URL = '/wiki';
const PRIVACY_URL = '/privacy';
const TERMS_URL = '/terms';
const DISCORD_URL = 'https://discord.gg/x6JwVPwPtw';
const TELEGRAM_URL = 'https://t.me/archi_tech_official';

type HeaderTocItem = { id: string; title: string };

export default function SiteHeader() {
  const user = authStore((s) => s.user);
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);
  const isRulesPage = pathname === RULES_URL;
  const isWikiPage = pathname === WIKI_URL;
  const isPrivacyPage = pathname === PRIVACY_URL;
  const isTermsPage = pathname === TERMS_URL;
  const mobileTocItems: HeaderTocItem[] | undefined = isRulesPage
    ? RULES_SECTIONS
    : isWikiPage
      ? WIKI_SECTIONS
      : isPrivacyPage
        ? PRIVACY_SECTIONS
        : isTermsPage
          ? TERMS_SECTIONS
          : undefined;

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search]);

  const linkCls = (active: boolean) =>
    [
      'relative px-2 py-1.5 text-sm transition-colors',
      active
        ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 ' +
          'after:absolute after:left-1.5 after:right-1.5 after:-bottom-[3px] after:h-[2px] after:rounded-full ' +
          'after:bg-gradient-to-r after:from-sky-400 after:to-blue-500 after:content-[""]'
        : 'text-slate-300 hover:text-sky-300',
    ].join(' ');

  const isActive = (to: string, end = false) => {
    const t = to || '/';
    if (end) return pathname === t;
    return pathname === t || pathname.startsWith(t + '/');
  };

  function SvgTelegram({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M2.53419 10.491 20.4342 3.72755c.5979-.22564 1.2652.07521 1.4908.67307.0791.21021.0964.43779.0482.65668l-3.0857 14.0805c-.1562.7136-.8611 1.1658-1.5747 1.0086-.1774-.0385-.3442-.1138-.4918-.2198l-6.1453-4.4415c-.3694-.2671-.4533-.784-.1852-1.1543.0289-.0395.0617-.0771.0964-.1118l6.319-6.07213c.1311-.12632.135-.33557.0087-.46768-.109-.11282-.2826-.13404-.4156-.04918L7.88597 13.0975c-.5101.324-1.13978.3973-1.7116.1996l-3.618-1.2516c-.43103-.1485-.65957-.6201-.51107-1.0511.081-.2314.25939-.4166.48889-.5034Z" />
      </svg>
    );
  }

  function SvgDiscord({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
      </svg>
    );
  }

  function MobileToc({ items, onItemClick }: { items: HeaderTocItem[]; onItemClick: () => void }) {
    const [active, setActive] = useState<string | undefined>(items[0]?.id);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      const targets = items.map((item) => document.getElementById(item.id)).filter(
        Boolean,
      ) as HTMLElement[];
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const top = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (top) setActive(top.target.id);
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5, 1] },
      );
      targets.forEach((el) => observerRef.current!.observe(el));
      return () => observerRef.current?.disconnect();
    }, [items]);

    return (
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3">
        <div className="mb-2 text-xs font-semibold text-slate-300">На этой странице</div>
        <ol className="space-y-1 text-xs">
          {items.map((it, i) => {
            const on = active === it.id;
            return (
            <li key={it.id} className="flex items-start gap-2">
                <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none ${
                    on ? 'border-sky-500 text-sky-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {i + 1}
                </span>
                <a
                  href={`#${it.id}`}
                  onClick={onItemClick}
                  className={on ? 'text-sky-300' : 'text-slate-200 hover:text-sky-300'}
                  aria-current={on ? 'true' : undefined}
                >
                  {it.title}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 backdrop-blur supports-backdrop-filter:bg-slate-950/50 border-b border-slate-800">
        <nav className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/favicon-192.png"
              alt="Логотип ArchiTech MC"
              width={32}
              height={32}
              decoding="async"
            />
            <span className="font-semibold tracking-wide">{SERVER_NAME}</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a
              href={MAIN_URL}
              className={linkCls(isActive(MAIN_URL, true))}
              aria-current={isActive(MAIN_URL, true) ? 'page' : undefined}
            >
              Главная
            </a>
            <a
              href={RULES_URL}
              className={linkCls(isActive(RULES_URL))}
              aria-current={isActive(RULES_URL) ? 'page' : undefined}
            >
              Правила
            </a>
            <a
              href={SHOP_URL}
              className={linkCls(isActive(SHOP_URL))}
              aria-current={isActive(SHOP_URL) ? 'page' : undefined}
            >
              Проходка
            </a>
            <a
              href={WIKI_URL}
              className={linkCls(isActive(WIKI_URL))}
              aria-current={isActive(WIKI_URL) ? 'page' : undefined}
            >
              Вики
            </a>

            <a
              href={TELEGRAM_URL}
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="hover:text-white text-slate-300"
            >
              <SvgTelegram className="h-5" />
            </a>
            <a
              href={DISCORD_URL}
              rel="noopener noreferrer"
              aria-label="Discord"
              className="hover:text-white text-slate-300"
            >
              <SvgDiscord className="h-5" />
            </a>

            {user ? (
              <>
                <Link
                  to={`/u/${user.username}`}
                  className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500"
                  title="Профиль"
                >
                  {user.username}
                </Link>

                <Link
                  to={`/u/${user.username}`}
                  className="ml-2 inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700"
                  title="Профиль"
                >
                  {(user as any)?.avatarUrl ? (
                    <img
                      src={(user as any).avatarUrl as string}
                      alt="Профиль"
                      width={32}
                      height={32}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
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

          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Link
                to={`/u/${user.username}`}
                className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700"
                title="Профиль"
              >
                {(user as any)?.avatarUrl ? (
                  <img
                    src={(user as any).avatarUrl as string}
                    alt="Профиль"
                    width={32}
                    height={32}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="w-full text-center text-xs leading-8 text-slate-300">
                    {(user.username?.[0] || '?').toUpperCase()}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                to={`/auth/login?next=${next}`}
                className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-700 text-xs text-slate-300"
                title="Войти"
              >
                В
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800"
              aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {mobileOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Мобильное выезжающее меню справа (оверлей поверх страницы) */}
      <div
        className={`fixed inset-0 z-30 md:hidden transition-[opacity,visibility] ${
          mobileOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* затемнение */}
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-label="Закрыть меню"
        />

        {/* панель справа */}
        <div
          className={`absolute inset-y-0 right-0 w-72 max-w-[80%] border-l border-slate-800 p-4 flex flex-col transform transition-transform bg-slate-950/40 backdrop-blur supports-backdrop-filter:bg-slate-950/50 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Верхняя строка: Навигация + крестик */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
              Навигация
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-900"
              aria-label="Закрыть меню"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Основные ссылки */}
          <nav className="flex flex-col gap-1 text-sm">
            <a
              href={MAIN_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(MAIN_URL, true) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              Главная
            </a>
            <a
              href={RULES_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(RULES_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              Правила
            </a>
            <a
              href={SHOP_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(SHOP_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              Проходка
            </a>
            <a
              href={WIKI_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(WIKI_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              Вики
            </a>
          </nav>

          {/* Блок профиля / логина */}
          <div className="mt-4 flex items-center gap-3">
            {user ? (
              <Link
                to={`/u/${user.username}`}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
              >
                <span className="inline-flex h-7 w-7 overflow-hidden rounded-full border border-slate-700">
                  {(user as any)?.avatarUrl ? (
                    <img
                      src={(user as any).avatarUrl as string}
                      alt="Профиль"
                      width={28}
                      height={28}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="w-full text-center text-xs leading-7 text-slate-300">
                      {(user.username?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-[140px]">{user.username}</span>
              </Link>
            ) : (
              <Link
                to={`/auth/login?next=${next}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
              >
                Войти
              </Link>
            )}
          </div>

          {mobileTocItems && (
            <MobileToc items={mobileTocItems} onItemClick={() => setMobileOpen(false)} />
          )}

          {/* Нижняя «футерная» полоска */}
          <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/images/favicon-192.png"
                alt="Логотип ArchiTech MC"
                width={24}
                height={24}
                decoding="async"
              />
              <span className="text-xs font-medium text-slate-100">{SERVER_NAME}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <a
                href={TELEGRAM_URL}
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="hover:text-white"
              >
                <SvgTelegram className="h-4" />
              </a>
              <a
                href={DISCORD_URL}
                rel="noopener noreferrer"
                aria-label="Discord"
                className="hover:text-white"
              >
                <SvgDiscord className="h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
