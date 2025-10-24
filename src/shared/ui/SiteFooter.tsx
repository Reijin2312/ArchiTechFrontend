import React from 'react';

const DISCORD_URL = 'https://discord.gg/your-invite';
const TELEGRAM_URL = 'https://t.me/archi_tech_official';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-300">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/favicon-32.png" alt="logo" className="size-6" />
            <div>
              <span className="text-slate-200">Сервер является частью сети </span>
              <b className="text-white">ArchiTech</b>
            </div>
          </div>
          <div className="flex items-center gap-4 text-base">
            <a href={TELEGRAM_URL} aria-label="Telegram" className="hover:text-white text-slate-300"><SvgTelegram className="h-5" /></a>
            <a href={DISCORD_URL} aria-label="Discord" className="hover:text-white text-slate-300"><SvgDiscord className="h-5" /></a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="/contacts" className="hover:text-white">Контакты</a>
          <a href="/brand" className="hover:text-white">Дизайн</a>
          <a href="/terms" className="hover:text-white">Пользовательское соглашение</a>
          <a href="/privacy" className="hover:text-white">Политика конфиденциальности</a>
          <a href="/refund" className="hover:text-white">Политика возврата средств</a>
          <a href="/payments" className="hover:text-white">Условия оплаты</a>
          <a href="/pricing" className="hover:text-white">Цены</a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="max-w-3xl leading-relaxed">
            Not an official Minecraft product. We are in no way affiliated with or endorsed by Mojang Synergies AB, Microsoft Corporation or other rightsholders.
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Принимаем к оплате</span>
            <SvgMastercard className="h-5 text-slate-300" />
            <SvgVisa className="h-5 text-slate-300" />
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">© ArchiTech. 2024–2026. Все права защищены.</div>
      </div>
    </footer>
  );
}

function SvgVisa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 14" className={className} fill="currentColor" aria-hidden>
      <path d="M9.5 2.14 6.21 9.88H4.08L2.48 3.7c-.1-.38-.19-.52-.49-.68A8.62 8.62 0 0 0 0 2.38l.05-.23h3.43c.23 0 .45.08.62.23.17.14.28.34.32.56l.85 4.48 2.1-5.27h2.12Z"/>
      <path d="M17.86 7.35c0-2.04-2.85-2.15-2.83-3.06 0-.28.27-.58.86-.65.68-.07 1.37.05 1.99.34l.35-1.64A5.47 5.47 0 0 0 16.34 2c-2 0-3.4 1.05-3.41 2.56-.01 1.11 1 1.73 1.77 2.1.78.38 1.05.63 1.04.96 0 .52-.62.75-1.2.76-1.02.02-1.6-.27-2.08-.49l-.36 1.7c.47.21 1.34.4 2.24.41 2.12 0 3.51-1.04 3.52-2.65Z"/>
      <path d="M23.13 9.88H25l-1.63-7.74h-1.73a.93.93 0 0 0-.86.57l-3.03 7.17h2.13l.42-1.16h2.59l.24 1.16Zm-2.25-2.74 1.06-2.9.61 2.9h-1.67Zm-8.5-5L10.7 9.88H8.69l1.67-7.74h2.02Z"/>
    </svg>
  );
}

function SvgMastercard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 14" className={className} fill="currentColor" aria-hidden>
      <path d="m9.48 10.88.14.12a5.98 5.98 0 0 1-8.14-1.42A6 6 0 0 1 9.62 1l-.13.12a6.44 6.44 0 0 0-.01 9.76Z"/>
      <path d="M13.72 0c-1.23 0-2.37.37-3.32 1l.13.12a6.44 6.44 0 0 1-.14 9.88 5.98 5.98 0 0 0 7.57-.76A6 6 0 0 0 13.72 0Z"/>
      <path d="M10 1.3a5.98 5.98 0 0 0 0 9.43 5.98 5.98 0 0 0 0-9.43Z"/>
    </svg>
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
