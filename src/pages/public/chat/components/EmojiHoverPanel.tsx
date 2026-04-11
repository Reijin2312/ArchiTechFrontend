import { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from '../icons';

type EmojiHoverPanelProps = {
  open: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSelectEmoji: (emoji: string) => void;
};

type CategoryId =
  | 'recent'
  | 'smileys'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

type CategoryConfig = {
  id: CategoryId;
  label: string;
  icon: string;
  keywords: string[];
  emojis: string[];
};

const RECENT_STORAGE_KEY = 'chat_emoji_recent_v1';

const DEFAULT_RECENT = [
  '❤️', '😂', '🥰', '👍', '🔥', '😭', '👏', '😁', '🤔', '🤝',
  '😎', '🙏', '🥳', '😅', '🤯', '✨', '😘', '😴', '🤝', '👀',
];

const STATIC_CATEGORIES: CategoryConfig[] = [
  {
    id: 'smileys',
    label: 'Смайлы и люди',
    icon: '😀',
    keywords: ['smile', 'face', 'people', 'human', 'улыбка', 'люди'],
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍',
      '🥰', '😘', '😎', '🤩', '🥳', '🤗', '🤔', '🫡', '😴', '😬', '😢', '😭',
      '😡', '😱', '🤯', '🤐', '🤥', '😇', '🙃', '😋', '😜', '🤪', '🤓', '🧐',
      '😤', '😮', '😯', '😲', '🫣', '🫢', '🫠', '👋', '🤚', '🖐️', '👌', '✌️',
      '🤞', '🤟', '🤘', '👍', '👎', '👏', '🙌', '🙏', '💪', '🫶', '🤝', '👀',
    ],
  },
  {
    id: 'animals',
    label: 'Животные и природа',
    icon: '🐻',
    keywords: ['animals', 'nature', 'pet', 'животные', 'природа'],
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪲', '🦋', '🐌', '🐞', '🐢', '🐍',
      '🦎', '🦂', '🦖', '🦕', '🐙', '🦀', '🐠', '🐬', '🐳', '🦈', '🐊', '🐅',
      '🌵', '🌲', '🌳', '🌴', '🪵', '🌷', '🌹', '🌺', '🌻', '🌼', '🍀', '🌿',
    ],
  },
  {
    id: 'food',
    label: 'Еда и напитки',
    icon: '🍔',
    keywords: ['food', 'drink', 'еда', 'напитки'],
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🫑', '🥒',
      '🍄', '🥐', '🍞', '🥖', '🥨', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟',
      '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🍜', '🍝', '🍣', '🍤', '🍱', '🥟',
      '🍦', '🍨', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '☕', '🍵', '🥤',
    ],
  },
  {
    id: 'activities',
    label: 'Активности',
    icon: '⚽',
    keywords: ['activity', 'sport', 'game', 'активности', 'спорт'],
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🎽', '⛸️', '🥌', '🎿', '🛷',
      '🎯', '🪁', '🎮', '🕹️', '🎲', '♟️', '🎳', '🎰', '🧩', '🎨', '🎭', '🎤',
      '🎧', '🎼', '🎸', '🎹', '🥁', '🎺', '🎷', '🎻', '💃', '🕺', '🎉', '🎊',
      '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '📸', '🎬', '🧠', '🧗', '🏊',
    ],
  },
  {
    id: 'travel',
    label: 'Путешествия и места',
    icon: '🚗',
    keywords: ['travel', 'places', 'transport', 'путешествия', 'места'],
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚚', '🚛', '🚜',
      '🛵', '🏍️', '🚲', '🛴', '🚨', '🚦', '🛣️', '🛤️', '⛽', '🛫', '✈️', '🛬',
      '🚀', '🛰️', '🚁', '⛵', '🚤', '🛳️', '⚓', '🚧', '🏠', '🏡', '🏢', '🏣',
      '🏥', '🏦', '🏪', '🏫', '🏬', '🏭', '🗼', '🗽', '⛪', '🕌', '🛕', '🏰',
      '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '🎡', '🎢', '🗺️', '🏝️',
    ],
  },
  {
    id: 'objects',
    label: 'Объекты',
    icon: '💡',
    keywords: ['objects', 'tools', 'tech', 'объекты'],
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📹', '🎥', '📞', '☎️',
      '📺', '📻', '🧭', '⏱️', '⏰', '💡', '🔦', '🕯️', '🧯', '🪫', '🔋', '🔌',
      '🧲', '🧪', '🧬', '💊', '🩹', '🩺', '🧰', '🪛', '🔧', '🔨', '🪓', '⚙️',
      '🔒', '🔑', '🗝️', '🧷', '📎', '📌', '✂️', '📝', '📚', '📖', '🗂️', '📁',
      '💰', '💎', '📦', '🧸', '🪀', '🕶️', '👓', '👔', '👕', '🧥', '👟', '🎒',
    ],
  },
  {
    id: 'symbols',
    label: 'Символы',
    icon: '❤️‍🔥',
    keywords: ['symbols', 'signs', 'символы'],
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❣️',
      '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '☸️',
      '✡️', '🔯', '🕉️', '☯️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏',
      '♐', '♑', '♒', '♓', '✅', '☑️', '✔️', '❌', '⭕', '➕', '➖', '➗',
      '♻️', '⚠️', '🚫', '❗', '❓', '‼️', '⁉️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣',
    ],
  },
  {
    id: 'flags',
    label: 'Флаги',
    icon: '🏁',
    keywords: ['flags', 'country', 'флаги', 'страны'],
    emojis: [
      '🏁', '🚩', '🏳️', '🏴', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇷🇺', '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷',
      '🇮🇹', '🇪🇸', '🇵🇹', '🇳🇱', '🇧🇪', '🇸🇪', '🇳🇴', '🇫🇮', '🇵🇱', '🇨🇿', '🇺🇦', '🇧🇾',
      '🇰🇿', '🇨🇳', '🇯🇵', '🇰🇷', '🇮🇳', '🇹🇷', '🇦🇪', '🇮🇱', '🇸🇦', '🇪🇬', '🇿🇦', '🇦🇷',
      '🇧🇷', '🇨🇦', '🇲🇽', '🇦🇺', '🇳🇿', '🇮🇩', '🇹🇭', '🇻🇳', '🇲🇾', '🇸🇬', '🇵🇭', '🇨🇭',
      '🇦🇹', '🇩🇰', '🇮🇪', '🇬🇷', '🇭🇺', '🇷🇴', '🇧🇬', '🇷🇸', '🇭🇷', '🇸🇰', '🇸🇮', '🇪🇪',
    ],
  },
];

