import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RightToc, pageVariants, type TocItem } from '@/shared/ui/layout/PageSidebar';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { DocumentationSidebar } from './DocumentationSidebar';

export function DocumentationShell({ area, toc, children }: { area: 'rules' | 'wiki'; toc: TocItem[]; children: ReactNode }) {
  const isMobile = useIsMobile();
  const { language } = useI18n();
  return (
    <motion.div
      className={`architech-document architech-${area} at-doc-layout mx-auto w-full max-w-[1500px] grid grid-cols-12 gap-6 px-4 py-6 text-[#f2efe9]`}
      variants={isMobile ? undefined : pageVariants}
      initial={isMobile ? false : 'hidden'}
      animate={isMobile ? false : 'show'}
    >
      <aside className="at-doc-layout__left hidden lg:block lg:col-span-3"><DocumentationSidebar /></aside>
      <main className="col-span-12 lg:col-span-6">
        <details className="at-doc-mobile-nav lg:hidden">
          <summary>{language === 'ru' ? 'Правила и вики' : 'Rules and wiki'}</summary>
          <DocumentationSidebar compact />
        </details>
        {children}
      </main>
      <aside className="at-doc-layout__right hidden lg:block lg:col-span-3">
        <RightToc items={toc} disableMotion={isMobile} blurIntensity="xl" bgOpacity="60" linkTransition />
      </aside>
    </motion.div>
  );
}
