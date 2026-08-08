import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';
import { SECTIONS as RULES_SECTIONS } from '@/pages/public/RulesPage';
import { WIKI_SECTIONS } from '@/pages/public/WikiPage';
import { PRIVACY_SECTIONS } from '@/pages/legal/PrivacyPolicyPage';
import { TERMS_SECTIONS } from '@/pages/legal/UserAgreementPage';
import { SvgTelegram, SvgDiscord, SvgMenu, SvgX } from '@/shared/ui/image/Icons';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { useI18n } from '@/shared/i18n/I18nProvider';

import {
  SERVER_NAME,
  RULES_URL,
  WIKI_URL,
  // CHAT_URL,
  MAP_URL,
  DISCORD_URL,
  TELEGRAM_URL,
} from '@/shared/constants';

const MAIN_URL = '/';
const ABOUT_URL = '/about';
const PRIVACY_URL = '/privacy';
const TERMS_URL = '/terms';

type HeaderTocItem = { id: string; title: string };

export default function SiteHeader() {
  const { language, t } = useI18n();
  const user = authStore((s) => s.user);
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);
  const isRulesPage = pathname === RULES_URL;
  const isWikiPage = pathname === WIKI_URL;
  const isPrivacyPage = pathname === PRIVACY_URL;
  const isTermsPage = pathname === TERMS_URL;
  const rawMobileTocItems: HeaderTocItem[] | undefined = isRulesPage
    ? RULES_SECTIONS
    : isWikiPage
      ? WIKI_SECTIONS
      : isPrivacyPage
        ? PRIVACY_SECTIONS
        : isTermsPage
          ? TERMS_SECTIONS
          : undefined;
  const mobileTocItems = rawMobileTocItems?.map((item) => ({
    ...item,
    title: localizedTocTitle(pathname, item.id, item.title, language),
  }));

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
        <div className="mb-2 text-xs font-semibold text-slate-300">{t('header.onThisPage')}</div>
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
          <Link
            to={MAIN_URL}
            className="flex items-center gap-3 text-slate-100 focus-visible:outline2 focus-visible:outline-sky-500 rounded-xl px-1 -mx-1"
            aria-label={t('header.homeAria')}
          >
            <img
              src="/images/favicon-192.png"
              alt={t('header.logoAlt')}
              width={32}
              height={32}
              decoding="async"
            />
            <span className="font-semibold tracking-wide">{SERVER_NAME}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a
              href={MAIN_URL}
              className={linkCls(isActive(MAIN_URL, true))}
              aria-current={isActive(MAIN_URL, true) ? 'page' : undefined}
            >
              {t('header.home')}
            </a>
            <a
              href={ABOUT_URL}
              className={linkCls(isActive(ABOUT_URL))}
              aria-current={isActive(ABOUT_URL) ? 'page' : undefined}
            >
              {t('header.about')}
            </a>
            <a
              href={RULES_URL}
              className={linkCls(isActive(RULES_URL))}
              aria-current={isActive(RULES_URL) ? 'page' : undefined}
            >
              {t('header.rules')}
            </a>
            <a
              href={MAP_URL}
              className={linkCls(isActive(MAP_URL))}
              aria-current={isActive(MAP_URL) ? 'page' : undefined}
            >
              {t('header.map')}
            </a>
            <a
              href={WIKI_URL}
              className={linkCls(isActive(WIKI_URL))}
              aria-current={isActive(WIKI_URL) ? 'page' : undefined}
            >
              {t('header.wiki')}
            </a>
            {/* Messenger is intentionally hidden; keep the link here for an easy rollback.
            <a
              href={CHAT_URL}
              className={linkCls(isActive(CHAT_URL))}
              aria-current={isActive(CHAT_URL) ? 'page' : undefined}
            >
              Chat
            </a>
            */}
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

            <LanguageSwitcher />

            {user ? (
              <>
                <Link
                  to={`/u/${user.username}`}
                  className="rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500"
                  title={t('header.profile')}
                >
                  {user.username}
                </Link>

                <Link
                  to={`/u/${user.username}`}
                  className="ml-2 inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700"
                  title={t('header.profile')}
                >
                  {(user as any)?.avatarUrl ? (
                    <img
                      src={(user as any).avatarUrl as string}
                      alt={t('header.profile')}
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
                {t('header.login')}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            {user ? (
              <Link
                to={`/u/${user.username}`}
                className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700"
                title={t('header.profile')}
              >
                {(user as any)?.avatarUrl ? (
                  <img
                    src={(user as any).avatarUrl as string}
                    alt={t('header.profile')}
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
                title={t('header.login')}
              >
                {t('header.login').charAt(0)}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800"
              aria-label={mobileOpen ? t('header.closeMenu') : t('header.openMenu')}
            >
              {mobileOpen ? (
                <SvgX className="h-5 w-5" />
              ) : (
                <SvgMenu className="h-5 w-5" />
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
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-label={t('header.closeMenu')}
        />

        <div
          className={`absolute inset-y-0 right-0 w-72 max-w-[80%] border-l border-slate-800 p-4 flex flex-col transform transition-transform bg-slate-950/40 backdrop-blur supports-backdrop-filter:bg-slate-950/50 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
              {t('header.navigation')}
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-900"
              aria-label={t('header.closeMenu')}
            >
              <SvgX className="h-5 w-5" />
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
              {t('header.home')}
            </a>
            <a
              href={ABOUT_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(ABOUT_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t('header.about')}
            </a>
            <a
              href={RULES_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(RULES_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t('header.rules')}
            </a>
            <a
              href={MAP_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(MAP_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t('header.map')}
            </a>
            <a
              href={WIKI_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(WIKI_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t('header.wiki')}
            </a>
            {/* Messenger is intentionally hidden; keep the mobile link here for an easy rollback.
            <a
              href={CHAT_URL}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${
                isActive(CHAT_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              Chat
            </a>
            */}
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
                      alt={t('header.profile')}
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
                {t('header.login')}
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
                alt={t('header.logoAlt')}
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

const ENGLISH_TOC: Record<string, Record<string, string>> = {
  '/rules': { intro: 'Introduction', forbidden: 'Forbidden actions', chat: 'Communication', techmagic: 'Mods and resource packs', build: 'Building', farms: 'Farms and machinery', pvp: 'PVP / PVE', trade: 'Economy and trading', security: 'Security and accounts', penalties: 'Penalties' },
  '/wiki': { intro: 'Server and theme', start: 'How to start playing', mods: 'Mod list', progress: 'Tech-magic progression', commands: 'Server commands', economy: 'Economy', perf: 'Performance', faq: 'FAQ', links: 'Links' },
  '/privacy': { id1: 'General provisions', id2: 'Data and processing purposes', id3: 'Cookies and similar technologies', id4: 'Legal grounds for processing', id5: 'Third parties and international transfers', id6: 'Your data rights', id7: 'Retention and security', id8: 'Third-party links', id9: 'Communications', id10: 'Limitation of liability', id11: 'Dispute resolution', id12: 'Policy changes', id13: 'Operator contacts' },
  '/terms': { id1: 'General terms', id2: 'User responsibilities', id3: 'Disclaimer of warranties', id4: 'Content and moderation', id5: 'Intellectual property', id6: 'Enforcement and restrictions', id7: 'In-game content transactions', id8: 'Account and access transactions', id9: 'Personal data', id10: 'Other terms' },
};

function localizedTocTitle(path: string, id: string, fallback: string, language: 'ru' | 'en') {
  return language === 'en' ? ENGLISH_TOC[path]?.[id] ?? fallback : fallback;
}

