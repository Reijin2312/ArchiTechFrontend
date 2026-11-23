import { AnimatePresence, motion } from 'framer-motion';
import { authStore } from '@/shared/store/auth';
import { SocialSidebarContent } from './social/SocialSidebarContent';
import { useSocialFloatingModel } from './social/useSocialFloatingModel';
import { useI18n } from '@/shared/i18n/I18nProvider';

export function SocialFloatingButton() {
  const authenticated = authStore((state) => Boolean(state.user));
  const model = useSocialFloatingModel();
  const { language } = useI18n();
  const copy = language === 'ru'
    ? { title: 'Чат', full: 'Открыть полный чат', close: 'Закрыть чат', open: 'Открыть чат' }
    : { title: 'Chat', full: 'Open full chat', close: 'Close chat', open: 'Open chat' };

  if (!authenticated) return null;

  const toggle = () => {
    model.setIsOpen((open) => {
      const next = !open;
      if (next) {
        model.setActiveTab('chat');
        void model.requestDesktopNotificationPermission();
      }
      return next;
    });
  };

  return (
    <>
      <AnimatePresence>
        {model.isOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 330 }}
            className="fixed bottom-24 right-2 z-[90] flex h-[min(660px,calc(100dvh-8rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-[#c5aa84]/30 bg-[#171816]/[0.98] text-[#eee7dd] shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:right-2"
            aria-label="Social panel"
          >
            <header className="flex items-center justify-between border-b border-[#c5aa84]/20 bg-[#20211d] px-4 py-3">
              <div className="text-base font-semibold tracking-wide text-[#f3ede4]">{copy.title}</div>
              <div className="flex items-center gap-2">
                <a
                  href="/chat"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#c5aa84]/45 bg-[#c5aa84]/10 text-[#ead4b3] transition hover:border-[#d4b98f]/70 hover:bg-[#c5aa84]/20"
                  aria-label={copy.full}
                  title={copy.full}
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
                    <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={model.closeMessenger}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#c5aa84]/20 text-xl text-[#bbb3a7] hover:bg-[#c5aa84]/10 hover:text-white"
                  aria-label={copy.close}
                >
                  ×
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SocialSidebarContent model={model} forceChatOnly />
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-2 z-[91] grid h-14 w-14 place-items-center rounded-full border border-[#d4b98f]/50 bg-[#22231f] text-[#ead4b3] shadow-[0_14px_38px_rgba(0,0,0,0.48)] hover:bg-[#2c2d27] sm:right-2"
        aria-label={model.isOpen ? copy.close : copy.open}
      >
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 5.75h14v10.5H9.2L5 19.5V5.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M8.3 9.4h7.4M8.3 12.6h5.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </motion.button>
    </>
  );
}
