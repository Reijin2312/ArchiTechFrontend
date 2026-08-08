import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from '../icons.js';
const RECENT_STORAGE_KEY = 'chat_emoji_recent_v1';
const DEFAULT_RECENT = [
    '❤️', '😂', '🥰', '👍', '🔥', '😭', '👏', '😁', '🤔', '🤝',
    '😎', '🙏', '🥳', '😅', '🤯', '✨', '😘', '😴', '🤝', '👀',
];
const STATIC_CATEGORIES = [
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
    if (typeof window === 'undefined')
        return DEFAULT_RECENT;
    try {
        const raw = localStorage.getItem(RECENT_STORAGE_KEY);
        if (!raw)
            return DEFAULT_RECENT;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return DEFAULT_RECENT;
        const cleaned = parsed.filter((item) => typeof item === 'string').slice(0, 24);
        return cleaned.length > 0 ? cleaned : DEFAULT_RECENT;
    }
    catch {
        return DEFAULT_RECENT;
    }
};
export function EmojiHoverPanel({ open, onMouseEnter, onMouseLeave, onSelectEmoji, }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('recent');
    const [recentEmojis, setRecentEmojis] = useState(readRecentEmojis);
    const categories = useMemo(() => [
        {
            id: 'recent',
            label: 'Недавние',
            icon: '🕘',
            keywords: ['recent', 'history', 'недавние', 'часто'],
            emojis: recentEmojis.length > 0 ? recentEmojis : DEFAULT_RECENT,
        },
        ...STATIC_CATEGORIES,
    ], [recentEmojis]);
    const activeCategoryConfig = useMemo(() => categories.find((category) => category.id === activeCategory) ?? categories[0], [activeCategory, categories]);
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const displayedEmojis = useMemo(() => {
        if (!normalizedSearch)
            return activeCategoryConfig.emojis;
        const matchingCategories = categories.filter((category) => category.label.toLowerCase().includes(normalizedSearch) ||
            category.keywords.some((keyword) => keyword.includes(normalizedSearch)));
        const source = matchingCategories.length > 0 ? matchingCategories : categories;
        const merged = [];
        source.forEach((category) => {
            category.emojis.forEach((emoji) => {
                if (!merged.includes(emoji))
                    merged.push(emoji);
            });
        });
        return merged.slice(0, 240);
    }, [activeCategoryConfig.emojis, categories, normalizedSearch]);
    const sectionTitle = normalizedSearch ? 'Результаты поиска' : activeCategoryConfig.label;
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentEmojis.slice(0, 24)));
    }, [recentEmojis]);
    const handleSelectEmoji = (emoji) => {
        onSelectEmoji(emoji);
        setRecentEmojis((prev) => [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 24));
    };
    if (!open)
        return null;
    return (_jsxs("div", { className: "absolute bottom-[calc(100%+12px)] left-0 z-[95] w-[min(92vw,660px)] overflow-hidden rounded-[20px] bg-[#162437]/98 shadow-[0_26px_64px_rgba(0,0,0,.58)] ring-1 ring-[#8e77ef]/22", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, children: [_jsxs("div", { className: "grid grid-cols-3 border-b border-black/30 px-4 pt-3 text-white/58", style: { fontSize: '18px' }, children: [_jsxs("button", { type: "button", className: "relative pb-2 text-left text-[#6fb8ff]", children: ["\u042D\u043C\u043E\u0434\u0437\u0438", _jsx("span", { className: "absolute bottom-0 left-0 h-[3px] w-[110px] rounded-full bg-[#6fb8ff]" })] }), _jsx("button", { type: "button", className: "pb-2 text-center text-white/55", children: "\u0421\u0442\u0438\u043A\u0435\u0440\u044B" }), _jsx("button", { type: "button", className: "pb-2 text-right text-white/55", children: "GIF" })] }), _jsx("div", { className: "px-2.5 pb-2 pt-2", children: _jsxs("div", { className: "flex items-center gap-3 rounded-full bg-[#25364c]/92 px-3 py-2 text-white/45", children: [_jsx(SearchIcon, { size: 22, strokeWidth: 2.2 }), _jsx("input", { value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A", className: "h-7 flex-1 bg-transparent text-[15px] text-white/80 placeholder:text-white/45 focus:outline-none" })] }) }), _jsxs("div", { className: "tg-scroll max-h-[430px] overflow-y-auto px-2.5 pb-3", children: [_jsxs("div", { className: "mb-1 mt-1 flex items-center justify-between px-1 text-[16px] text-white/55", children: [_jsx("span", { children: sectionTitle }), !normalizedSearch ? _jsx("span", { className: "text-[20px] text-white/40", children: "\u2699" }) : null] }), displayedEmojis.length > 0 ? (_jsx("div", { className: "grid grid-cols-9 gap-y-1", children: displayedEmojis.map((emoji, index) => (_jsx("button", { type: "button", onClick: () => handleSelectEmoji(emoji), className: "grid h-10 w-full place-items-center rounded-[10px] text-[31px] transition-colors hover:bg-white/8", title: emoji, children: _jsx("span", { children: emoji }) }, `emoji-cell-${activeCategory}-${index}-${emoji}`))) })) : (_jsx("div", { className: "py-8 text-center text-[15px] text-white/45", children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }))] }), _jsx("div", { className: "border-t border-black/35 bg-[#152235] px-2 py-1.5", children: _jsx("div", { className: "tg-scroll flex items-center gap-1 overflow-x-auto", children: categories.map((category) => (_jsx("button", { type: "button", onClick: () => {
                            setSearchQuery('');
                            setActiveCategory(category.id);
                        }, className: `grid h-10 w-10 shrink-0 place-items-center rounded-full text-[24px] transition-colors ${category.id === activeCategory
                            ? 'bg-[#8e77ef]/25 ring-1 ring-[#8e77ef]/45'
                            : 'hover:bg-white/10'}`, title: category.label, children: _jsx("span", { children: category.icon }) }, `emoji-category-${category.id}`))) }) })] }));
}
