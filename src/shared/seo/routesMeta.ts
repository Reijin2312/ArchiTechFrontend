export const ORIGIN = 'https://architech-mc.ru';

export const routesMeta = {
  '/': {
    title: 'ArchiTech MC — техномагический Minecraft-сервер без вайпов',
    description: 'Модифицированный сервер: техномагия, строительство, собственные моды. IP: architech-mc.online.',
    canonical: `${ORIGIN}/`,
    og: { url: `${ORIGIN}/`, image: `${ORIGIN}/og/home.jpg` },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ArchiTech MC',
        url: `${ORIGIN}/`,
        logo: `${ORIGIN}/images/favicon-192.png`,
        sameAs: ['https://discord.gg/x6JwVPwPtw','https://t.me/archi_tech_official']
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Как подключиться?',
            acceptedAnswer: { '@type':'Answer', text: 'Скачайте лаунчер и подключайтесь по IP architech-mc.online.' } },
          { '@type': 'Question', name: 'Есть ли вайпы?',
            acceptedAnswer: { '@type':'Answer', text: 'Вайпов нет.' } }
        ]
      }
    ]
  },
  '/rules': {
    title: 'Правила сервера — ArchiTech MC',
    description: 'Правила игры, взаимодействия и строительства на сервере ArchiTech MC.',
    canonical: `${ORIGIN}/rules`,
    og: { url: `${ORIGIN}/rules` }
  },
  '/shop': {
    title: 'Проходка на сервер — ArchiTech MC',
    description: 'Как получить проходку. Доступ, поддержка.',
    canonical: `${ORIGIN}/shop`,
    og: { url: `${ORIGIN}/shop` },
    jsonLd: [
      {
        '@context':'https://schema.org',
        '@type':'Product',
        name:'Проходка ArchiTech MC',
        brand:'ArchiTech MC',
      }
    ]
  },
  '/wiki':   { title:'Wiki — ArchiTech MC', description:'Справка по модам и механикам сервера.', canonical:`${ORIGIN}/wiki`, og:{url:`${ORIGIN}/wiki`} },
  '/terms':  { title:'Пользовательское соглашение — ArchiTech MC', description:'Условия использования сервера и лаунчера.', canonical:`${ORIGIN}/terms`, og:{url:`${ORIGIN}/terms`} },
  '/privacy':{ title:'Политика конфиденциальности — ArchiTech MC', description:'Какие данные собираем и как используем.', canonical:`${ORIGIN}/privacy`, og:{url:`${ORIGIN}/privacy`} },

  '/auth/login':     { title:'Вход — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/login` },
  '/auth/register':  { title:'Регистрация — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/register` },
  '/auth/reset':     { title:'Сброс пароля — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/auth/reset` },
  '/verify/email':   { title:'Подтверждение почты — ArchiTech MC', robots:'noindex,follow', canonical:`${ORIGIN}/verify/email` },
  '/settings/profile':{ title:'Профиль — настройки', robots:'noindex,follow', canonical:`${ORIGIN}/settings/profile` },
  '/settings/email':  { title:'Смена почты', robots:'noindex,follow', canonical:`${ORIGIN}/settings/email` },
  '/settings/password':{ title:'Смена пароля', robots:'noindex,follow', canonical:`${ORIGIN}/settings/password` },
  '/me':             { title:'Мой профиль', robots:'noindex,follow', canonical:`${ORIGIN}/me` },
  
  '/u/:username':    { title:'Профиль игрока — ArchiTech MC', robots:'noindex,follow' }
} as const;

export type RoutePath = keyof typeof routesMeta;
