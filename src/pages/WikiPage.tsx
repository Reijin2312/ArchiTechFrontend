import type { ComponentProps } from 'react';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { LeftNav as BaseLeftNav, RightToc as BaseRightToc, Section as BaseSection, Kbd, Callout, pageVariants } from '@/shared/ui/PageSidebar';
import { useIsMobile } from '@/shared/ui/useIsMobile';

export type WikiTocItem = { id: string; title: string; n: number };
export const WIKI_SECTIONS: WikiTocItem[] = [
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

type Mod = { name: string; cat: 'Tech' | 'Magic' | 'Decoration' | 'Food' | 'QoL' | 'World' | 'Optimization' | 'Core'; brief: string; wiki?: string };
const MODS: Mod[] = [
  { name: 'Ars Nouveau', cat: 'Magic', brief: 'Модульная магия и собственные заклинания' },
  { name: 'Ars Elemental', cat: 'Magic', brief: 'Элементальные школы для Ars Nouveau' },
  { name: 'Ars Additions', cat: 'Magic', brief: 'QoL-добавки и иммерсия для Ars Nouveau' },
  { name: 'Ars Fauna', cat: 'Magic', brief: 'Больше атмосферных вариаций магических существ' },
  { name: 'Ars Ocultas', cat: 'Magic', brief: 'Совместимость Ars Nouveau и Occultism' },
  { name: 'Ars Creo', cat: 'Magic', brief: 'Интеграция с Create: турели и источники на штуковинах' },
  { name: "Ars Nouveau's Flavors & Delight", cat: 'Food', brief: 'Еда на ингредиентах из Ars Nouveau в стиле Farmer’s Delight' },
  { name: 'Ars Technica', cat: 'Magic', brief: 'Техномагические глифы и броня' },

  { name: 'Create', cat: 'Tech', brief: 'Ядро техники на сервере. Кинетика, конвейеры, автоматизация' },
  { name: 'Create: Enchantment Industry', cat: 'Tech', brief: 'Автоматизация чар через Create' },
  { name: 'Create: Central Kitchen', cat: 'Tech', brief: 'Связка с Farmer’s Delight' },
  { name: 'Create: Copycats+', cat: 'Tech', brief: 'Доп. копикэт-формы и трюки оформления' },
  { name: 'Create: Bells & Whistles', cat: 'Tech', brief: 'Декор и утилиты для поездов' },
  { name: 'Create: Framed', cat: 'Tech', brief: 'Больше разновидностей стёкол' },
  { name: 'Create: Food', cat: 'Food', brief: 'Расширение пищевого контента Create' },
  { name: 'Create: Dreams & Desires', cat: 'Tech', brief: 'Сборные QoL-фичи и новые Create блоки' },
  { name: 'Create: The Factory Must Grow', cat: 'Tech', brief: 'Эпоха дизеля, нефти и электричества в Create' },
  { name: 'Create Encased', cat: 'Tech', brief: 'Новые «encased» узлы и рецепты для Create' },
  { name: 'Create Jetpack', cat: 'Tech', brief: 'Джетпак на воздухе' },
  { name: 'Create Ore Excavation', cat: 'Tech', brief: 'Бурение и добыча руд механизмами Create' },
  { name: 'Create: Connected', cat: 'Tech', brief: 'Связи и удобства для длинных конвейеров' },

  { name: 'Better End', cat: 'World', brief: 'Полный редизайн Энда' },
  { name: 'Better Nether', cat: 'World', brief: 'Расширение и новые биомы в Нижнем мире' },
  { name: 'Deeper and Darker', cat: 'World', brief: 'Разнообразный скалк-контент, новое измерение и мобы' },
  { name: 'Asteroids!', cat: 'World', brief: 'Астероиды и обсерватории' },

  { name: 'Chipped', cat: 'Decoration', brief: 'Сотни новых вариаций ванильных блоков' },
  { name: 'Rechiseled', cat: 'Decoration', brief: 'Новые формы/текстуры ванильных блоков для отделки' },
  { name: "Macaw's Bridges", cat: 'Decoration', brief: 'Мосты' },
  { name: "Macaw's Doors", cat: 'Decoration', brief: 'Двери' },
  { name: "Macaw's Windows", cat: 'Decoration', brief: 'Окна' },
  { name: "Macaw's Fences and Walls", cat: 'Decoration', brief: 'Заборы и стены' },
  { name: "Macaw's Lights and Lamps", cat: 'Decoration', brief: 'Светильники' },
  { name: "Macaw's Paintings", cat: 'Decoration', brief: 'Картины' },
  { name: "Macaw's Stairs", cat: 'Decoration', brief: 'Лестницы' },
  { name: "Macaw's Trapdoors", cat: 'Decoration', brief: 'Люки' },
  { name: 'Supplementaries', cat: 'Decoration', brief: 'Функциональный декор и утиль' },
  { name: 'Supplementaries Squared', cat: 'Decoration', brief: 'Аддон к Supplementaries - ещё больше декора' },
  { name: 'Every Compat (Wood Good)', cat: 'Decoration', brief: 'Единые материалы/древесина между модами' },

  { name: 'Jade', cat: 'QoL', brief: 'HUD подсказок по блокам и сущностям' },
  { name: 'JourneyMap', cat: 'QoL', brief: 'Карта мира и мини-карта в реальном времени' },
  { name: 'Just Enough Items', cat: 'QoL', brief: 'Просмотр рецептов предметов и их использования' },
  { name: 'Patchouli', cat: 'QoL', brief: 'Система внутриигровых гайдов в виде книг' },
  { name: 'Shulker Box Tooltip', cat: 'QoL', brief: 'Удобный просмотр содержимого шалкеров' },
  { name: 'Inventory Profiles Next', cat: 'QoL', brief: 'Сортировка и шаблоны инвентаря' },
  { name: 'KleeSlabs', cat: 'QoL', brief: 'Поломка только той части двойной плиты, на которую вы смотрите' },
  { name: 'Chat Heads', cat: 'QoL', brief: 'Аватары игроков в чате' },
  { name: 'ArmorPoser', cat: 'QoL', brief: 'Точная настройка стоек брони' },
  { name: 'Dynamic Crosshair', cat: 'QoL', brief: 'Адаптивный прицел под предмет и цель' },
  { name: 'Model Gap Fix', cat: 'QoL', brief: 'Фикс «щелей» между частями моделей интструментов' },

  { name: 'Ambient Sounds', cat: 'QoL', brief: 'Расширенные фоновые звуки' },
  { name: 'ArchiSound', cat: 'QoL', brief: 'Кастомная музыка и радио' },
  { name: '3D Skin Layers', cat: 'QoL', brief: '3D объёмные скины' },
  { name: 'Emotecraft', cat: 'QoL', brief: 'Эмоции игрока' },
  { name: 'Female Gender Mod', cat: 'QoL', brief: 'Кастомизация женской модели игрока' },
  { name: 'Tiny Item Animations', cat: 'QoL', brief: 'Мелкие анимации в инвентаре' },

  { name: 'ImageToMap', cat: 'QoL', brief: 'Запись своих изображений на карту' },

  { name: 'Simple Voice Chat', cat: 'QoL', brief: 'Голосовой чат с группами' },
  { name: 'Voice Messages', cat: 'QoL', brief: 'Голосовые сообщения' },
  { name: 'Sinytra Connector', cat: 'QoL', brief: 'Запуск Fabric-модов на NeoForge' },

  { name: 'Sodium', cat: 'Optimization', brief: 'Оптимизация рендера клиента' },
  { name: 'Lithium', cat: 'Optimization', brief: 'Оптимизация серверной логики и физики' },
  { name: 'FerriteCore', cat: 'Optimization', brief: 'Экономия оперативной памяти' },
  { name: 'Entity Culling', cat: 'Optimization', brief: 'Отбраковка невидимых сущностей и блоков' },
  { name: 'Dynamic FPS', cat: 'Optimization', brief: 'Снижение фоновой нагрузки' },
  { name: 'Clumps', cat: 'Optimization', brief: 'Мелкие частицы опыта объединены в крупные: меньше лагов на фермах' },
  { name: 'Particle Core', cat: 'Optimization', brief: 'Оптимизация рендера частиц' },
  { name: "Reese's Sodium Options", cat: 'Optimization', brief: 'Удобные настройки Sodium' },
  { name: 'Sodium Leaf Culling', cat: 'Optimization', brief: 'Ускорение рендера листвы' },
  { name: 'Iris Shaders', cat: 'Optimization', brief: 'Шейдер-лоадер для Sodium' },
  { name: 'Iris & Oculus Flywheel Compat', cat: 'Optimization', brief: 'Улучшает производительность Create с включенными шейдерами' },
  { name: 'CreateBetterFps', cat: 'Optimization', brief: 'Повышает FPS в Create' },

  { name: "Farmer's Delight", cat: 'Food', brief: 'Базовая кулинария и готовка' },
  { name: "End's Delight", cat: 'Food', brief: 'Еда и ингредиенты Энда' },
  { name: 'Expanded Delight', cat: 'Food', brief: 'Новые культуры и предметы' },
  { name: 'More Delight (for Farmers Delight)', cat: 'Food', brief: 'Ещё больше еды!' }
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

export default function WikiPage() {
  useWallpaper();
  const isMobile = useIsMobile();

  const Section = (props: ComponentProps<typeof BaseSection>) => (
    <BaseSection {...props} disableMotion={isMobile} />
  );
  const LeftNav = (props: ComponentProps<typeof BaseLeftNav>) => (
    <BaseLeftNav {...props} disableMotion={isMobile} />
  );
  const RightToc = (props: ComponentProps<typeof BaseRightToc>) => (
    <BaseRightToc {...props} disableMotion={isMobile} />
  );

  return (
    <>
    <Seo {...routesMeta['/wiki']} />
    <motion.div
      className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100"
      variants={isMobile ? undefined : pageVariants}
      initial={isMobile ? false : 'hidden'}
      animate={isMobile ? false : 'show'}
    >
      <aside className="hidden md:block md:col-span-3">
        <LeftNav items={WIKI_SECTIONS} blurIntensity="xl" bgOpacity="60" />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">Вики сервера</h1>
        <Callout title="Как пользоваться вики">
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Переходите по разделам слева или используйте быстрый поиск по странице: <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
            <li>Список модов можно фильтровать по названию или категории.</li>
          </ul>
        </Callout>

        <Section id="intro" title="О сервере и тематика" n={1}>
          <p className="text-slate-300 ">
            Сервер состоит из <span className="text-sky-400">одного мира</span>. Тематикой является <span className="text-sky-400">техномагия с особым упором на строительство</span>. 
            Наша цель — создать комфортное и стабильное место для общения и взаимодействия. 
          </p>
          <p className="text-slate-300">
            Спавн расположен на острове, окружённым со всех сторон океаном. Атмосферно, не находите?
          </p>
        </Section>

        <Section id="start" title="Как начать играть" n={2}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>
              <Link to="/api/auth/register" className="text-sky-400 hover:text-sky-300 hover:underline">
                Зарегистрируйтесь
              </Link>{" "}
              или{" "}
              <Link to="/api/auth/login" className="text-sky-400 hover:text-sky-300 hover:underline">
                войдите
              </Link>{" "}
              на сайте.
            </li>
            <li>Получите проходку в {" "}
              <a href="https://telegram.me/@Archi_payment_bot" className="text-sky-400 hover:text-sky-300 hover:underline">
              телеграм-боте.
              </a>
            </li>
            <li>Скачайте лаунчер {" "}
              <a href="https://launcher.architech-mc.ru/download/launcher/latest" className="text-sky-400 hover:text-sky-300 hover:underline">
               отсюда
              </a>
              .
            </li>
            <li>Установите игру. Сервер автоматически появится в списке серверов сетевой игры.</li>
            <li> Начинайте играть! </li>
          </ol>
        </Section>

        <ModsSection disableMotion={isMobile} />

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

        <CommandsSection disableMotion={isMobile} />

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

        <FaqSection disableMotion={isMobile} />

        <Section id="links" title="Ссылки" n={9}>
          <ul className="list-disc pl-5 text-slate-300">
            <li><Link to="/rules" className="text-sky-300 hover:text-sky-200" > Правила сервера</Link></li>
            <li><Link to="/shop" className="text-sky-300 hover:text-sky-200" > Получение проходки</Link></li>
            <li><Link to="/privacy" className="text-sky-300 hover:text-sky-200" > Политика конфиденциальности</Link></li>
            <li><Link to="/terms" className="text-sky-300 hover:text-sky-200" > Пользовательское соглашение</Link></li>
          </ul>
        </Section>
      </main>

      <aside className="hidden md:block md:col-span-3">
        <RightToc items={WIKI_SECTIONS} blurIntensity="xl" bgOpacity="60" linkTransition />
      </aside>
    </motion.div>
    </>
  );
}

type SectionComponentProps = ComponentProps<typeof BaseSection>;

function ModsSection({ disableMotion }: { disableMotion: SectionComponentProps['disableMotion'] }) {
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
    <BaseSection id="mods" title="Список модов" n={3} disableMotion={disableMotion}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-300">Основные категории: Tech, Magic, QoL, World, Core.</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по модам…"
          className="w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-slate-500"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md backdrop-saturate-150">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-slate-300">
            <tr>
              <th className="px-3 py-2">Мод</th>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2">Краткое описание</th>
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
    </BaseSection>
  );
}

function CommandsSection({ disableMotion }: { disableMotion: SectionComponentProps['disableMotion'] }) {
  const server = CMDS.filter((c) => c.scope === 'server');
  const bot = CMDS.filter((c) => c.scope === 'bot');

  return (
    <BaseSection id="commands" title="Команды сервера и бота" n={5} disableMotion={disableMotion}>
      <div className="grid gap-4 md:grid-cols-2">
        <CmdTable title="Сервер" items={server} />
        <CmdTable title="Telegram-бот" items={bot} />
      </div>
    </BaseSection>
  );
}

function FaqSection({ disableMotion }: { disableMotion: SectionComponentProps['disableMotion'] }) {
  const qa = [
    { q: 'Как попасть на сервер?', a: 'Купить проходку в Telegram-боте, привязать ник, дождаться записи в whitelist.' },
    { q: 'Список модов фиксированный?', a: 'Да. Клиентские QoL-моды без преимущества допустимы, если не нарушают античит.' },
    { q: 'Разрешён PVP?', a: 'По взаимному согласию или в специальных зонах/ивентах.' },
    { q: 'Можно переносить базу?', a: 'Да. Предупредите соседей и снимите клеймы перед переездом.' },
  ];
  return (
    <BaseSection id="faq" title="FAQ" n={8} disableMotion={disableMotion}>
      <div className="space-y-3">
        {qa.map((x) => (
          <div key={x.q} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md backdrop-saturate-150">
            <div className="font-semibold">{x.q}</div>
            <div className="mt-1 text-sm text-slate-300">{x.a}</div>
          </div>
        ))}
      </div>
    </BaseSection>
  );
}

function CmdTable({ title, items }: { title: string; items: Cmd[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
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