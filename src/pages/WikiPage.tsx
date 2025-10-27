import { useEffect, useMemo, useRef, useState } from 'react';

/* ---------- TOC ---------- */
type TocItem = { id: string; title: string; n: number };
const SECTIONS: TocItem[] = [
  { id: 'intro', title: 'О сервере и тематика', n: 1 },
  { id: 'start', title: 'Как начать играть', n: 2 },
  { id: 'mods', title: 'Список модов', n: 3 },
  { id: 'progress', title: 'Прогрессия техномагии', n: 4 },
  { id: 'commands', title: 'Команды сервера и бота', n: 5 },
  { id: 'economy', title: 'Экономика', n: 6 },
  { id: 'perf', title: 'Производительность', n: 7 },
  { id: 'faq', title: 'FAQ', n: 8 },
  { id: 'links', title: 'Ссылки', n: 9 },
];

type Mod = { name: string; cat: 'Tech' | 'Magic' | 'QoL' | 'World' | 'Core'; brief: string; wiki?: string };
const MODS: Mod[] = [
  { name: 'Create', cat: 'Tech', brief: 'Кинетика, механизмы, транспорт' },
  { name: 'Applied Energistics 2', cat: 'Tech', brief: 'ME-сеть, автокрафт, диски' },
  { name: 'Botania', cat: 'Magic', brief: 'Мана, цветочная магия, инструменты' },
  { name: 'Occultism', cat: 'Magic', brief: 'Призывы, духи, автоматика' },
  { name: 'Mekanism', cat: 'Tech', brief: 'Руды, генерация, индастриал' },
  { name: 'Astral Sorcery', cat: 'Magic', brief: 'Созвездия, алтари, бафы' },
  { name: 'Patchouli', cat: 'QoL', brief: 'Руководства внутри игры' },
  { name: 'JEI', cat: 'QoL', brief: 'Просмотр рецептов и использований' },
  { name: 'Waystones', cat: 'QoL', brief: 'Телепорты между точками' },
  { name: 'FTB Chunks', cat: 'QoL', brief: 'Клеймы, защита территорий' },
  { name: 'JourneyMap', cat: 'QoL', brief: 'Карта, маркеры' },
  { name: 'Create: Crafts & Additions', cat: 'Tech', brief: 'Электрика для Create' },
];

type Cmd = { cmd: string; desc: string; scope: 'server' | 'bot' };
const CMDS: Cmd[] = [
  { cmd: '/spawn', desc: 'Телепорт на спавн', scope: 'server' },
  { cmd: '/home, /sethome, /delhome', desc: 'Дом, установка и удаление', scope: 'server' },
  { cmd: '/msg <ник> <текст>', desc: 'Личные сообщения', scope: 'server' },
  { cmd: '/rtp', desc: 'Случайный телепорт (если включено)', scope: 'server' },
  { cmd: '/claim, /map', desc: 'Клейм и карта чанков (FTB Chunks)', scope: 'server' },
  { cmd: 'Бот: старт', desc: 'Начало, меню оплаты проходки', scope: 'bot' },
  { cmd: 'Бот: привязать ник', desc: 'Связка Telegram ↔ ник', scope: 'bot' },
  { cmd: 'Бот: моя проходка', desc: 'Срок действия, дата окончания', scope: 'bot' },
  { cmd: 'Бот: пригласить друга', desc: 'Реферальная ссылка и скидки', scope: 'bot' },
];

/* ---------- PAGE ---------- */
export default function WikiPage() {
  return (
    <div className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100">
      {/* Left */}
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      {/* Main */}
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold">Вики сервера</h1>
        <Callout />

        <Section id="intro" title="О сервере и тематика" n={1}>
          <p className="text-slate-300">
            Один мир. Тематика — <span className="text-sky-300">техномагия</span>: сочетание технологических модов и магических систем.
            Баланс без донат-преимуществ. Упор на кооперацию, крафт и автоматизацию.
          </p>
        </Section>

        <Section id="start" title="Как начать играть" n={2}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Купите проходку в Telegram-боте, привяжите ник.</li>
            <li>Зайдите на сервер. Заберите старт-книги (Patchouli/инструкции).</li>
            <li>Отметьте базу: <code className="px-1 rounded bg-slate-800 text-xs">/sethome</code>, заклеймите чанки в FTB.</li>
            <li>Начните с добычи руд и Create-механики. Далее — ME/магия.</li>
          </ol>
        </Section>

        <ModsSection />

        <Section id="progress" title="Прогрессия техномагии" n={4}>
          <ul className="space-y-3 text-slate-300">
            <li>
              <b>I. Старт:</b> Железо → медь → базовые Create механизмы, руда-обработка. Инструменты раннего тира.
            </li>
            <li>
              <b>II. Склад:</b> AE2 начальная сеть, энергия, автокрафт простых деталей. Лёгкие фермы ресурсов.
            </li>
            <li>
              <b>III. Магия:</b> Botania/Occultism: мана-инфраструктура, ритуалы, утилитарные предметы.
            </li>
            <li>
              <b>IV. Индастриал:</b> Mekanism/электрика Create C&A, мультиблоки, генерация.
            </li>
            <li>
              <b>V. Поздняя игра:</b> Полный автокрафт, высокие ритуалы, автоматизация босс-ресурсов (если есть).
            </li>
          </ul>
        </Section>

        <CommandsSection />

        <Section id="economy" title="Экономика" n={6}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Бартер/торговые станции на базах. Рекламу магазинов — в спец. каналах.</li>
            <li>Крупные сделки фиксируйте книгой-договором.</li>
          </ul>
        </Section>

        <Section id="perf" title="Производительность" n={7}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Ставьте выключатели на фермы. Ограничивайте скорость подачи предметов.</li>
            <li>Не создавайте бесконечные сущности и «лаг-машины». Админы могут отключить источник лагов.</li>
            <li>Клиент: снизьте рендер-дистанцию, включите VBO, используйте легковесные шейдеры/ресурс-пак.</li>
          </ul>
        </Section>

        <FaqSection />

        <Section id="links" title="Ссылки" n={9}>
          <ul className="list-disc pl-5 text-slate-300">
            <li><a className="text-sky-300 hover:text-sky-200" href="/rules">Правила сервера</a></li>
            <li><a className="text-sky-300 hover:text-sky-200" href="/shop">Покупка проходки</a></li>
            <li><a className="text-sky-300 hover:text-sky-200" href="/map">Онлайн-карта</a> (если включена)</li>
          </ul>
        </Section>
      </main>

      {/* Right */}
      <aside className="col-span-12 md:col-span-3">
        <RightToc items={SECTIONS} />
      </aside>
    </div>
  );
}

