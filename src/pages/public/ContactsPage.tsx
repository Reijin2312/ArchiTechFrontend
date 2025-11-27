import React from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { TEAM_MEMBERS } from '@/shared/data/team';
import { useTeamAvatars } from '@/shared/hooks/useTeamAvatars';
import { TeamGrid } from '@/shared/ui/card/TeamGrid';
import {
  SvgTelegram,
  SvgDiscord,
  SvgArrowUpRight,
  SvgShield,
  SvgHeadphones,
} from '@/shared/ui/image/Icons';

import { DISCORD_URL, TELEGRAM_URL, SUPPORT_EMAIL } from '@/shared/constants';

type ContactAction = {
  label: string;
  href: string;
  external?: boolean;
  variant?: 'primary' | 'secondary';
};

type ContactCardConfig = {
  id: string;
  title: string;
  description: string;
  icon: 'support' | 'moderation' | 'telegram' | 'discord';
  badge?: string;
  meta?: string;
  actions: ContactAction[];
};

const CONTACT_CARDS: ContactCardConfig[] = [
  {
    id: 'support',
    title: 'Поддержка',
    description: 'Поможем с лаунчером, игрой, доступом на сервер. Принимаем репорты о найденных багах и прочих технических проблемах.',
    icon: 'support',
    badge: 'Ответ в день обращения',
    meta: 'Работаем ежедневно с 12:00 до 22:00 МСК.',
    actions: [
      { label: 'Перейти в поддержку', href: DISCORD_URL, external: true, variant: 'primary' },
      { label: 'Написать на почту', href: `mailto:${SUPPORT_EMAIL}`, variant: 'secondary' },
    ],
  },
  {
    id: 'moderation',
    title: 'Модерация',
    description: 'Жалобы на игроков, вопросы по правилам, разбан. При подаче жалобы предоставляйте доказательства.',
    icon: 'moderation',
    badge: 'Справедливость - приоритет',
    meta: 'Для апелляций используйте закреплённый шаблон в канале #helpdesk.',
    actions: [
      { label: 'Открыть гайд', href: '/rules#penalties', variant: 'primary' },
      { label: 'Написать модераторам', href: DISCORD_URL, external: true, variant: 'secondary' },
    ],
  },
  {
    id: 'telegram',
    title: 'Telegram канал',
    description: 'Анонсы, статусы серверов, новые ивенты. Уведомления приходят моментально.',
    icon: 'telegram',
    badge: 'Новости без спама',
    actions: [
      { label: 'Перейти в канал', href: TELEGRAM_URL, external: true, variant: 'primary' },
    ],
  },
  {
    id: 'discord',
    title: 'Discord сервер',
    description: 'Посиделки в голосовых каналах, приятная атмосфера.',
    icon: 'discord',
    badge: 'Ламповое сообщество',
    meta: 'Для входа нужна роль игрока или активная подписка.',
    actions: [
      { label: 'Перейти на сервер', href: DISCORD_URL, external: true, variant: 'primary' },
    ],
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const ICONS: Record<ContactCardConfig['icon'], React.ReactNode> = {
  support: <SvgHeadphones className="h-5 w-5 text-indigo-200" />,
  moderation: <SvgShield className="h-5 w-5 text-emerald-200" />,
  telegram: <SvgTelegram className="h-5 w-5 text-sky-200" />,
  discord: <SvgDiscord className="h-5 w-5 text-violet-200" />,
};

function ContactActionButton({ action }: { action: ContactAction }) {
  const className =
    action.variant === 'secondary'
      ? 'inline-flex items-center gap-1 rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white'
      : 'inline-flex items-center gap-1 rounded-xl bg-sky-600/90 px-4 py-2 text-sm font-medium text-white shadow shadow-sky-900/50 transition hover:bg-sky-500';

  const rel = action.external ? 'noreferrer noopener' : undefined;
  const target = action.external ? '_blank' : undefined;

  return (
    <a href={action.href} target={target} rel={rel} className={className}>
      {action.label}
      {action.external && <SvgArrowUpRight className="h-4 w-4" />}
    </a>
  );
}

export default function ContactsPage() {
  useWallpaper();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const disableMotion = Boolean(reduceMotion) || isMobile;
  const avatars = useTeamAvatars(TEAM_MEMBERS);

  return (
    <>
      <Seo {...routesMeta['/contacts']} />
      <div className="relative mx-auto max-w-7xl px-4 py-10 text-slate-100">
        <motion.section
          className="mx-auto max-w-4xl text-center mb-10"
          initial={disableMotion ? undefined : { opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={disableMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Contacts</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">
            Контакты ArchiTech MC
          </h1>
          <p className="mt-4 text-base text-slate-300">
            Свяжитесь с поддержкой, модерацией, зайдите на дискорд-сервер или подпишитесь на Telegram-канал сообщества.
            Мы отвечаем максимально быстро и публикуем все апдейты сразу.
          </p>
        </motion.section>

        <motion.section
          className="grid gap-4 md:grid-cols-2"
          variants={disableMotion ? undefined : gridVariants}
          initial={disableMotion ? undefined : 'hidden'}
          animate={disableMotion ? undefined : 'show'}
        >
          {CONTACT_CARDS.map((card) => (
            <motion.article
              key={card.id}
              variants={disableMotion ? undefined : cardVariants}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md"
            >
              <div className="pointer-events-none absolute inset-0 opacity-50 blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-sky-500/10" />
              </div>
              <div className="relative flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900/80">
                    {ICONS[card.icon]}
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-[0.18em] text-slate-400">{card.badge}</div>
                    <h2 className="text-xl font-semibold text-slate-50">{card.title}</h2>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{card.description}</p>
                <div className="flex flex-wrap gap-2">
                  {card.actions.map((action) => (
                    <ContactActionButton key={action.label} action={action} />
                  ))}
                </div>
                {card.meta && <p className="text-xs text-slate-400">{card.meta}</p>}
              </div>
            </motion.article>
          ))}
        </motion.section>

        <motion.section
          className="mt-14"
          initial={disableMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={disableMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={disableMotion ? undefined : { once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-3 mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Team</p>
            <h2 className="text-2xl font-semibold">Администрация и команда</h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Напрямую доступны в Discord и на сайте. Профиль каждого участника содержит ссылки на соцсети и открытый чат.
            </p>
          </div>
          <TeamGrid team={TEAM_MEMBERS} avatars={avatars} disableMotion={disableMotion} />
        </motion.section>
      </div>
    </>
  );
}

