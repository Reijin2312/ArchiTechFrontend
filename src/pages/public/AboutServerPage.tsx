import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { Seo } from '@/shared/seo/seo'
import { routesMeta } from '@/shared/seo/routesMeta'
import { ResponsiveImage } from '@/shared/ui/image/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SvgMcBlockGrass, SvgModpack, SvgShield, SvgGitHub, SvgChevronDown } from '@/shared/ui/image/Icons'
import { useIsMobile } from '@/shared/ui/utils/useIsMobile'
import { SERVER_NAME, DISCORD_URL, TELEGRAM_URL, LAUNCHER_DOWNLOAD_URL } from '@/shared/constants'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { aboutTranslations, englishSeasons } from '@/shared/i18n/aboutTranslations'

type SeasonPlayer = {
  username: string
  role?: string
}

type Season = {
  number: number
  name: string
  period: string
  description: string
  features: string[]
  screenshots: string[]
  players: SeasonPlayer[]
  legacy?: boolean
}

const SEASONS: Season[] = [
  {
    number: 1,
    name: 'Мир островов',
    period: 'Май 2022 — Октябрь 2022',
    description: 'Первый сезон был пробной попыткой понять, насколько интересно будет играть с друзьями на локальном сервере «только для своих», который поднимался через локальную сеть. Мир сезона — «Мир островов» — жил на небольшой, разрозненной сборке модов, но уже тогда Create занял ключевое место в геймплее и стал символом технического направления сервера. Первой базой стала яма под домом в деревне на спавне, которую выкопали kiduvl и Raijin — простая стартовая точка, из которой позже выросли привычки и подходы, перекочевавшие в следующие сезоны.',
    features: ['Постройка игроком Raijin базы и спавна, восточный стиль которых затем будет мигрировать с сезона на сезон',
               'Мирная жизнь Kelbor_Hal на островке под названием Нострамо, который впоследствии был взорван его же руками',
               'Основание первой и единственной промзоны Медуза-1 Vlad2509',
               'Прокладывание титанической железной дороги, соединяющей спавн, базу игрока kookyxa и Медузу-1',
               'Совместными силами прокладывается метро, которое так ни разу и не было запущено',
               'Kelbor_Hal сооружает гранитную башню Энунция, скребущую небеса, которая была расстреляна из огромной пушки в знак окончания первого сезона и закрытия сервера'],
    screenshots: ['/images/screen6.png', '/images/screen7.png', '/images/screen8.png'],
    players: [
      { username: 'Raijin', role: 'Основатель' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'kookyxa', role: 'Игрок' },
      { username: 'kiduvl', role: 'Игрок' },
      { username: 'Anjelka63', role: 'Игрок' },
      { username: 'Orter', role: 'Игрок' },
      { username: 'Vlad2509', role: 'Игрок' },
    ],
    legacy: true
  },
  {
    number: 2,
    name: 'Мир равнин',
    period: 'Ноябрь 2022 — Май 2023',
    description: 'Второй сезон стал воплощением желания снова собраться той же компанией и начать заново — уже с опытом и ожиданием больших проектов. Новый мир — «Мир равнин», новая сборка модов, знакомые лица. Центрами жизни сезона стали спавн и промзона «Олимпия». Спавн представлял собой горную долину с озером, где Kelbor_Hal начал строительство черного замка. Позже озеро полностью преобразилось: kiduvl засадил его «ельбезами» — гигантскими деревьями, которые стали визуальной визиткой сезона. «Олимпия» же закрепила статус сервера как технической площадки: Kelbor_Hal отвечал за архитектуру и внешний облик, а Raijin — за внутреннее наполнение, инфраструктуру и связность мира, включая железную дорогу и вокзалы на обеих станциях. Сезон завершился раньше, чем успел раскрыться: обстоятельства поставили точку, и ни один крупный проект не был доведён до полного финала.',
    features: ['Запуск сезона в мире «Мир равнин» с обновлённой сборкой модов и возвращением старой компании',
               'Начало строительства черного замка на озере спавна игроком Kelbor_Hal',
               'Полное преобразование озера спавна «ельбезами» — гигантскими деревьями',
               'Основание и развитие промзоны «Олимпия» как главного технического проекта сезона',
               'Архитектурный дизайн цеха и территории «Олимпии» от Kelbor_Hal и техническое наполнение от Raijin',
               'Прокладка железной дороги между спавном и «Олимпией», строительство вокзалов на каждой станции',
               'Раннее завершение сезона, из-за чего проекты так и остались на стадии «почти получилось»'],
    screenshots: ['/images/screen3.png', '/images/screen4.png'],
    players: [
      { username: 'Raijin', role: 'Основатель' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'kiduvl', role: 'Игрок'},
      { username: 'Sile_Scorp', role: 'Игрок' },
      { username: 'kookyxa', role: 'Игрок' },
      { username: 'anton_roma', role: 'Игрок' }
    ],
    legacy: true
  },
  {
    number: 3,
    name: 'Промышленная революция',
    period: 'Июнь 2023 — Декабрь 2023',
    description: 'Третий сезон стал переходным: обновили версию игры, пересобрали модпак и начали проверять, как это всё держится в долгой игре. Часть решений прижилась сразу, часть пришлось менять уже по ходу сезона.',
    features: ['Переезд на новую версию Minecraft и пересборка модпака', 'Первая крупная правка серверной экономики', 'Тест ранних версий самописных модов в реальной игре', 'Подготовка базы под формат мира без вайпов'],
    screenshots: ['/images/screen5.png', '/images/screen6.png'],
    players: [
      { username: 'Raijin', role: 'Владелец' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'Sile_Scorp', role: 'Дизайнер' },
      { username: 'Explyp', role: 'Python-программист' },
      { username: 'NephiliM', role: 'Игрок' },
      { username: 'kiduvl', role: 'Игрок' },
      { username: 'kookyxa', role: 'Игрок' },
      { username: 'anton_roma', role: 'Игрок' }
    ],
    legacy: true
  },
  {
    number: 4,
    name: 'Инфинити',
    period: '20 июля 2025 года — Настоящее время',
    description:
      'Это текущий сезон. Мир перенесли из третьего сезона вместе с дорогами и постройками, так что никто не стартовал с пустого места. Идея простая: развивать один живой мир без регулярных обнулений.',
    features: ['Полные вайпы отключены', 'Техника и магия развиваются параллельно', 'Упор на долгие совместные проекты', 'Экономика меняется аккуратно, без резких обнулений'],
    screenshots: [
      '/images/screen10.png',
      '/images/screen12.png'
    ],
    players: [
      { username: 'Raijin', role: 'Владелец & программист' },
      { username: 'Kelbor_Hal', role: 'Мл. Админ' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'Sile_Scorp', role: 'Дизайнер' },
      { username: 'Explyp', role: 'Python-программист' },
      { username: 'NephiliM', role: 'Игрок' },
      { username: 'kiduvl', role: 'Игрок' },
      { username: 'kookyxa', role: 'Игрок' },
      { username: 'anton_roma', role: 'Игрок' }
    ],
    legacy: false
  }
]

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ')
}

