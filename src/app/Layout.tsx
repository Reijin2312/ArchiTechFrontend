import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from '@/shared/ui/SiteHeader';
import SiteFooter from '@/shared/ui/SiteFooter';

export default function Layout() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="min-h-[70vh]"><Outlet /></main>
      <SiteFooter />
    </div>
  );
}
