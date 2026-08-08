import { Link } from 'react-router-dom'
import { SvgTelegram, SvgDiscord } from '@/shared/ui/image/Icons';
import { DISCORD_URL, TELEGRAM_URL } from '@/shared/constants';
import { useI18n } from '@/shared/i18n/I18nProvider';

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-300">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/favicon-32.png" alt={t('header.logoAlt')} width={24} height={24} loading="lazy" decoding="async" />
            <div>
              <span className="text-slate-200"></span>
              <b className="text-white">ArchiTech MC</b>
            </div>
          </div>
          <div className="flex items-center gap-4 text-base">
            <a href={TELEGRAM_URL} rel="noopener noreferrer" aria-label="Telegram" className="hover:text-white text-slate-300"><SvgTelegram className="h-5" /></a>
            <a href={DISCORD_URL} rel="noopener noreferrer" aria-label="Discord" className="hover:text-white text-slate-300"><SvgDiscord className="h-5" /></a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="/about" className="hover:text-white">{t('header.about')}</a>
          <a href="/contacts" rel="noopener noreferrer" className="hover:text-white">{t('footer.contacts')}</a>
          <a href="/terms" className="hover:text-white">{t('footer.terms')}</a>
          <a href="/privacy" rel="noopener noreferrer" className="hover:text-white">{t('footer.privacy')}</a>
        </div>

        <div className="mt-6 text-xs text-slate-400">
          <div className="w-full leading-relaxed whitespace-normal wrap-break-words">
            {t('footer.disclaimer')}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">{t('footer.copyright')}</div>
      </div>
    </footer>
  );
}

