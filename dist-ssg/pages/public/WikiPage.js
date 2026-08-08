import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { motion } from 'framer-motion';
import { LeftNav as BaseLeftNav, RightToc as BaseRightToc, Section as BaseSection, Kbd, Callout, pageVariants } from '../../shared/ui/layout/PageSidebar.js';
import { useIsMobile } from '../../shared/ui/utils/useIsMobile.js';
import { ModCatalogSection } from '../../pages/public/wiki/ModCatalogSection.js';
import { useI18n } from '../../shared/i18n/I18nProvider.js';
import { LAUNCHER_DOWNLOAD_URL } from '../../shared/constants.js';
export const WIKI_SECTIONS = [
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
export const LEGACY_MODS = [
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
const CMDS = [
    { cmd: '/spawn', descKey: 'wiki.cmdSpawn' },
    { cmd: '/home, /sethome, /delhome', descKey: 'wiki.cmdHome' },
    { cmd: '/msg <nickname> <text>', descKey: 'wiki.cmdMessage' },
    { cmd: '/rtp', descKey: 'wiki.cmdRtp' },
    { cmd: '/claim, /map', descKey: 'wiki.cmdClaim' },
];
export default function WikiPage() {
    useWallpaper();
    const isMobile = useIsMobile();
    const { t } = useI18n();
    const sections = useMemo(() => WIKI_SECTIONS.map((item) => ({ ...item, title: wikiSectionTitle(item.id, t) })), [t]);
    const Section = (props) => (_jsx(BaseSection, { ...props, disableMotion: isMobile }));
    const LeftNav = (props) => (_jsx(BaseLeftNav, { ...props, disableMotion: isMobile }));
    const RightToc = (props) => (_jsx(BaseRightToc, { ...props, disableMotion: isMobile }));
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/wiki'] }), _jsxs(motion.div, { className: "mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100", variants: isMobile ? undefined : pageVariants, initial: isMobile ? false : 'hidden', animate: isMobile ? false : 'show', children: [_jsx("aside", { className: "hidden md:block md:col-span-3", children: _jsx(LeftNav, { items: sections, blurIntensity: "xl", bgOpacity: "60" }) }), _jsxs("main", { className: "col-span-12 md:col-span-6", children: [_jsx("h1", { className: "mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center", children: t('wiki.title') }), _jsx(Callout, { title: t('wiki.howToUse'), children: _jsxs("ul", { className: "text-sm text-slate-300 space-y-1", children: [_jsxs("li", { children: [t('wiki.howToUseNavigation'), " ", _jsx(Kbd, { children: "Ctrl" }), " + ", _jsx(Kbd, { children: "F" }), " (Windows / Linux), ", _jsx(Kbd, { children: "Cmd" }), " + ", _jsx(Kbd, { children: "F" }), " (macOS)."] }), _jsx("li", { children: t('wiki.howToUseMods') })] }) }), _jsxs(Section, { id: "intro", title: t('wiki.sectionIntro'), n: 1, children: [_jsxs("p", { className: "text-slate-300 ", children: [t('wiki.introFirstBefore'), " ", _jsx("span", { className: "text-sky-400", children: t('wiki.introOneWorld') }), ". ", t('wiki.introThemeBefore'), " ", _jsx("span", { className: "text-sky-400", children: t('wiki.introTheme') }), ". ", t('wiki.introGoal')] }), _jsx("p", { className: "text-slate-300", children: t('wiki.introSpawn') })] }), _jsxs(Section, { id: "start", title: t('wiki.sectionStart'), n: 2, children: [_jsx("p", { className: "mb-3 text-slate-300", children: t('wiki.startIntro') }), _jsxs("ol", { className: "list-decimal pl-6 space-y-2 text-slate-300", children: [_jsxs("li", { children: [_jsx(Link, { to: "/auth/register", className: "text-sky-400 hover:text-sky-300 hover:underline", children: t('start.step1Link') }), "."] }), _jsxs("li", { children: [_jsx("a", { href: LAUNCHER_DOWNLOAD_URL, className: "text-sky-400 hover:text-sky-300 hover:underline", children: t('start.step2Link') }), " ", t('start.step2Tail')] }), _jsx("li", { children: t('start.step3') }), _jsx("li", { children: t('start.step4') })] })] }), _jsx(ModCatalogSection, { disableMotion: isMobile }), _jsx(Section, { id: "progress", title: t('wiki.sectionProgress'), n: 4, children: _jsxs("ul", { className: "space-y-3 text-slate-300", children: [_jsxs("li", { children: [_jsx("b", { children: t('wiki.progress1Title') }), " ", t('wiki.progress1')] }), _jsxs("li", { children: [_jsx("b", { children: t('wiki.progress2Title') }), " ", t('wiki.progress2')] }), _jsxs("li", { children: [_jsx("b", { children: t('wiki.progress3Title') }), " ", t('wiki.progress3')] }), _jsxs("li", { children: [_jsx("b", { children: t('wiki.progress4Title') }), " ", t('wiki.progress4')] }), _jsxs("li", { children: [_jsx("b", { children: t('wiki.progress5Title') }), " ", t('wiki.progress5')] })] }) }), _jsx(CommandsSection, { disableMotion: isMobile }), _jsx(Section, { id: "economy", title: t('wiki.sectionEconomy'), n: 6, children: _jsxs("ul", { className: "list-disc pl-5 space-y-1 text-slate-300", children: [_jsx("li", { children: t('wiki.economy1') }), _jsx("li", { children: t('wiki.economy2') })] }) }), _jsx(Section, { id: "perf", title: t('wiki.sectionPerformance'), n: 7, children: _jsxs("ul", { className: "list-disc pl-5 space-y-1 text-slate-300", children: [_jsx("li", { children: t('wiki.performance1') }), _jsx("li", { children: t('wiki.performance2') }), _jsx("li", { children: t('wiki.performance3') })] }) }), _jsx(FaqSection, { disableMotion: isMobile }), _jsx(Section, { id: "links", title: t('wiki.sectionLinks'), n: 9, children: _jsxs("ul", { className: "list-disc pl-5 text-slate-300", children: [_jsx("li", { children: _jsx(Link, { to: "/rules", className: "text-sky-300 hover:text-sky-200", children: t('wiki.rulesLink') }) }), _jsx("li", { children: _jsx(Link, { to: "/start", className: "text-sky-300 hover:text-sky-200", children: t('wiki.startLink') }) }), _jsx("li", { children: _jsx(Link, { to: "/privacy", className: "text-sky-300 hover:text-sky-200", children: t('footer.privacy') }) }), _jsx("li", { children: _jsx(Link, { to: "/terms", className: "text-sky-300 hover:text-sky-200", children: t('footer.terms') }) })] }) })] }), _jsx("aside", { className: "hidden md:block md:col-span-3", children: _jsx(RightToc, { items: sections, blurIntensity: "xl", bgOpacity: "60", linkTransition: true }) })] })] }));
}
function CommandsSection({ disableMotion }) {
    const { t } = useI18n();
    return (_jsx(BaseSection, { id: "commands", title: t('wiki.sectionCommands'), n: 5, disableMotion: disableMotion, children: _jsx("div", { className: "grid gap-4", children: _jsx(CmdTable, { title: t('wiki.server'), items: CMDS }) }) }));
}
function FaqSection({ disableMotion }) {
    const { t } = useI18n();
    const qa = [
        { q: t('wiki.faqJoinQ'), a: t('wiki.faqJoinA') },
        { q: t('wiki.faqModsQ'), a: t('wiki.faqModsA') },
        { q: t('wiki.faqPvpQ'), a: t('wiki.faqPvpA') },
        { q: t('wiki.faqMoveQ'), a: t('wiki.faqMoveA') },
    ];
    return (_jsx(BaseSection, { id: "faq", title: t('wiki.faqTitle'), n: 8, disableMotion: disableMotion, children: _jsx("div", { className: "space-y-3", children: qa.map((x) => (_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "font-semibold", children: x.q }), _jsx("div", { className: "mt-1 text-sm text-slate-300", children: x.a })] }, x.q))) }) }));
}
function CmdTable({ title, items }) {
    const { t } = useI18n();
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "mb-2 text-sm font-semibold text-sky-300", children: title }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-slate-900/70 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: t('wiki.command') }), _jsx("th", { className: "px-3 py-2", children: t('wiki.description') })] }) }), _jsx("tbody", { children: items.map((c) => (_jsxs("tr", { className: "border-t border-slate-800", children: [_jsx("td", { className: "px-3 py-2 text-sky-300", children: c.cmd }), _jsx("td", { className: "px-3 py-2 text-slate-300", children: t(c.descKey) })] }, c.cmd))) })] }) })] }));
}
function wikiSectionTitle(id, t) {
    const keys = {
        intro: 'wiki.sectionIntro',
        start: 'wiki.sectionStart',
        mods: 'wiki.sectionMods',
        progress: 'wiki.sectionProgress',
        commands: 'wiki.sectionCommands',
        economy: 'wiki.sectionEconomy',
        perf: 'wiki.sectionPerformance',
        faq: 'wiki.faqTitle',
        links: 'wiki.sectionLinks',
    };
    return t(keys[id] ?? 'wiki.title');
}
