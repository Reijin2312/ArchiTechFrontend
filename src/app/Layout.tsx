import { Outlet } from 'react-router-dom';
import SiteHeader from '@/shared/ui/layout/SiteHeader';
import SiteFooter from '@/shared/ui/layout/SiteFooter';
import { SocialFloatingButton } from '@/shared/ui/button/SocialFloatingButton';

export default function Layout() {
  return (
    <div className="min-h-dvh text-slate-100">
      <SiteHeader />
      <main className="min-h-[70vh]"><Outlet /></main>
      <SiteFooter />
      <SocialFloatingButton />
    </div>
  );
}
