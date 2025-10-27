// src/pages/RulesPage.tsx
import { useEffect, useRef, useState } from 'react';

type TocItem = { id: string; title: string };

const SECTIONS: TocItem[] = [
  { id: 'intro', title: 'Введение' },
  { id: 'forbidden', title: 'Запрещено' },
  { id: 'chat', title: 'Общение' },
  { id: 'techmagic', title: 'Техномагия и моды' },
  { id: 'build', title: 'Строительство' },
  { id: 'farms', title: 'Фермы и механизмы' },
  { id: 'pvp', title: 'PVP / PVE' },
  { id: 'trade', title: 'Экономика и торговля' },
  { id: 'security', title: 'Безопасность и аккаунты' },
  { id: 'penalties', title: 'Наказания' },
];

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100">
      {/* Левое меню */}
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      {/* Контент */}
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold">Правила сервера</h1>
        <Callout />

        <Section id="intro" title="Введение" n={1}>
          <p className="text-slate-300">
            Сервер имеет <span className="text-sky-400">один мир</span> и тематику <span className="text-sky-400">техномагии</span>. 
            Цель — комфортная кооперация и стабильность. Администрация оставляет за собой право принимать решения по ситуациям, 
            не описанным прямо в правилах.
          </p>
          <ul className="mt-3 list-disc pl-5 text-slate-300">
            <li>Уважайте других игроков, помогайте новичкам, играйте честно.</li>
            <li>Сообщайте о нарушениях в тикеты/модераторам.</li>
          </ul>
        </Section>

        <Section id="forbidden" title="Запрещено" n={2}>
          <ol className="list-decimal pl-6 space-y-3">
            <li><b>Гриферство.</b> Разрушение чужих построек без разрешения.</li>
            <li><b>Оскорбительное поведение.</b> Мат, уничижительные выражения в адрес игроков/администрации.</li>
            <li><b>Токсичность.</b> Нарушение общения, крики в войсах, вредные звуки, злоупотребление войс-модификацией.</li>
            <li><b>Флуд и спам.</b> Бессмысленные или однотипные сообщения.</li>
            <li><b>Оффтоп</b> в тематических каналах/чатах.</li>
            <li><b>Вредоносный контент.</b> Вирусы, фишинг, шок-контент, подозрительные ссылки.</li>
            <li><b>Контент 18+.</b> Порнография и эротика.</li>
            <li><b>Разглашение персональных данных</b> без согласия.</li>
            <li><b>Дезинформация</b> и подрыв репутации проекта.</li>
            <li><b>Выпрашивание привилегий</b> у игроков и администрации.</li>
            <li><b>Манипуляции с правилами</b> и поиски «лазеек».</li>
            <li><b>Твинки</b> для обхода наказаний или получения выгоды.</li>
            <li><b>Читы/ПО, дающее преимущество</b>, их реклама или пропаганда.</li>
            <li><b>Коммерческая реклама</b> без согласования с администрацией.</li>
          </ol>
        </Section>

        <Section id="chat" title="Общение" n={3}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Соблюдайте законы юрисдикции хостинга и платформы.</li>
            <li>Не публикуйте личные данные третьих лиц.</li>
            <li>Вики и предложения — в соответствующие каналы. Критика конструктивная.</li>
          </ul>
        </Section>

        <Section id="techmagic" title="Техномагия и моды" n={4}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Разрешены моды, входящие в сборку сервера. Сторонние моды по клиенту, дающие преимущество, запрещены.</li>
            <li>Визуальные и QoL-моды допустимы, если не дают геймплейного преимущества.</li>
            <li>Эксплойты/дюпы любых механик техномагии запрещены. Сообщайте о багах модераторам.</li>
          </ul>
        </Section>

        <Section id="build" title="Строительство" n={5}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Не пересекайте чужие территории без согласования. Ставьте таблички и метки.</li>
            <li>Сохраняйте проходы и общие дороги. Не блокируйте порталы/шлюзы.</li>
            <li>После демонтажа — приводите местность в порядок.</li>
          </ul>
        </Section>

        <Section id="farms" title="Фермы и механизмы" n={6}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Тяжёлые механизмы согласовывайте. Нагрузка не должна сажать TPS.</li>
            <li>Авто-фермы допустимы при наличии ограничителей скорости и выключателей.</li>
            <li>Моб-кап и лимиты чанков действуют. Администрация может отключить источник лагов.</li>
          </ul>
        </Section>

        <Section id="pvp" title="PVP / PVE" n={7}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>PVP — только по взаимному согласию или в отмеченных зонах/событиях.</li>
            <li>Запрещено байтить на PVP через провокации или обман.</li>
          </ul>
        </Section>

        <Section id="trade" title="Экономика и торговля" n={8}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Сделки проводите через торговые станции/книги-договоры. Фиксируйте условия.</li>
            <li>Реклама магазинов — в выделённых местах/каналах.</li>
          </ul>
        </Section>

        <Section id="security" title="Безопасность и аккаунты" n={9}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Безопасность аккаунта — ответственность владельца. Не делитесь доступом.</li>
            <li>Запрещён обход банов через твинков/VPN.</li>
            <li>Подозрительную активность сообщайте администрации.</li>
          </ul>
        </Section>

        <Section id="penalties" title="Наказания" n={10}>
          <p className="text-slate-300">
            Меры применяются по шкале: предупреждение → мут/джайл → временный бан → пермабан. 
            Степень зависит от тяжести, повторяемости и последствий. Администрация может усилить наказание при отягчающих обстоятельствах.
          </p>
        </Section>
      </main>

      {/* Правый TOC */}
      <aside className="col-span-12 md:col-span-3">
        <RightToc items={SECTIONS} />
      </aside>
    </div>
  );
}

/* ---------- Components ---------- */

function Callout() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 text-base font-semibold">Рекомендация</div>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>Ищите по странице: <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
        <li>Сомневаетесь — спросите модератора до начала работ.</li>
      </ul>
    </div>
  );
}

function LeftNav() {
  return (
    <nav className="sticky top-20">
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {SECTIONS.map(s => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-slate-300 hover:text-sky-300">{s.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RightToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const obs = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const els = items.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (obs.current) obs.current.disconnect();
    obs.current = new IntersectionObserver(
      es => {
        const top = es.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5, 1] }
    );
    els.forEach(el => obs.current!.observe(el));
    return () => obs.current?.disconnect();
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
              <a href={`#${it.id}`} className={on ? 'text-sky-300' : 'text-slate-300 hover:text-sky-300'}>{it.title}</a>
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

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs">{children}</kbd>;
}
