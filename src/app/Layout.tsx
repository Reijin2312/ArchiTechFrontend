import { Outlet } from 'react-router-dom';
import SiteHeader from '@/shared/ui/SiteHeader';
import SiteFooter from '@/shared/ui/SiteFooter';
import { SocialFloatingButton } from '@/shared/ui/SocialFloatingButton';

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
