import { useEffect, useRef, useState } from 'react';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion, type Variants } from 'framer-motion';

export type TocItem = { id: string; title: string };

export const SECTIONS: TocItem[] = [
  { id: 'intro', title: 'Введение' },
  { id: 'forbidden', title: 'Запрещено' },
  { id: 'chat', title: 'Общение' },
  { id: 'techmagic', title: 'Модификации и ресурс-паки' },
  { id: 'build', title: 'Строительство' },
  { id: 'farms', title: 'Фермы и механизмы' },
  { id: 'pvp', title: 'PVP / PVE' },
  { id: 'trade', title: 'Экономика и торговля' },
  { id: 'security', title: 'Безопасность и аккаунты' },
  { id: 'penalties', title: 'Наказания' },
];

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

export default function RulesPage() {
  useWallpaper();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <>
    <Seo {...routesMeta['/rules']} />
    <motion.div
      className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      <aside className="hidden md:block md:col-span-3">
        <LeftNav />
      </aside>
      
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-center text-[22px] md:text-[24px]">Правила сервера</h1>
        <Callout />

        <Section id="intro" title="Введение" n={1}>
          <p className="text-slate-300">
            Сервер состоит из <span className="text-sky-400">одного мира</span>. Тематикой является <span className="text-sky-400">техномагия с особым упором на строительство</span>. 
            Наша цель — создать комфортное и стабильное место для общения и взаимодействия.
            Администрация оставляет за собой право принимать решения по ситуациям, явно не описанным в правилах.
          </p>
          <ul className="mt-3 list-disc pl-5 text-slate-300">
            <li>Уважайте других игроков, помогайте новичкам, играйте честно.</li>
            <li>О любых нарушениях незамедлительно сообщайте модераторам.</li>
          </ul>
        </Section>

        <Section id="forbidden" title="Запрещено" n={2}>
          <ol className="list-decimal pl-6 space-y-3">
            <li><b>Гриферство.</b> Частичное или полное разрушение чужих построек без разрешения владельца.</li>
            <li><b>Оскорбительное поведение.</b> Мат, уничижительные выражения в адрес других игроков/администрации, за исключением случаев, когда это является своеобразным взаимным юмором. </li>
            <li><b>Токсичность.</b> Воспрепятствование общению, крики, громкие и повторяющиеся звуки, иные злоупотребления войс-чатом.</li>
            <li><b>Флуд и спам.</b> Бессмысленные или однотипные сообщения.</li>
            <li><b>Оффтоп</b> в тематических каналах/чатах.</li>
            <li><b>Вредоносный контент.</b> Вирусы, фишинг, шок-контент, подозрительные ссылки.</li>
            <li><b>Контент 18+.</b> Порнография и эротика в любых её проявлениях.</li>
            <li><b>Разглашение персональных данных</b> игроков без их согласия.</li>
            <li><b>Дезинформация</b> и подрыв репутации проекта.</li>
            <li><b>Выпрашивание привилегий</b> у игроков и администрации.</li>
            <li><b>Манипуляции с правилами</b> и поиски «лазеек» в целях оправдать собственные нарушения.</li>
            <li><b>Твинки</b> для обхода наказаний или получения выгоды.</li>
            <li><b>Читы/ПО, моды, ресурс-паки дающее преимущество</b>, их реклама или пропаганда.</li>
            <li><b>Коммерческая реклама</b> без согласования с администрацией.</li>
          </ol>
        </Section>

        <Section id="chat" title="Общение" n={3}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Соблюдайте законы юрисдикции хостинга и платформы.</li>
            <li>Не публикуйте личные данные третьих лиц.</li>
            <li>Предложения с конструктивной критикой направляйте в соответствующие каналы. Избегайте оффтопа.</li>
          </ul>
        </Section>

        <Section id="techmagic" title="Модификации и ресурс-паки" n={4}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Разрешены моды, входящие в сборку сервера. Сторонние клиентские моды допустимы, за исключением дающих преимущество чит-модов. </li>
            <li>Визуальные и QoL-моды допустимы, если не дают геймплейного преимущества.</li>
            <li>Эксплойты и дюпы любых механик запрещены, за исключением дюпа динамита, яиц дракона и ковров. О найденных багах сообщайте модераторам.</li>
          </ul>
        </Section>

        <Section id="build" title="Строительство" n={5}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Не допускайте пересечения вашей зоны постройки с чужими территориями без согласования.</li>
            <li>Ставьте таблички и иные метки, по которым можно определить принадлежность занятой территории вам.</li>
            <li>Ломать чужие таблички и конфисковать себе чужие территории строго запрещено. Исключение: спавновый остров в случае, если за месяц после присвоения территории на ней не было ничего построено.</li>
            <li>Сохраняйте проходы, магистрали, жд-пути и иные общие дороги. Не блокируйте порталы и перекрёстки, не создавайте препятствий движению поездов.</li>
            <li>После демонтажа построек или терраформирования приводите местность в порядок.</li>
          </ul>
        </Section>

        <Section id="farms" title="Фермы и механизмы" n={6}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Тяжёлые и большие механизмы / фермы согласовывайте с модерацией. Создаваемая нагрузка не должна сажать TPS сервера и приводить к лагам.</li>
            <li>Авто-фермы допустимы при наличии ограничителей скорости и выключателей.</li>
            <li>Лимит мобов действует. Администрация имеет право уничтожить источник лагов.</li>
          </ul>
        </Section>

        <Section id="pvp" title="PVP / PVE" n={7}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>PVE не запрещено.</li>
            <li>PVP разрешено только по взаимному согласию его участников или в отмеченных зонах/событиях.</li>
            <li>Запрещено байтить на PVP через провокации или обман.</li>
          </ul>
        </Section>

        <Section id="trade" title="Экономика и торговля" n={8}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Сделки рекомендуется проводить через специальные торговые станции. Фиксируйте условия, например, в книгах. </li>
            <li>Реклама собственных магазинов разрешена в специально отведённых местах.</li>
          </ul>
        </Section>

        <Section id="security" title="Безопасность и аккаунты" n={9}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Безопасность аккаунта - ответственность его владельца.</li>
            <li>Не делитесь с посторонними данными для входа и не сообщайте коды доступа ни при каких обстоятельствах.</li>
            <li>Администрация не имеет доступа к вашим данным. Они хранятся в зашифрованном виде.</li>
            <li>Запрещён обход банов через твинки и VPN.</li>
            <li>При любой подозрительной активности немедленно сообщайте администрации.</li>
          </ul>
        </Section>

        <Section id="penalties" title="Наказания" n={10}>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Меры наказания применяются в соответствии со следующей шкалой: <b>предупреждение → мут → временный бан → перманентный бан.</b> </li>
            <li>Степень наказания зависит от тяжести, повторяемости нарушений и их последствий. </li>
            <li>Администрация вправе усилить наказание при наличии отягчающих обстоятельств.</li>
          </ul>
        </Section>
      </main>

      <aside className="hidden md:block md:col-span-3">
        <RightToc items={SECTIONS} />
      </aside>
    </motion.div>
    </>
  );
}

function Callout() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-2 text-base font-semibold">Рекомендация</div>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>Быстрый поиск по странице: <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
        <li>По оставшимся вопросам вы можете обратиться к адмиристрации.</li>
      </ul>
    </div>
  );
}

function LeftNav() {
  return (
    <motion.nav
      className="sticky top-20"
      variants={sideNavVariants}
      initial="hidden"
      animate="show"
    >
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {SECTIONS.map(s => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-slate-300 hover:text-sky-300">{s.title}</a>
          </li>
        ))}
      </ul>
    </motion.nav>
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
    <motion.nav
      className="sticky top-20"
      variants={tocVariants}
      initial="hidden"
      animate="show"
    >
      <div className="mb-2 text-slate-300 text-sm">На этой странице</div>
      <ol className="space-y-2 text-sm">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400">
                {i + 1}
              </span>
              <a href={`#${it.id}`} className={on ? 'text-sky-300' : 'text-slate-300 hover:text-sky-300'}>{it.title}</a>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}

function Section({ id, title, n, children }: { id: string; title: string; n: number; children: React.ReactNode }) {
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

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs">{children}</kbd>;
}