/* ---------- Sections ---------- */

function ModsSection() {
  const [q, setQ] = useState('');
  const data = useMemo(
    () =>
      MODS.filter(
        (m) =>
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          m.cat.toLowerCase().includes(q.toLowerCase())
      ),
    [q]
  );

  return (
    <Section id="mods" title="Список модов" n={3}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-300">Основные категории: Tech, Magic, QoL, World, Core.</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по модам…"
          className="w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-slate-500"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-slate-300">
            <tr>
              <th className="px-3 py-2">Мод</th>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2">Кратко</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.name} className="border-t border-slate-800">
                <td className="px-3 py-2 text-sky-300">{m.name}</td>
                <td className="px-3 py-2 text-slate-300">{m.cat}</td>
                <td className="px-3 py-2 text-slate-300">{m.brief}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CommandsSection() {
  const server = CMDS.filter((c) => c.scope === 'server');
  const bot = CMDS.filter((c) => c.scope === 'bot');

  return (
    <Section id="commands" title="Команды сервера и бота" n={5}>
      <div className="grid gap-4 md:grid-cols-2">
        <CmdTable title="Сервер" items={server} />
        <CmdTable title="Telegram-бот" items={bot} />
      </div>
    </Section>
  );
}

function FaqSection() {
  const qa = [
    { q: 'Как попасть на сервер?', a: 'Купить проходку в Telegram-боте, привязать ник, дождаться записи в whitelist.' },
    { q: 'Список модов фиксированный?', a: 'Да. Клиентские QoL-моды без преимущества допустимы, если не нарушают античит.' },
    { q: 'Разрешён PVP?', a: 'По взаимному согласию или в специальных зонах/ивентах.' },
    { q: 'Можно переносить базу?', a: 'Да. Предупредите соседей и снимите клеймы перед переездом.' },
  ];
  return (
    <Section id="faq" title="FAQ" n={8}>
      <div className="space-y-3">
        {qa.map((x) => (
          <div key={x.q} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="font-semibold">{x.q}</div>
            <div className="mt-1 text-sm text-slate-300">{x.a}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Small UI ---------- */

function LeftNav() {
  return (
    <nav className="sticky top-20">
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-slate-300 hover:text-sky-300">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RightToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headers = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    observer.current?.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    headers.forEach((h) => observer.current!.observe(h));
    return () => observer.current?.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-20">
      <div className="mb-2 text-slate-300 text-sm">На этой странице</div>
      <ol className="space-y-2 text-sm">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="flex items-start gap-2">
              <span className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400">
                {i + 1}
              </span>
              <a href={`#${it.id}`} className={on ? 'text-sky-300' : 'text-slate-300 hover:text-sky-300'}>
                {it.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Section({ id, title, n, children }: { id: string; title: string; n: number; children: React.ReactNode }) {
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

function CmdTable({ title, items }: { title: string; items: Cmd[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 text-sm font-semibold text-sky-300">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-slate-300">
            <tr>
              <th className="px-3 py-2">Команда</th>
              <th className="px-3 py-2">Описание</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.cmd} className="border-t border-slate-800">
                <td className="px-3 py-2 text-sky-300">{c.cmd}</td>
                <td className="px-3 py-2 text-slate-300">{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Callout() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-1 text-base font-semibold">Как пользоваться вики</div>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>Переходите по разделам слева или используйте <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd>.</li>
        <li>Список модов можно фильтровать по названию или категории.</li>
      </ul>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs">{children}</kbd>;
}
