import { Link } from 'react-router-dom'
import { SvgTelegram, SvgDiscord } from '@/shared/ui/Icons';
import { DISCORD_URL, TELEGRAM_URL } from '@/shared/constants';

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
          <a href="/terms" className="hover:text-white">Пользовательское соглашение</a>
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

