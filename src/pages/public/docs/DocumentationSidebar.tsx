import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { DOCUMENT_GROUPS, documentPath } from './documentationNavigation';

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

function GroupIcon({ wiki }: { wiki?: boolean }) {
  return wiki
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19"/></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M5 9V6l7-3 7 3v3M6 9v8m4-8v8m4-8v8m4-8v8M4 17h16v3H4z"/></svg>;
}

export function DocumentationSidebar({ compact = false }: { compact?: boolean }) {
  const { language } = useI18n();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(language === 'ru' ? 'ru' : 'en');
    if (!needle) return DOCUMENT_GROUPS;
    return DOCUMENT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item[language].toLocaleLowerCase(language === 'ru' ? 'ru' : 'en').includes(needle)),
    })).filter((group) => group.items.length);
  }, [language, query]);

  return (
    <nav className={`at-doc-nav${compact ? ' at-doc-nav--compact' : ''}`} aria-label={language === 'ru' ? 'Разделы правил и вики' : 'Rules and wiki sections'}>
      <label className="at-doc-search">
        <SearchIcon />
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'ru' ? 'Поиск…' : 'Search…'} />
        <span><kbd>{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd></span>
      </label>

      <div className="at-doc-nav__scroll">
        {groups.map((group) => (
          <section className="at-doc-nav__group" key={group.area}>
            <h2><GroupIcon wiki={group.area === 'wiki'} />{group[language]}</h2>
            <ul>
              {group.items.map((item) => {
                const to = documentPath(item);
                const active = pathname === to;
                return <li key={`${item.area}-${item.id}`}>
                  <Link to={to} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>{item[language]}</Link>
                </li>;
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="at-doc-nav__empty">{language === 'ru' ? 'Ничего не найдено' : 'Nothing found'}</p>}
      </div>
    </nav>
  );
}
