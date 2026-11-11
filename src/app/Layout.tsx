import { Outlet, useLocation } from 'react-router-dom';
import '@/shared/ui/layout/SecondaryPages.atelier.css';
import SiteHeader from '@/shared/ui/layout/SiteHeader';
import SiteFooter from '@/shared/ui/layout/SiteFooter';
import { SocialFloatingButton } from '@/shared/ui/button/SocialFloatingButton';

export default function Layout() {
  const { pathname } = useLocation();
  // Opt-in only. Already rebranded home, wiki, rules, legacy and main auth pages are untouched.
  const visualScope = pathname === '/start' || pathname === '/contacts' ||
    pathname === '/terms' || pathname === '/privacy' ||
    pathname.startsWith('/u/') || pathname.startsWith('/settings/') ||
    (pathname.startsWith('/auth/') && pathname !== '/auth/login' && pathname !== '/auth/register') ||
    pathname.startsWith('/verify/');
  const pageKind = pathname === '/start' || pathname === '/terms' || pathname === '/privacy' ? 'at-secondary-doc' :
    pathname === '/contacts' ? 'at-secondary-contacts' :
    pathname.startsWith('/u/') ? 'at-secondary-profile' :
    pathname.startsWith('/settings/') ? 'at-secondary-settings' : 'at-secondary-flow';
  return (
    <div className={`min-h-dvh text-slate-100${visualScope ? ` at-secondary-skin ${pageKind}` : ""}`}>
      <SiteHeader />
      <main className="min-h-[70vh]"><Outlet /></main>
      <SiteFooter />
      <SocialFloatingButton />
    </div>
  );
}
