import React from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
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
  support: <SvgHeadphones className="h-5 w-5 text-[#d6b98e]" />,
  moderation: <SvgShield className="h-5 w-5 text-[#d6b98e]" />,
  telegram: <SvgTelegram className="h-5 w-5 text-[#d6b98e]" />,
  discord: <SvgDiscord className="h-5 w-5 text-[#d6b98e]" />,
};

function ContactActionButton({ action }: { action: ContactAction }) {
  const className =
    action.variant === 'secondary'
      ? 'inline-flex items-center gap-1 rounded-[8px] border border-[rgba(239,232,218,0.27)] px-4 py-2.5 text-sm text-[#c9c3b8] transition hover:border-[#c5aa84] hover:text-white'
      : 'inline-flex items-center gap-1 rounded-[8px] bg-[#c8ae88] px-4 py-2.5 text-sm font-medium text-[#211f1b] transition hover:bg-[#e6d6bd]';

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
  const { language } = useI18n();
  const cards = language === 'en' ? CONTACT_CARDS_EN : CONTACT_CARDS;
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const disableMotion = Boolean(reduceMotion) || isMobile;
  const avatars = useTeamAvatars(TEAM_MEMBERS);

  return (
    <>
      <Seo {...routesMeta['/contacts']} />
      <div className="at-contact-page relative mx-auto w-full max-w-[1380px] px-5 pb-28 pt-14 text-[#f2efe9] sm:px-8 lg:pt-20">
        <motion.section
          className="mb-10 max-w-[900px] border-b border-[rgba(238,231,218,.22)] pb-10 text-left sm:mb-14 sm:pb-12"
          initial={disableMotion ? undefined : { opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={disableMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="font-[Onest] text-[11px] font-semibold uppercase tracking-[.2em] text-[#c5aa84]">{language === 'ru' ? 'Связь' : 'Get in touch'}</p>
          <h1 className="mt-3 font-[Onest] text-[clamp(40px,5.4vw,72px)] font-semibold leading-[1.05] tracking-[-.055em] text-[#f2efe9]">
            {language === 'ru' ? 'Контакты ArchiTech MC' : 'ArchiTech MC contacts'}
          </h1>
          <p className="mt-5 max-w-[740px] text-[16px] leading-[1.8] text-[#c9c3b8]">
            {language === 'ru' ? 'Здесь всё, что нужно для связи: техподдержка, модерация, Discord и Telegram. Без лишнего — просто выбирайте нужный канал.' : 'Everything you need to reach us: technical support, moderation, Discord, and Telegram. Pick the channel that fits your question.'}
          </p>
        </motion.section>

        <motion.section
          className="grid gap-3 md:grid-cols-2"
          variants={disableMotion ? undefined : gridVariants}
          initial={disableMotion ? undefined : 'hidden'}
          animate={disableMotion ? undefined : 'show'}
        >
          {cards.map((card) => (
            <motion.article
              key={card.id}
              variants={disableMotion ? undefined : cardVariants}
              className="relative overflow-hidden rounded-[9px] border border-[rgba(239,232,218,.22)] bg-[rgba(29,31,27,.95)] p-6 backdrop-blur-[8px] transition-[border-color,background-color] duration-300 hover:border-[rgba(239,232,218,.41)] hover:bg-[rgba(36,38,33,.97)] sm:p-7"
            >
              <div className="relative flex h-full flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-[rgba(239,232,218,.23)] bg-[#2c2e28]">
                    {ICONS[card.icon]}
                  </div>
                  <div>
                    <div className="font-[Onest] text-[11px] font-medium uppercase tracking-[.12em] text-[#c6ad8a]">{card.badge}</div>
                    <h2 className="mt-0.5 font-[Onest] text-[22px] font-semibold tracking-[-.035em] text-[#f2efe9]">{card.title}</h2>
                  </div>
                </div>
                <p className="text-[15px] leading-7 text-[#ccc6ba]">{card.description}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {card.actions.map((action) => (
                    <ContactActionButton key={action.label} action={action} />
                  ))}
                </div>
                {card.meta && <p className="text-[12px] leading-5 text-[#aaa497]">{card.meta}</p>}
              </div>
            </motion.article>
          ))}
        </motion.section>

        <motion.section
          className="mt-24 sm:mt-28"
          initial={disableMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={disableMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={disableMotion ? undefined : { once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="mb-10 border-b border-[rgba(238,231,218,.22)] pb-8 sm:mb-12">
            <p className="font-[Onest] text-[11px] font-semibold uppercase tracking-[.2em] text-[#c5aa84]">{language === 'ru' ? 'Команда' : 'Team'}</p>
            <h2 className="mt-3 font-[Onest] text-[clamp(34px,4.5vw,58px)] font-semibold leading-[1.09] tracking-[-.05em] text-[#f2efe9]">{language === 'ru' ? 'Администрация и команда' : 'Staff and project team'}</h2>
          </div>
          <TeamGrid team={TEAM_MEMBERS} avatars={avatars} disableMotion={disableMotion} />
        </motion.section>
      </div>
    </>
  );
}

