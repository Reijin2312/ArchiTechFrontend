export type DocumentArea = 'rules' | 'wiki';

export type DocumentNavItem = {
  id: string;
  area: DocumentArea;
  n: number;
  ru: string;
  en: string;
};

export const RULES_DOCUMENT_SECTIONS: DocumentNavItem[] = [
  { id: 'intro', area: 'rules', n: 1, ru: 'Введение', en: 'Introduction' },
  { id: 'forbidden', area: 'rules', n: 2, ru: 'Запрещено', en: 'Forbidden actions' },
  { id: 'chat', area: 'rules', n: 3, ru: 'Общение', en: 'Communication' },
  { id: 'techmagic', area: 'rules', n: 4, ru: 'Модификации и ресурс-паки', en: 'Mods and resource packs' },
  { id: 'build', area: 'rules', n: 5, ru: 'Строительство', en: 'Building' },
  { id: 'farms', area: 'rules', n: 6, ru: 'Фермы и механизмы', en: 'Farms and machinery' },
  { id: 'pvp', area: 'rules', n: 7, ru: 'PVP / PVE', en: 'PVP / PVE' },
  { id: 'trade', area: 'rules', n: 8, ru: 'Экономика и торговля', en: 'Economy and trading' },
  { id: 'security', area: 'rules', n: 9, ru: 'Безопасность и аккаунты', en: 'Security and accounts' },
  { id: 'penalties', area: 'rules', n: 10, ru: 'Наказания', en: 'Penalties' },
];

export const WIKI_DOCUMENT_SECTIONS: DocumentNavItem[] = [
  { id: 'intro', area: 'wiki', n: 1, ru: 'О сервере и тематика', en: 'Server and theme' },
  { id: 'start', area: 'wiki', n: 2, ru: 'Как начать играть', en: 'How to start playing' },
  { id: 'mods', area: 'wiki', n: 3, ru: 'Список модов', en: 'Mod list' },
  { id: 'progress', area: 'wiki', n: 4, ru: 'Рекомендуемый маршрут', en: 'Recommended progression' },
  { id: 'commands', area: 'wiki', n: 5, ru: 'Команды сервера', en: 'Server commands' },
  { id: 'economy', area: 'wiki', n: 6, ru: 'Экономика', en: 'Economy' },
  { id: 'perf', area: 'wiki', n: 7, ru: 'Производительность', en: 'Performance' },
  { id: 'help', area: 'wiki', n: 8, ru: 'Если что-то не работает', en: 'Troubleshooting' },
  { id: 'faq', area: 'wiki', n: 9, ru: 'Частые вопросы', en: 'FAQ' },
  { id: 'links', area: 'wiki', n: 10, ru: 'Ссылки', en: 'Links' },
];

export const DOCUMENT_GROUPS = [
  { area: 'rules' as const, ru: 'Правила', en: 'Rules', items: RULES_DOCUMENT_SECTIONS },
  { area: 'wiki' as const, ru: 'Вики', en: 'Wiki', items: WIKI_DOCUMENT_SECTIONS },
];

export function documentPath(item: Pick<DocumentNavItem, 'area' | 'id'>) {
  const base = `/${item.area}`;
  return item.id === 'intro' ? base : `${base}/${item.id}`;
}

export function documentItem(area: DocumentArea, id?: string) {
  const items = area === 'rules' ? RULES_DOCUMENT_SECTIONS : WIKI_DOCUMENT_SECTIONS;
  return items.find((item) => item.id === (id || 'intro'));
}
