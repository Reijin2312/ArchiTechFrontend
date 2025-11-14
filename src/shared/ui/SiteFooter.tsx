import { Link } from 'react-router-dom'

const DISCORD_URL = 'https://discord.gg/x6JwVPwPtw';
const TELEGRAM_URL = 'https://t.me/archi_tech_official';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-300">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/favicon-32.png" alt="Логотип ArchiTech MC" width={24} height={24} loading="lazy" decoding="async" />
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
          <a href="/contacts" rel="noopener noreferrer" className="hover:text-white">Контакты</a>
          <Link to="/terms" className="hover:text-white">Пользовательское соглашение</Link>
          <a href="/privacy" rel="noopener noreferrer" className="hover:text-white">Политика конфиденциальности</a>
        </div>

        <div className="mt-6 text-xs text-slate-400">
          <div className="w-full leading-relaxed whitespace-normal wrap-break-words">
            Не является официальным продуктом Minecraft. Мы никаким образом не связаны и не поддерживаем Mojang Synergies AB, Microsoft Corporation или других правообладателей.
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">© ArchiTech MC. 2024–2025. Все права защищены.</div>
      </div>
    </footer>
  );
}

function SvgTelegram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2.53419 10.491 20.4342 3.72755c.5979-.22564 1.2652.07521 1.4908.67307.0791.21021.0964.43779.0482.65668l-3.0857 14.0805c-.1562.7136-.8611 1.1658-1.5747 1.0086-.1774-.0385-.3442-.1138-.4918-.2198l-6.1453-4.4415c-.3694-.2671-.4533-.784-.1852-1.1543.0289-.0395.0617-.0771.0964-.1118l6.319-6.07213c.1311-.12632.135-.33557.0087-.46768-.109-.11282-.2826-.13404-.4156-.04918L7.88597 13.0975c-.5101.324-1.13978.3973-1.7116.1996l-3.618-1.2516c-.43103-.1485-.65957-.6201-.51107-1.0511.081-.2314.25939-.4166.48889-.5034Z"/>
    </svg>
  );
}

function SvgDiscord({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
    </svg>
  );
}
