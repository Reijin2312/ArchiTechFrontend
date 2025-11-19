export const ORIGIN = 'https://architech-mc.ru';

const breadcrumb = (items: { name: string; url: string }[]) => ({
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  "itemListElement": items.map((it, i) => ({
    "@type":"ListItem", "position": i+1, "name": it.name, "item": it.url
  }))
});

const jsonLdOrg = {
  "@context":"https://schema.org",
  "@type":"Organization",
  "name":"ArchiTech MC",
  "url": ORIGIN,
  "logo": ORIGIN + "/images/favicon-192.png",
  "sameAs":[]
};

const jsonLdSite = {
  "@context":"https://schema.org",
  "@type":"WebSite",
  "name":"ArchiTech MC",
  "url": ORIGIN,
  "potentialAction": {
    "@type":"SearchAction",
    "target": ORIGIN + "/wiki?q={search_term_string}",
    "query-input":"required name=search_term_string"
  }
};

import { DISCORD_URL, TELEGRAM_URL, SERVER_IP } from '@/shared/constants';

const OG = ORIGIN + "/og/home.jpg";
const DISCORD = DISCORD_URL;
const TELEGRAM = TELEGRAM_URL;
const SUPPORT_EMAIL = 'hello@architech-mc.ru';

export const routesMeta: Record<string, any> = {
  '/': {
    title: 'ArchiTech MC — техномагический Minecraft-сервер без вайпов',
    description: `Модифицированный сервер: техномагия, строительство, собственные моды. IP: ${SERVER_IP}.`,
    canonical: `${ORIGIN}/`,
    og: { url: ORIGIN + "/", type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      jsonLdOrg, 
      jsonLdSite,
      {
        "@context":"https://schema.org",
        "@type":"FAQPage",
        "mainEntity":[
          { "@type":"Question", "name":"Как подключиться?",
            "acceptedAnswer":{ "@type":"Answer", "text":`Зарегестрируйтесь, скачайте лаунчер и подключайтесь по IP ${SERVER_IP}.` } },
          { "@type":"Question", "name":"Есть ли вайпы?",
            "acceptedAnswer":{ "@type":"Answer", "text":"Вайпов нет." } }
        ]
      }
    ]
  },
  "/wiki": {
    title: "Wiki — моды, гайды и документация | ArchiTech MC",
    description: "Сборник гайдов по модам, механикам, квестам и экономике на ArchiTech MC.",
    canonical: `${ORIGIN}/wiki`,
    og: { url: `${ORIGIN}/wiki`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{name:"Главная", url: ORIGIN + "/"}, {name:"Wiki", url: ORIGIN + "/wiki"}]),
      {
        "@context":"https://schema.org",
        "@type":"Article",
        "headline":"Wiki ArchiTech",
        "author":{"@type":"Organization","name":"ArchiTech MC"},
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/wiki`
      }
    ]
  },
  "/rules": {
    title: "Правила сервера | ArchiTech MC",
    description: "Актуальные правила поведения и наказания на ArchiTech MC.",
    canonical: `${ORIGIN}/rules`,
    og: { url: `${ORIGIN}/rules`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{name:"Главная", url: ORIGIN + "/"}, {name:"Правила", url: ORIGIN + "/rules"}]),
      {
        "@context":"https://schema.org",
        "@type":"Article",
        "headline":"Правила сервера ArchiTech",
        "author":{"@type":"Organization","name":"ArchiTech MC"},
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/rules`
      }
    ]
  },
  "/shop": {
    title: "Проходка на сервер | ArchiTech MC",
    description: "Как получить проходку. Доступ, поддержка.",
    canonical: `${ORIGIN}/shop`,
    og: { url: `${ORIGIN}/shop`, type: "website", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{name:"Главная", url: ORIGIN + "/"}, {name:"Магазин", url: ORIGIN + "/shop"}]),
      {
        "@context":"https://schema.org",
        "@type":"Product",
        "name":"Проходка ArchiTech MC",
        "brand":"ArchiTech MC",
        "url": `${ORIGIN}/shop`,
        "image": OG
      }
    ]
  },
  "/contacts": {
    title: "Контакты и поддержка | ArchiTech MC",
    description: "Поддержка, модерация, Discord и Telegram ArchiTech MC. Быстрая связь с администрацией и сообществом.",
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
        "sameAs": [DISCORD, TELEGRAM]
      }
    ]
  },
  "/terms": {
    title: "Пользовательское соглашение | ArchiTech MC",
    description: "Условия использования сервера и лаунчера.",
    canonical: `${ORIGIN}/terms`,
    og: { url: `${ORIGIN}/terms`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{name:"Главная", url: ORIGIN + "/"}, {name:"Соглашение", url: ORIGIN + "/terms"}]),
      {
        "@context":"https://schema.org",
        "@type":"Article",
        "headline":"Пользовательское соглашение",
        "author":{"@type":"Organization","name":"ArchiTech MC"},
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/terms`
      }
    ]
  },
  "/privacy": {
    title: "Политика конфиденциальности | ArchiTech MC",
    description: "Как мы обрабатываем и защищаем персональные данные.",
    canonical: `${ORIGIN}/privacy`,
    og: { url: `${ORIGIN}/privacy`, type: "article", image: OG },
    twitterCard: "summary_large_image",
    jsonLd: [
      breadcrumb([{name:"Главная", url: ORIGIN + "/"}, {name:"Конфиденциальность", url: ORIGIN + "/privacy"}]),
      {
        "@context":"https://schema.org",
        "@type":"Article",
        "headline":"Политика конфиденциальности",
        "author":{"@type":"Organization","name":"ArchiTech MC"},
        "image": OG,
        "mainEntityOfPage": `${ORIGIN}/privacy`
      }
    ]
  },

  '/auth/login':     { title:'Вход — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/login` },
  '/auth/register':  { title:'Регистрация — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/register` },
  '/auth/reset':     { title:'Сброс пароля — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/reset` },
  '/verify/email':   { title:'Подтверждение почты — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/verify/email` },
  '/settings/profile':{ title:'Профиль — настройки', robots:'noindex,follow', canonical:`${ORIGIN}/settings/profile` },
  '/settings/email':  { title:'Смена почты', robots:'noindex,follow', canonical:`${ORIGIN}/settings/email` },
  '/settings/password':{ title:'Смена пароля', robots:'noindex,follow', canonical:`${ORIGIN}/settings/password` },
  '/me':             { title:'Мой профиль', robots:'noindex,follow', canonical:`${ORIGIN}/me` },
  
  "/u/:username": { title:"Профиль игрока — ArchiTech MC", robots:"noindex,follow", og:{ image: OG } }
} as const;

export type RoutePath = keyof typeof routesMeta;
