import { DISCORD_URL, TELEGRAM_URL, SERVER_IP } from '@/shared/constants';

export const ORIGIN = 'https://architech-mc.ru';

const breadcrumb = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((it, i) => ({
    "@type": "ListItem", "position": i + 1, "name": it.name, "item": it.url
  }))
});

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ArchiTech MC",
  "url": ORIGIN,
  "logo": ORIGIN + "/images/favicon-192.png",
  "sameAs": [DISCORD_URL, TELEGRAM_URL, "https://launcher.architech-mc.ru", "https://architech-mc.online"]
};

const jsonLdSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ArchiTech MC",
  "url": ORIGIN,
  "potentialAction": {
    "@type": "SearchAction",
    "target": ORIGIN + "/wiki?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const OG = `${ORIGIN}/og/home.jpg`;
const SUPPORT_EMAIL = 'hello@architech-mc.ru';

const BASE_KEYWORDS = [
  'ArchiTech MC',
  'ArchiTech',
  'Archi Tech MC',
  'Architech MC',
  'minecraft сервер',
  'сервер майнкрафт',
  'техномагия',
  'техно-магический сервер',
  'магия и индустрия',
  'модовый сервер',
  'industrial и magic',
  'modded minecraft',
  'майнкрафт техномагия',
  'моды майнкрафт сервер',
  'minecraft tech magic'
];

export const routesMeta: Record<string, any> = {
  '/': {
    title: 'ArchiTech MC - техно-магический Minecraft сервер (магия + индустриальные моды)',
    description: `ArchiTech MC (Арчи Тек) - модовый Minecraft сервер с техномагией: магические и индустриальные моды, кланы, экономика и выживание. IP: ${SERVER_IP}.`,
    keywords: [...BASE_KEYWORDS, 'IP ArchiTech MC', 'техномагия майнкрафт сервер', 'ArchiTech MC IP', 'майнкрафт техно-магия', 'арчи тек майнкрафт'],
    canonical: `${ORIGIN}/`,
    og: { url: ORIGIN + "/", type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      jsonLdOrg,
      jsonLdSite,
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Как зайти на техно-магический сервер ArchiTech MC (Арчи Тек)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Откройте Minecraft, добавьте IP ${SERVER_IP} в список серверов и подключитесь. Это модовый техно-магический сервер: магия + индустриальные моды.`
            }
          },
          {
            "@type": "Question",
            "name": "Какие моды и режимы есть на ArchiTech MC?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Техно-магия: сочетание магических и индустриальных модов, экономика, кланы, ивенты и дружеское выживание."
            }
          }
        ]
      }
    ]
  },
  "/wiki": {
    title: "Wiki ArchiTech MC - гайды по техномагии и индустриальным модам Minecraft",
    description: "Вики ArchiTech MC: гайды по модам, крафтам, магии и индустрии, квесты, правила и сборки техно-магического режима.",
    keywords: [...BASE_KEYWORDS, 'вики майнкрафт техномагия', 'гайд техно-магия', 'wiki architech mc', 'руководство модовый сервер'],
    canonical: `${ORIGIN}/wiki`,
    og: { url: `${ORIGIN}/wiki`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Wiki", url: ORIGIN + "/wiki" }]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Wiki ArchiTech",
        "author": { "@type": "Organization", "name": "ArchiTech MC" },
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/wiki`
      }
    ]
  },
  "/about": {
    title: "О сервере ArchiTech MC - техномагия, индустриал и кланы",
    description: "Что такое ArchiTech MC: техно-магический модовый Minecraft сервер, магические и индустриальные моды, экономика, ивенты, дружное комьюнити.",
    keywords: [...BASE_KEYWORDS, 'о сервере майнкрафт техномагия', 'architech mc описание', 'арчи тек сервер'],
    canonical: `${ORIGIN}/about`,
    og: { url: `${ORIGIN}/about`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "О сервере", url: ORIGIN + "/about" }]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "О сервере ArchiTech MC",
        "author": { "@type": "Organization", "name": "ArchiTech MC" },
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/about`,
        "description": "Техно-магический Minecraft сервер с магическими и индустриальными модами, экономикой и социальными активностями."
      }
    ]
  },
  "/rules": {
    title: "Правила Minecraft сервера ArchiTech MC - техномагия",
    description: "Правила игры и модового выживания на техно-магическом сервере ArchiTech MC: честная игра, экономика, кланы и магические/индустриальные моды.",
    keywords: [...BASE_KEYWORDS, 'правила minecraft сервера', 'правила техно магия', 'правила модовый сервер'],
    canonical: `${ORIGIN}/rules`,
    og: { url: `${ORIGIN}/rules`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Правила", url: ORIGIN + "/rules" }]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Правила ArchiTech MC",
        "author": { "@type": "Organization", "name": "ArchiTech MC" },
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/rules`
      }
    ]
  },
  "/shop": {
    title: "Как начать играть на ArchiTech MC",
    description: "Бесплатный вход на ArchiTech MC: регистрация, лаунчер и автоматическое подключение к серверу.",
    keywords: [...BASE_KEYWORDS, 'как начать играть minecraft', 'лаунчер ArchiTech MC', 'сборка ArchiTech MC'],
    canonical: `${ORIGIN}/shop`,
    og: { url: `${ORIGIN}/shop`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Как начать играть", url: ORIGIN + "/shop" }]),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Как начать играть на ArchiTech MC",
        "brand": "ArchiTech MC",
        "url": `${ORIGIN}/shop`,
        "image": OG
      }
    ]
  },
  "/contacts": {
    title: "Контакты ArchiTech MC - поддержка, Discord и Telegram",
    description: "Связаться с администрацией ArchiTech MC: поддержка, Discord, Telegram, email. Любые вопросы по техно-магическому модовому серверу и оплате.",
    keywords: [...BASE_KEYWORDS, 'контакты minecraft сервер', 'discord minecraft сервер', 'telegram architech mc', 'поддержка архи тек'],
    canonical: `${ORIGIN}/contacts`,
    og: { url: `${ORIGIN}/contacts`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Контакты", url: `${ORIGIN}/contacts` }]),
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Контакты ArchiTech MC",
        "url": `${ORIGIN}/contacts`,
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": SUPPORT_EMAIL,
            "availableLanguage": ["Russian"]
          }
        ],
        "sameAs": [DISCORD_URL, TELEGRAM_URL]
      }
    ]
  },
  "/map": {
    title: "Онлайн-карта ArchiTech MC",
    description: "Интерактивная онлайн-карта мира ArchiTech MC.",
    keywords: [...BASE_KEYWORDS, 'онлайн карта minecraft', 'карта ArchiTech MC'],
    canonical: `${ORIGIN}/map`,
    og: { url: `${ORIGIN}/map`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Карта", url: `${ORIGIN}/map` }]),
    ]
  },
  "/terms": {
    title: "Пользовательское соглашение ArchiTech MC",
    description: "Пользовательское соглашение Minecraft сервера ArchiTech MC.",
    keywords: ['ArchiTech MC', 'пользовательское соглашение', 'terms of service'],
    canonical: `${ORIGIN}/terms`,
    og: { url: `${ORIGIN}/terms`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Пользовательское соглашение", url: ORIGIN + "/terms" }]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Пользовательское соглашение ArchiTech MC",
        "author": { "@type": "Organization", "name": "ArchiTech MC" },
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/terms`
      }
    ]
  },
  "/privacy": {
    title: "Политика конфиденциальности ArchiTech MC",
    description: "Политика конфиденциальности Minecraft сервера ArchiTech MC.",
    keywords: ['ArchiTech MC', 'политика конфиденциальности', 'privacy policy'],
    canonical: `${ORIGIN}/privacy`,
    og: { url: `${ORIGIN}/privacy`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{ name: "Главная", url: ORIGIN + "/" }, { name: "Политика конфиденциальности", url: ORIGIN + "/privacy" }]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Политика конфиденциальности ArchiTech MC",
        "author": { "@type": "Organization", "name": "ArchiTech MC" },
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/privacy`
      }
    ]
  },
  '/chat': {
    title: 'Чат - ArchiTech MC',
    robots: 'noindex,follow',
    canonical: `${ORIGIN}/chat`,
  },

  '/auth/login': { title: 'Вход - ArchiTech MC', robots: 'noindex,follow', canonical: `${ORIGIN}/auth/login` },
  '/auth/register': { title: 'Регистрация - ArchiTech MC', robots: 'noindex,follow', canonical: `${ORIGIN}/auth/register` },
  '/auth/reset': { title: 'Сброс пароля - ArchiTech MC', robots: 'noindex,follow', canonical: `${ORIGIN}/auth/reset` },
  '/verify/email': { title: 'Подтверждение email - ArchiTech MC', robots: 'noindex,follow', canonical: `${ORIGIN}/verify/email` },
  '/settings/profile': { title: 'Настройки профиля', robots: 'noindex,follow', canonical: `${ORIGIN}/settings/profile` },
  '/settings/email': { title: 'Настройки почты', robots: 'noindex,follow', canonical: `${ORIGIN}/settings/email` },
  '/settings/password': { title: 'Смена пароля', robots: 'noindex,follow', canonical: `${ORIGIN}/settings/password` },
  '/me': { title: 'Мой профиль', robots: 'noindex,follow', canonical: `${ORIGIN}/me` },

  "/u/:username": { title: "Профиль игрока - ArchiTech MC", robots: "noindex,follow", og: { image: OG } },
  "/u/:username/achievements": {
    title: "Достижения игрока - ArchiTech MC",
    robots: "noindex,follow",
    og: { image: OG },
  }
} as const;

export type RoutePath = keyof typeof routesMeta;
