import { useMemo } from 'react';
import { authStore } from '@/shared/store/auth';

const TELEGRAM_BOT = 'https://t.me/@Archi_payment_bot';

export default function ShopPage() {
  const user = authStore((s) => s.user);
  const nick = user?.username || 'ваш_ник';
  const deepLink = useMemo(() => {
    const p = new URLSearchParams({ start: `buy-${nick}` }).toString();
    return `${TELEGRAM_BOT}?${p}`;
  }, [nick]);

  return (
    <div className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100">
      {/* Левое меню */}
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      {/* Контент */}
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold">Покупка проходки</h1>

        <Callout />

        {/* Стоимость */}
        <Section id="price" n={1} title="Стоимость и варианты">
          <div className="grid gap-3 sm:grid-cols-3">
            <PriceCard title="1 месяц" price="250 ₽" note="Базовый период" />
            <PriceCard title="3 месяца" price="650 ₽" old="750 ₽" note="Экономия 100 ₽" />
            <PriceCard title="12 месяцев" price="1 800 ₽" old="3 000 ₽" note="Лучшее предложение" />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Проходка одинаковая для всех. <span className="text-sky-300">Никаких преимуществ в игре</span>.
          </p>
        </Section>

        {/* Как оплатить */}
        <Section id="how" n={2} title="Как оплатить через Telegram-бота">
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Перейдите к боту по кнопке ниже.</li>
            <li>Выберите «Купить проходку» и следуйте шагам.</li>
            <li>Укажите ник: <b>{nick}</b>.</li>
            <li>Оплатите встроенным методом Telegram.</li>
            <li>После подтверждения бот запишет срок проходки и добавит вас в whitelist.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={deepLink}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500"
            >
              Открыть бота и оплатить
            </a>
            <a
              href={TELEGRAM_BOT}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
            >
              Открыть профиль бота
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Реквизиты из старого способа оплаты не используются. Оплата происходит только через бота.
          </p>
        </Section>

        {/* Скидки */}
        <Section id="discounts" n={3} title="Скидки и поддержка">
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <b>Реферальная программа:</b> пригласил друга — <b>−50 ₽</b> к твоей следующей оплате. Друга — тоже <b>−50 ₽</b>.
              <div className="mt-1 text-xs text-slate-400">
                Достаточно, чтобы приглашённый указал твой ник в сообщении боту. После проверки оба получат скидку.
              </div>
            </li>
            <li><b>3 месяца:</b> 650 ₽ вместо 750 ₽.</li>
            <li><b>Год:</b> 1 800 ₽ вместо 3 000 ₽.</li>
            <li>
              <b>PR/творчество:</b> посты, обзоры, гайды, арты, баннеры — напишите администрации. Возможны скидки или бесплатная проходка.
            </li>
          </ul>
        </Section>

        {/* Политика и честность */}
        <Section id="policy" n={4} title="Зачем это нужно">
          <p className="text-slate-300">
            Проходка — способ поддержать сервер: хостинг, электричество, интернет, обновления. <b>Без донат-привилегий. </b>
            Все средства идут на нужды сервера.
          </p>
        </Section>

        {/* FAQ */}
        <Section id="faq" n={5} title="FAQ">
          <dl className="space-y-3">
            <QA q="Когда активируется проходка?">
              Сразу после подтверждения оплаты ботом.
            </QA>
            <QA q="Что если указал ник с ошибкой?">
              Напишите админу через бота. Исправим вручную после проверки.
            </QA>
            <QA q="Где узнать срок окончания?">
              Команда бота «Моя проходка» покажет дату.
            </QA>
            <QA q="Можно играть без проходки?">
              Нет. Доступ только с активной проходкой и в whitelist.
            </QA>
          </dl>
        </Section>
      </main>

      {/* Правый сайдбар */}
      <aside className="col-span-12 md:col-span-3">
        <RightBox nick={nick} deepLink={deepLink} />
      </aside>
    </div>
  );
}

/* ---------- Components ---------- */

function LeftNav() {
  const items = [
    { id: 'price', title: 'Стоимость' },
    { id: 'how', title: 'Как оплатить' },
    { id: 'discounts', title: 'Скидки' },
    { id: 'policy', title: 'Зачем это нужно' },
    { id: 'faq', title: 'FAQ' },
  ];
  return (
    <nav className="sticky top-20">
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {items.map(i => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="text-slate-300 hover:text-sky-300">{i.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({
  id, title, n, children,
}: { id: string; title: string; n: number; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 text-lg font-semibold">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-slate-50 text-sm">{n}</span>
        {title}
      </h2>
      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">{children}</div>
    </section>
  );
}

function Callout() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 text-base font-semibold">Честная модель без доната</div>
      <p className="text-sm text-slate-300">
        Проходка — <b>способ поддержки существования проекта. Не даёт преимуществ</b>, не открывает платные команды, донат-оружие и тому подобные привилегии.
      </p>
    </div>
  );
}

function PriceCard({ title, price, old, note }: { title: string; price: string; old?: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-sky-300">{price}</div>
      {old && <div className="text-xs text-slate-500 line-through">{old}</div>}
      {note && <div className="mt-1 text-xs text-slate-400">{note}</div>}
    </div>
  );
}

function RightBox({ nick, deepLink }: { nick: string; deepLink: string }) {
  return (
    <div className="sticky top-20 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-sm text-slate-300">Ваш ник</div>
        <div className="mt-1 text-lg font-semibold">@{nick}</div>
        <a href={deepLink} className="mt-3 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500">
          Оплатить через бота
        </a>
        <p className="mt-2 text-xs text-slate-400">
          Важно: укажите правильный ник. После оплаты доступ появится автоматически.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        <div className="font-semibold mb-1">Реферальная программа</div>
        Пригласи друга — минус 50 ₽ тебе и ему. Попросите друга указать твой ник при оплате в боте.
      </div>
    </div>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="font-semibold">{q}</div>
      <div className="mt-1 text-slate-300 text-sm">{children}</div>
    </div>
  );
}
