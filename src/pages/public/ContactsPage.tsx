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
import { useI18n } from '@/shared/i18n/I18nProvider';

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
    description: 'Если не запускается лаунчер, не пускает на сервер или что-то сломалось в игре — пишите сюда.',
    icon: 'support',
    badge: 'Техвопросы',
    meta: 'Чтобы не терять время, приложите скрин и что именно уже пробовали сделать.',
    actions: [
      { label: 'Перейти в поддержку', href: DISCORD_URL, external: true, variant: 'primary' },
      { label: 'Написать на почту', href: `mailto:${SUPPORT_EMAIL}`, variant: 'secondary' },
    ],
  },
  {
    id: 'moderation',
    title: 'Модерация',
    description: 'Жалобы на игроков, спорные ситуации по правилам и апелляции по наказаниям.',
    icon: 'moderation',
    badge: 'Жалобы и апелляции',
    meta: 'По жалобам нужны доказательства: скриншоты, видео или логи.',
    actions: [
      { label: 'Открыть гайд', href: '/rules#penalties', variant: 'primary' },
      { label: 'Написать модераторам', href: DISCORD_URL, external: true, variant: 'secondary' },
    ],
  },
  {
    id: 'telegram',
    title: 'Telegram-канал',
    description: 'Там публикуем обновления, техработы и короткие новости по серверу.',
    icon: 'telegram',
    badge: 'Анонсы сервера',
    actions: [
      { label: 'Перейти в канал', href: TELEGRAM_URL, external: true, variant: 'primary' },
    ],
  },
  {
    id: 'discord',
    title: 'Discord сервер',
    description: 'Основное общение комьюнити: текстовые каналы, голос, помощь и быстрый контакт с командой.',
    icon: 'discord',
    badge: 'Голос и чат',
    meta: 'Если нужна помощь по игре, удобнее всего писать именно в Discord.',
    actions: [
      { label: 'Перейти на сервер', href: DISCORD_URL, external: true, variant: 'primary' },
    ],
  },
];

const CONTACT_CARDS_EN: ContactCardConfig[] = [
  { id: 'support', title: 'Support', description: 'Launcher will not start, the server rejects your login, or something broke in-game? Contact us here.', icon: 'support', badge: 'Technical help', meta: 'Include a screenshot and tell us what you have already tried.', actions: [{ label: 'Open support', href: DISCORD_URL, external: true, variant: 'primary' }, { label: 'Send an email', href: `mailto:${SUPPORT_EMAIL}`, variant: 'secondary' }] },
  { id: 'moderation', title: 'Moderation', description: 'Player reports, rule disputes, and appeals against penalties.', icon: 'moderation', badge: 'Reports and appeals', meta: 'Reports need evidence such as screenshots, video, or logs.', actions: [{ label: 'Read the guide', href: '/rules#penalties', variant: 'primary' }, { label: 'Contact moderators', href: DISCORD_URL, external: true, variant: 'secondary' }] },
  { id: 'telegram', title: 'Telegram channel', description: 'Project updates, maintenance notices, and short server news.', icon: 'telegram', badge: 'Server announcements', actions: [{ label: 'Open channel', href: TELEGRAM_URL, external: true, variant: 'primary' }] },
  { id: 'discord', title: 'Discord server', description: 'The main community hub for text channels, voice chat, help, and quick contact with the team.', icon: 'discord', badge: 'Voice and chat', meta: 'Discord is usually the fastest place to get in-game help.', actions: [{ label: 'Open Discord', href: DISCORD_URL, external: true, variant: 'primary' }] },
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
  const { language } = useI18n();
  const cards = language === 'en' ? CONTACT_CARDS_EN : CONTACT_CARDS;
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
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{language === 'ru' ? 'Связь' : 'Get in touch'}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">
            {language === 'ru' ? 'Контакты ArchiTech MC' : 'ArchiTech MC contacts'}
          </h1>
          <p className="mt-4 text-base text-slate-300">
            {language === 'ru' ? 'Здесь всё, что нужно для связи: техподдержка, модерация, Discord и Telegram. Без лишнего — просто выбирайте нужный канал.' : 'Everything you need to reach us: technical support, moderation, Discord, and Telegram. Pick the channel that fits your question.'}
          </p>
        </motion.section>

        <motion.section
          className="grid gap-4 md:grid-cols-2"
          variants={disableMotion ? undefined : gridVariants}
          initial={disableMotion ? undefined : 'hidden'}
          animate={disableMotion ? undefined : 'show'}
        >
          {cards.map((card) => (
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
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{language === 'ru' ? 'Команда' : 'Team'}</p>
            <h2 className="text-2xl font-semibold">{language === 'ru' ? 'Администрация и команда' : 'Staff and project team'}</h2>
          </div>
          <TeamGrid team={TEAM_MEMBERS} avatars={avatars} disableMotion={disableMotion} />
        </motion.section>
      </div>
    </>
  );
}