const readRecentEmojis = () => {
  if (typeof window === 'undefined') return DEFAULT_RECENT;
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_RECENT;
    const cleaned = parsed.filter((item) => typeof item === 'string').slice(0, 24);
    return cleaned.length > 0 ? cleaned : DEFAULT_RECENT;
  } catch {
    return DEFAULT_RECENT;
  }
};

export function EmojiHoverPanel({
  open,
  onMouseEnter,
  onMouseLeave,
  onSelectEmoji,
}: EmojiHoverPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('recent');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(readRecentEmojis);

  const categories = useMemo<CategoryConfig[]>(
    () => [
      {
        id: 'recent',
        label: 'Недавние',
        icon: '🕘',
        keywords: ['recent', 'history', 'недавние', 'часто'],
        emojis: recentEmojis.length > 0 ? recentEmojis : DEFAULT_RECENT,
      },
      ...STATIC_CATEGORIES,
    ],
    [recentEmojis]
  );

  const activeCategoryConfig = useMemo(
    () => categories.find((category) => category.id === activeCategory) ?? categories[0],
    [activeCategory, categories]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const displayedEmojis = useMemo(() => {
    if (!normalizedSearch) return activeCategoryConfig.emojis;

    const matchingCategories = categories.filter(
      (category) =>
        category.label.toLowerCase().includes(normalizedSearch) ||
        category.keywords.some((keyword) => keyword.includes(normalizedSearch))
    );

    const source = matchingCategories.length > 0 ? matchingCategories : categories;
    const merged: string[] = [];
    source.forEach((category) => {
      category.emojis.forEach((emoji) => {
        if (!merged.includes(emoji)) merged.push(emoji);
      });
    });
    return merged.slice(0, 240);
  }, [activeCategoryConfig.emojis, categories, normalizedSearch]);

  const sectionTitle = normalizedSearch ? 'Результаты поиска' : activeCategoryConfig.label;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentEmojis.slice(0, 24)));
  }, [recentEmojis]);

  const handleSelectEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    setRecentEmojis((prev) => [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 24));
  };

  if (!open) return null;

  return (
    <div
      className="absolute bottom-[calc(100%+12px)] left-0 z-[95] w-[min(92vw,660px)] overflow-hidden rounded-[20px] bg-[#162437]/98 shadow-[0_26px_64px_rgba(0,0,0,.58)] ring-1 ring-[#8e77ef]/22"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="grid grid-cols-3 border-b border-black/30 px-4 pt-3 text-white/58"
        style={{ fontSize: '18px' }}
      >
        <button type="button" className="relative pb-2 text-left text-[#6fb8ff]">
          Эмодзи
          <span className="absolute bottom-0 left-0 h-[3px] w-[110px] rounded-full bg-[#6fb8ff]" />
        </button>
        <button type="button" className="pb-2 text-center text-white/55">
          Стикеры
        </button>
        <button type="button" className="pb-2 text-right text-white/55">
          GIF
        </button>
      </div>

      <div className="px-2.5 pb-2 pt-2">
        <div className="flex items-center gap-3 rounded-full bg-[#25364c]/92 px-3 py-2 text-white/45">
          <SearchIcon size={22} strokeWidth={2.2} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск"
            className="h-7 flex-1 bg-transparent text-[15px] text-white/80 placeholder:text-white/45 focus:outline-none"
          />
        </div>
      </div>

      <div className="tg-scroll max-h-[430px] overflow-y-auto px-2.5 pb-3">
        <div className="mb-1 mt-1 flex items-center justify-between px-1 text-[16px] text-white/55">
          <span>{sectionTitle}</span>
          {!normalizedSearch ? <span className="text-[20px] text-white/40">⚙</span> : null}
        </div>

        {displayedEmojis.length > 0 ? (
          <div className="grid grid-cols-9 gap-y-1">
            {displayedEmojis.map((emoji, index) => (
              <button
                key={`emoji-cell-${activeCategory}-${index}-${emoji}`}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className="grid h-10 w-full place-items-center rounded-[10px] text-[31px] transition-colors hover:bg-white/8"
                title={emoji}
              >
                <span>{emoji}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[15px] text-white/45">
            Ничего не найдено
          </div>
        )}
      </div>

      <div className="border-t border-black/35 bg-[#152235] px-2 py-1.5">
        <div className="tg-scroll flex items-center gap-1 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={`emoji-category-${category.id}`}
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(category.id);
              }}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[24px] transition-colors ${
                category.id === activeCategory
                  ? 'bg-[#8e77ef]/25 ring-1 ring-[#8e77ef]/45'
                  : 'hover:bg-white/10'
              }`}
              title={category.label}
            >
              <span>{category.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
