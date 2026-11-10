import './SiteChrome.css'
import { Link } from 'react-router-dom'
import { SvgTelegram, SvgDiscord } from '@/shared/ui/image/Icons'
import { DISCORD_URL, TELEGRAM_URL, SERVER_NAME } from '@/shared/constants'
import { useI18n } from '@/shared/i18n/I18nProvider'

export default function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="at-site-footer">
      <div className="at-site-footer__inner">
        <div className="at-site-footer__top">
          <Link to="/" className="at-site-footer__brand" aria-label={t('header.homeAria')}>
            <img src="/images/favicon-32.png" alt="" width={32} height={32} loading="lazy" decoding="async" />
            <span>{SERVER_NAME}</span>
          </Link>
          <div className="at-site-footer__socials">
            <a href={TELEGRAM_URL} rel="noopener noreferrer" aria-label="Telegram">
              <SvgTelegram className="h-5 w-5" />
            </a>
            <a href={DISCORD_URL} rel="noopener noreferrer" aria-label="Discord">
              <SvgDiscord className="h-5 w-5" />
            </a>
          </div>
        </div>
        <nav className="at-site-footer__nav" aria-label={t('header.navigation')}>
          <Link to="/about">{t('header.about')}</Link>
          <Link to="/contacts">{t('footer.contacts')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
        </nav>
        <div className="at-site-footer__divider" aria-hidden="true" />
        <div className="at-site-footer__disclaimer">
          <p>{t('footer.disclaimer')}</p>
        </div>
        <div className="at-site-footer__bottom">
          <div className="at-site-footer__copyright">{t('footer.copyright')}</div>
          <div className="at-site-footer__mark" aria-hidden="true">ARCHITECH / MINECRAFT</div>
        </div>
      </div>
    </footer>
  )
}
