import { useMemo } from 'react';
import { authStore } from '@/shared/store/auth';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { useScrollTop } from '@/shared/ui/useScrollTop';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion, type Variants } from 'framer-motion';

const TELEGRAM_BOT = 'https://t.me/Archi_payment_bot';

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const sideNavVariants: Variants = {
  hidden: { opacity: 0, x: -16, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

const tocVariants: Variants = {
  hidden: { opacity: 0, x: 16, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: 'easeOut', delay: 0.05 },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export default function ShopPage() {
  useWallpaper();
  useScrollTop();

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
          variants={pageVariants}
          initial="hidden"
          animate="show"
    >
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">Получение проходки</h1>

        <CalloutFree />

        <Section id="how" n={1} title="Активация через Telegram-бота">
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
        </Section>

        <Section id="discounts" n={2} title="Поддержка проекта">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <b>Добровольные пожертвования:</b> через того же бота. Не дают привилегий и не влияют на геймплей.
            </li>
            <li>
              <b>PR/творчество:</b> посты, обзоры, гайды, арты, видеоролики — напишите администрации. Возможны благодарности от проекта.
            </li>
          </ul>
        </Section>

        <Section id="policy" n={3} title="Зачем это нужно">
          <p className="text-slate-300">
            Проходка — способ учёта новых игроков и защиты сервера. <b>Не даёт донат-привилегий.</b>
          </p>
        </Section>

        <Section id="faq" n={4} title="FAQ">
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
        </Section>
      </main>

      <aside className="col-span-12 md:col-span-3">
        <RightBox nick={nick} deepLink={deepLink} />
      </aside>
    </motion.div>
    </>
  );
}

function LeftNav() {
  const items = [
    { id: 'price', title: 'Доступ' },
    { id: 'how', title: 'Как активировать' },
    { id: 'discounts', title: 'Поддержка' },
    { id: 'policy', title: 'Зачем это нужно' },
    { id: 'faq', title: 'FAQ' },
  ];
  return (
    <motion.nav
      className="sticky top-20 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 backdrop-blur-md backdrop-saturate-150"
      variants={sideNavVariants}
      initial="hidden"
      animate="show"
    >
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {items.map(i => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="text-slate-300 hover:text-sky-300">{i.title}</a>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}

function Section({
  id, title, n, children,
}: { id: string; title: string; n: number; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className="scroll-mt-24"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-15% 0px' }}
    >
      <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 text-lg font-semibold">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-slate-50 text-sm">{n}</span>
      {title}
      </h2>
      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">{children}</div>
    </motion.section>
  );
}

function CalloutFree() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-2 text-base font-semibold">Честная модель без доната</div>
      <p className="text-sm text-slate-300">
        Проходка <b>бесплатна для всех игроков</b>. Не даёт никаких преимуществ, не открывает платные команды, донатное оружие и тому подобные привилегии.
      </p>
    </div>
  );
}

function RightBox({ nick, deepLink }: { nick: string; deepLink: string }) {
  return (
    <motion.div
          className="sticky top-20 space-y-3"
          variants={tocVariants}
          initial="hidden"
          animate="show"
    >
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
    </motion.div>
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