function GlassCard({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-700/80 bg-slate-900/22 backdrop-blur-xl backdrop-saturate-180 shadow-xl shadow-slate-950/25 ring-1 ring-white/6',
        className
      )}
    >
      {children}
    </div>
  )
}

export default function AboutServerPage() {
  useWallpaper()
  const { language } = useI18n()
  const copy = aboutTranslations[language]
  const seasons = useMemo(() => language === 'en'
    ? SEASONS.map((season, index) => ({ ...season, ...englishSeasons[index], features: [...englishSeasons[index].features] }))
    : SEASONS, [language])

  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = Boolean(prefersReducedMotion)
  const isMobile = useIsMobile()
  const disableEntranceMotion = reduceMotion || isMobile
  const disableInteractiveMotion = reduceMotion || isMobile

  const [expandedSeason, setExpandedSeason] = useState<number | null>(null)
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({})

  const heroScreenshot = '/images/screen2.png'

  const toName = (p: string) =>
    p
      .split('/')
      .pop()!
      .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
      .replace(/\.(avif|webp)$/i, '.png')

  // Загрузка аватаров игроков
  useEffect(() => {
    const allPlayers = seasons.flatMap((s) => s.players.map((p) => p.username))
    const uniquePlayers = Array.from(new Set(allPlayers))

    const controller = new AbortController()
    let alive = true

    ;(async () => {
      const avatars: Record<string, string> = {}
      await Promise.all(
        uniquePlayers.map(async (username) => {
          try {
            const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(username)}`, {
              signal: controller.signal
            })
            if (!r.ok) return
            const data = await r.json()
            if (data.avatarUrl && alive) avatars[username] = data.avatarUrl
          } catch {}
        })
      )
      if (alive) setPlayerAvatars(avatars)
    })()

    return () => {
      alive = false
      controller.abort()
    }
  }, [seasons])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.06 } }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: 'easeOut' } }
  }

  return (
    <>
      <Seo {...routesMeta['/about']} />

      <div className="min-h-dvh text-slate-100 relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 right-[-18%] h-112 w-md rounded-full bg-indigo-500/14 blur-[120px]" />
          <div className="absolute -bottom-36 left-[-20%] h-128 w-lg rounded-full bg-sky-500/12 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[26px_26px]" />
        </div>

        <motion.section
          className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:pt-16 relative"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 22, filter: 'blur(8px)' }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <GlassCard className="p-6 md:p-10 bg-slate-900/10 backdrop-blur-none backdrop-saturate-100">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {copy.title} <span className="text-indigo-400">{SERVER_NAME}</span>
              </h1>
              <p className="text-lg text-slate-300">
                {copy.lead}
              </p>
            </div>

            <motion.div
              className="mt-8 grid gap-6 md:grid-cols-3 md:items-stretch"
              variants={disableEntranceMotion ? undefined : containerVariants}
              initial={disableEntranceMotion ? undefined : 'hidden'}
              animate={disableEntranceMotion ? undefined : 'show'}
            >
              <motion.div className="h-full" variants={disableEntranceMotion ? undefined : itemVariants}>
                <GlassCard className="flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]">
                  <div className="size-12 rounded-xl bg-indigo-600/20 grid place-items-center text-indigo-300 mb-4 ring-1 ring-white/10">
                    <SvgShield className="h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{copy.cards[0][0]}</h3>
                  <p className="text-slate-300 text-sm">{copy.cards[0][1]}</p>
                </GlassCard>
              </motion.div>

              <motion.div className="h-full" variants={disableEntranceMotion ? undefined : itemVariants}>
                <GlassCard className="flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]">
                  <div className="size-12 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-4 ring-1 ring-white/10">
                    <SvgModpack className="h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{copy.cards[1][0]}</h3>
                  <p className="text-slate-300 text-sm">{copy.cards[1][1]}</p>
                </GlassCard>
              </motion.div>

              <motion.div className="h-full" variants={disableEntranceMotion ? undefined : itemVariants}>
                <GlassCard className="flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]">
                  <div className="size-12 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-4 ring-1 ring-white/10">
                    <SvgGitHub className="h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{copy.cards[2][0]}</h3>
                  <p className="text-slate-300 text-sm">{copy.cards[2][1]}</p>
                </GlassCard>
              </motion.div>
            </motion.div>
          </GlassCard>
        </motion.section>

        <motion.section
          id="gallery"
          className="mx-auto max-w-7xl px-4 py-10 relative"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 22 }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="rounded-2xl p-px bg-linear-to-br from-indigo-500/35 via-slate-800/20 to-sky-500/25 shadow-2xl shadow-indigo-900/20">
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/30">
              <ResponsiveImage
                name={toName(heroScreenshot) as keyof typeof IMAGES}
                alt={copy.worldAlt}
                eager
                width={1920}
                height={1080}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </motion.section>

        <motion.section
          id="seasons"
          className="mx-auto max-w-7xl px-4 py-10 relative"
          variants={containerVariants}
          initial={disableEntranceMotion ? undefined : 'hidden'}
          whileInView={disableEntranceMotion ? undefined : 'show'}
          viewport={{ once: true, margin: '-10% 0px' }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">{copy.history}</h2>

          <div className="grid gap-4">
            {seasons.map((season) => {
              const isOpen = expandedSeason === season.number
              const isCurrent = !season.legacy

              return (
                <motion.div key={season.number} variants={disableEntranceMotion ? undefined : itemVariants} className="relative">
                  <div
                    className={cx(
                      'rounded-2xl border overflow-hidden backdrop-blur-xl backdrop-saturate-180 transition-all shadow-lg shadow-slate-950/20',
                      isCurrent
                        ? 'border-indigo-500/45 bg-linear-to-br from-indigo-900/20 to-slate-900/14 ring-1 ring-indigo-300/20'
                        : 'border-slate-700/80 bg-slate-900/20 ring-1 ring-white/6'
                    )}
                  >
                    <button
                      onClick={() => setExpandedSeason(isOpen ? null : season.number)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-900/25 flex items-center justify-between transition-colors"
                      aria-expanded={isOpen}
                      aria-controls={`season-panel-${season.number}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={cx(
                            'size-12 rounded-xl grid place-items-center text-xl font-bold ring-1 ring-white/10 shrink-0',
                            isCurrent ? 'bg-indigo-600/25 text-indigo-200' : 'bg-slate-700/25 text-slate-300'
                          )}
                        >
                          {season.number}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-semibold truncate">{season.name}</h3>
                            {isCurrent && (
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/25">
                                {copy.current}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{season.period}</p>
                        </div>
                      </div>

                      <motion.span
                        className="text-slate-400"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      >
                        <SvgChevronDown className="size-5" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`season-panel-${season.number}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-slate-800/80"
                        >
                          <div className="px-5 py-4 space-y-6">
                            <p className="text-slate-300">{season.description}</p>

                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-2">{copy.events}</h4>
                              <ul className="space-y-2">
                                {season.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="text-indigo-400 mt-0.5">▸</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {season.screenshots.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">{copy.builds}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {season.screenshots.map((screenshot, idx) => (
                                    <motion.div
                                      key={screenshot}
                                      whileHover={disableInteractiveMotion ? undefined : { scale: 1.03 }}
                                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                                      className="aspect-video rounded-lg overflow-hidden border border-slate-700/50 shadow-md"
                                    >
                                      <ResponsiveImage
                                        name={toName(screenshot) as keyof typeof IMAGES}
                                        alt={`${season.name} — ${copy.screenshot} ${idx + 1}`}
                                        width={640}
                                        height={360}
                                        sizes="(max-width: 768px) 50vw, 320px"
                                        className="h-full w-full object-cover"
                                      />
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {season.players.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                                  {copy.players} ({season.players.length})
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {season.players.map((player) => {
                                    const avatar = playerAvatars[player.username]
                                    return (
                                      <Link
                                        key={player.username}
                                        to={`/u/${encodeURIComponent(player.username)}`}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-700/45 bg-slate-900/24 backdrop-blur-md backdrop-saturate-150 hover:bg-slate-800/38 hover:border-slate-600 transition-all group"
                                      >
                                        {avatar ? (
                                          <img
                                            src={avatar}
                                            alt={player.username}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-lg object-cover border border-slate-700 group-hover:border-slate-600 transition-colors"
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg border border-slate-700 bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-lg text-slate-300 group-hover:border-slate-600 transition-colors">
                                            {player.username[0]?.toUpperCase() || '?'}
                                          </div>
                                        )}

                                        <div className="text-center w-full">
                                          <div className="text-sm text-slate-200 group-hover:text-slate-100 truncate transition-colors">
                                            {player.username}
                                          </div>
                                          {player.role && <div className="text-xs text-slate-500 truncate">{language === 'en' ? englishRole(player.role) : player.role}</div>}
                                        </div>
                                      </Link>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          id="join"
          className="mx-auto max-w-7xl px-4 py-10 mb-10 relative"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 22 }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.12 }}
        >
          <div className="rounded-3xl p-px bg-linear-to-br from-indigo-500/45 via-slate-800/20 to-sky-500/30 shadow-2xl shadow-indigo-900/20">
            <div className="relative rounded-3xl border border-slate-800/70 p-8 md:p-12 bg-slate-900/35 backdrop-blur-md backdrop-saturate-150 overflow-hidden text-center">
              <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/14 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-sky-500/14 blur-3xl" />

              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">{copy.join}</h2>
                <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
                  {copy.joinText}
                </p>

                <div className="flex flex-wrap gap-4 justify-center">
                  <a
                    href={LAUNCHER_DOWNLOAD_URL}
                    className="inline-flex rounded-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-900/20"
                  >
                    {copy.download}
                  </a>
                  <Link
                    to="/"
                    className="inline-flex rounded-xl px-6 py-3 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white font-medium transition-colors"
                  >
                    {copy.home}
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-slate-400">
                  <a href={DISCORD_URL} className="hover:text-indigo-300 transition-colors">
                    Discord
                  </a>
                  <span>•</span>
                  <a href={TELEGRAM_URL} className="hover:text-indigo-300 transition-colors">
                    Telegram
                  </a>
                  <span>•</span>
                  <a href="/wiki" className="hover:text-indigo-300 transition-colors">
                    {copy.wiki}
                  </a>
                  <span>•</span>
                  <a href="/rules" className="hover:text-indigo-300 transition-colors">
                    {copy.rules}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </>
  )
}

function englishRole(role: string) {
  if (/Python/i.test(role)) return 'Python developer'
  if (/Дизайнер/i.test(role)) return 'Designer'
  if (/Тех/i.test(role)) return 'Technical admin'
  if (/Мл\./i.test(role)) return 'Junior admin'
  if (/Администратор/i.test(role)) return 'Administrator'
  if (/Основатель/i.test(role)) return 'Founder'
  if (/Владелец/i.test(role)) return 'Owner & developer'
  return 'Player'
}
