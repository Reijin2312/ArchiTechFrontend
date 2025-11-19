import { useMemo } from 'react';
import { authStore } from '@/shared/store/auth';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { LeftNav as BaseLeftNav, Section as BaseSection, Callout, pageVariants } from '@/shared/ui/PageSidebar';
import { useIsMobile } from '@/shared/ui/useIsMobile';

const TELEGRAM_BOT = 'https://t.me/Archi_payment_bot';

export default function ShopPage() {
  useWallpaper();
  const isMobile = useIsMobile();

  const user = authStore((s) => s.user);
  const nick = user?.username || 'ваш_ник';

  const deepLink = useMemo(() => {
    const p = new URLSearchParams({ start: `activate-${nick}` }).toString();
    return `${TELEGRAM_BOT}?${p}`;
  }, [nick]);

  return (
    <>
    <Seo {...routesMeta['/shop']} />
    <motion.div
          className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100"
          variants={isMobile ? undefined : pageVariants}
          initial={isMobile ? false : 'hidden'}
          animate={isMobile ? false : 'show'}
    >
      <aside className="col-span-12 md:col-span-3">
        <BaseLeftNav disableMotion={isMobile} items={[
          { id: 'price', title: 'Доступ' },
          { id: 'how', title: 'Как активировать' },
          { id: 'discounts', title: 'Поддержка' },
          { id: 'policy', title: 'Зачем это нужно' },
          { id: 'faq', title: 'FAQ' },
        ]} blurIntensity="xl" bgOpacity="60" />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">Получение проходки</h1>

        <Callout title="Честная модель без доната">
          <p className="text-sm text-slate-300">
            Проходка <b>бесплатна для всех игроков</b>. Не даёт никаких преимуществ, не открывает платные команды, донатное оружие и тому подобные привилегии.
          </p>
        </Callout>

        <BaseSection id="how" n={1} title="Активация через Telegram-бота" disableMotion={isMobile}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Перейдите к боту по кнопке ниже.</li>
            <li>Выберите «Активировать проходку» и следуйте шагам.</li>
            <li>Укажите ник: <b>{nick}</b>.</li>
            <li>Подтвердите. Оплата не требуется.</li>
            <li>После подтверждения администратором бот добавит вас в whitelist.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={deepLink}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500"
            >
              Открыть бота и активировать
            </a>
            <a
              href={TELEGRAM_BOT}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
            >
              Открыть профиль бота
            </a>
          </div>
        </BaseSection>

        <BaseSection id="discounts" n={2} title="Поддержка проекта" disableMotion={isMobile}>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <b>Добровольные пожертвования:</b> через того же бота. Не дают привилегий и не влияют на геймплей.
            </li>
            <li>
              <b>PR/творчество:</b> посты, обзоры, гайды, арты, видеоролики — напишите администрации. Возможны благодарности от проекта.
            </li>
          </ul>
        </BaseSection>

        <BaseSection id="policy" n={3} title="Зачем это нужно" disableMotion={isMobile}>
          <p className="text-slate-300">
            Проходка — способ учёта новых игроков и защиты сервера. <b>Не даёт донат-привилегий.</b>
          </p>
        </BaseSection>

        <BaseSection id="faq" n={4} title="FAQ" disableMotion={isMobile}>
          <dl className="space-y-3">
            <QA q="Когда активируется проходка?">
              Сразу после подтверждения вашей заявки из бота администратором.
            </QA>
            <QA q="Что если указал ник с ошибкой?">
              Исправьте ник в профиле на сайте или отправьте заявку повторно. Неверная будет автоматически отклонена.
            </QA>
            <QA q="Где узнать статус?">
              Команда бота «Моя проходка» покажет состояние.
            </QA>
            <QA q="Можно играть без проходки?">
              Нет. Доступ разрёшен только верифицированным игрокам.
            </QA>
          </dl>
        </BaseSection>
      </main>

      <aside className="col-span-12 md:col-span-3">
        <RightBox nick={nick} deepLink={deepLink} />
      </aside>
    </motion.div>
    </>
  );
}

function RightBox({ nick, deepLink }: { nick: string; deepLink: string }) {
  return (
    <div className="sticky top-20 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
        <div className="text-sm text-slate-300">Ваш ник</div>
        <div className="mt-1 text-lg font-semibold">{nick}</div>
        <a href={deepLink} className="mt-3 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500">
          Активировать через бота
        </a>
        <p className="mt-2 text-xs text-slate-400">
          Важно: укажите правильный ник. После активации доступ появится автоматически.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 backdrop-blur-md backdrop-saturate-150">
        <div className="font-semibold mb-1">Поддержка проекта</div>
        Пожертвования добровольные и осуществляются через бота. Привилегий не дают.
      </div>
    </div>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md backdrop-saturate-150">
      <div className="font-semibold">{q}</div>
      <div className="mt-1 text-slate-300 text-sm">{children}</div>
    </div>
  );
}
