import React, { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallpaper } from '@/shared/ui/useWallpaper'
import { AnimatePresence, motion, useReducedMotion, type Variants, type Transition } from 'framer-motion'
import { Seo } from '@/shared/seo/seo'
import { routesMeta } from '@/shared/seo/routesMeta'
import { ResponsiveImage } from '@/shared/ui/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SvgMcBlockGrass, SvgChevronDown } from '@/shared/ui/Icons'
import { useIsMobile } from '@/shared/ui/useIsMobile'
import { SERVER_NAME, DISCORD_URL, TELEGRAM_URL, LAUNCHER_DOWNLOAD_URL } from '@/shared/constants'

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
    name: 'Истоки',
    period: 'Май 2022 — Октябрь 2022',
    description: 'Первый сезон сервера. Время зарождения сообщества и формирования основ игрового процесса.',
    features: [
      'Первая сборка модов',
      'Формирование правил',
      'Создание базового комьюнити',
      'Первые постройки и традиции'
    ],
    screenshots: ['/images/screen1.png', '/images/screen2.png'],
    players: [
      { username: 'Raijin', role: 'Основатель' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'Player1' },
      { username: 'Player2' },
    ],
    legacy: true
  },
  {
    number: 2,
    name: 'Развитие',
    period: 'Ноябрь 2022 — Май 2023',
    description: 'Сезон активного роста и улучшения игрового опыта. Расширение модпака и функционала сервера.',
    features: [
      'Расширенная сборка модов',
      'Новые механики',
      'Рост сообщества',
      'Масштабные постройки'
    ],
    screenshots: ['/images/screen3.png', '/images/screen4.png'],
    players: [
      { username: 'Raijin', role: 'Основатель' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'Player3' },
      { username: 'Player4' },
    ],
    legacy: true
  },
  {
    number: 3,
    name: 'Эволюция',
    period: 'Июнь 2023 — Декабрь 2023',
    description: 'Переход на новую версию Minecraft и полное обновление модпака. Множество нововведений.',
    features: [
      'Обновлённая версия игры',
      'Переработанная экономика',
      'Новые возможности для строительства',
      'Уникальные самописные моды'
    ],
    screenshots: ['/images/screen5.png', '/images/screen6.png'],
    players: [
      { username: 'Raijin', role: 'Владелец' },
      { username: 'Kelbor_Hal', role: 'Администратор' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'Sile_Scorp', role: 'Дизайнер' },
      { username: 'Player5' },
      { username: 'Player6' },
    ],
    legacy: true
  },
  {
    number: 4,
    name: 'Бесконечность',
    period: 'Январь 2024 — Настоящее время',
    description: 'Текущий сезон без вайпов. Мир будет существовать вечно, ваш прогресс никогда не будет потерян.',
    features: [
      'Отмена полных вайпов навсегда',
      'Долгосрочные проекты',
      'Стабильная экономика',
      'Постоянное развитие'
    ],
    screenshots: ['/images/screen7.png', '/images/screen8.png'],
    players: [
      { username: 'Raijin', role: 'Владелец & программист' },
      { username: 'Kelbor_Hal', role: 'Мл. Админ' },
      { username: 'Wolle', role: 'Тех. Админ' },
      { username: 'Sile_Scorp', role: 'Дизайнер' },
      { username: 'Explyp', role: 'Python-программист' },
      { username: 'Player7' },
      { username: 'Player8' },
      { username: 'Player9' },
    ],
    legacy: false
  }
]

export default function AboutServerPage() {
  useWallpaper()

  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = Boolean(prefersReducedMotion)
  const isMobile = useIsMobile()
  const disableEntranceMotion = reduceMotion || isMobile
  const disableInteractiveMotion = reduceMotion

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
    const allPlayers = SEASONS.flatMap((s) => s.players.map((p) => p.username))
    const uniquePlayers = Array.from(new Set(allPlayers))

    let alive = true
    ;(async () => {
      const avatars: Record<string, string> = {}
      await Promise.all(
        uniquePlayers.map(async (username) => {
          try {
            const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(username)}`)
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
    }
  }, [])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  }

  return (
    <>
      <Seo {...routesMeta['/about']} />
      <div className="min-h-dvh text-slate-100 relative overflow-x-hidden">
        
        {/* Hero Section */}
        <motion.section
          className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pt-16"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              О сервере <span className="text-indigo-400">{SERVER_NAME}</span>
            </h1>
            <p className="text-lg text-slate-300">
              Техномагический Minecraft-сервер с богатой историей, уникальными модами и дружным сообществом.
              Мир без вайпов, где каждая постройка остаётся навсегда.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <motion.div
              variants={disableEntranceMotion ? undefined : itemVariants}
              initial={disableEntranceMotion ? undefined : 'hidden'}
              animate={disableEntranceMotion ? undefined : 'show'}
              className="relative rounded-2xl border border-slate-800 p-6 bg-linear-to-b from-indigo-900/20 to-slate-900/20 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="size-12 rounded-xl bg-indigo-600/20 grid place-items-center text-indigo-300 mb-4">
                <SvgMcBlockGrass className="h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Без вайпов</h3>
              <p className="text-slate-300 text-sm">
                Ваши постройки и прогресс остаются навсегда. Никаких полных вайпов с 4 сезона.
              </p>
            </motion.div>

            <motion.div
              variants={disableEntranceMotion ? undefined : itemVariants}
              initial={disableEntranceMotion ? undefined : 'hidden'}
              animate={disableEntranceMotion ? undefined : 'show'}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl border border-slate-800 p-6 bg-linear-to-b from-emerald-900/20 to-slate-900/20 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="size-12 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-4">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Техномагия</h3>
              <p className="text-slate-300 text-sm">
                Богатый модпак с техническими и магическими модами для любого стиля игры.
              </p>
            </motion.div>

            <motion.div
              variants={disableEntranceMotion ? undefined : itemVariants}
              initial={disableEntranceMotion ? undefined : 'hidden'}
              animate={disableEntranceMotion ? undefined : 'show'}
              transition={{ delay: 0.2 }}
              className="relative rounded-2xl border border-slate-800 p-6 bg-linear-to-b from-sky-900/20 to-slate-900/20 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="size-12 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Сообщество</h3>
              <p className="text-slate-300 text-sm">
                Дружная атмосфера, отзывчивая администрация и активное комьюнити.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Hero Screenshot */}
        <motion.section
          className="mx-auto max-w-7xl px-4 py-10"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
            <ResponsiveImage
              name={toName(heroScreenshot) as keyof typeof IMAGES}
              alt="Мир ArchiTech MC"
              eager
              width={1920}
              height={1080}
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.section>

        {/* Seasons Section */}
        <motion.section
          className="mx-auto max-w-7xl px-4 py-10"
          variants={containerVariants}
          initial={disableEntranceMotion ? undefined : 'hidden'}
          whileInView={disableEntranceMotion ? undefined : 'show'}
          viewport={{ once: true, margin: '-10% 0px' }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
            История сезонов
          </h2>
          
          <div className="grid gap-4">
            {SEASONS.map((season) => (
              <motion.div
                key={season.number}
                variants={disableEntranceMotion ? undefined : itemVariants}
                className="relative"
              >
                <div
                  className={[
                    'rounded-2xl border overflow-hidden backdrop-blur-md backdrop-saturate-150 transition-all',
                    season.legacy
                      ? 'border-slate-800 bg-slate-900/40'
                      : 'border-indigo-500/50 bg-linear-to-br from-indigo-900/30 to-slate-900/30'
                  ].join(' ')}
                >
                  <button
                    onClick={() => setExpandedSeason(expandedSeason === season.number ? null : season.number)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-900/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          'size-12 rounded-xl grid place-items-center text-xl font-bold',
                          season.legacy
                            ? 'bg-slate-700/30 text-slate-300'
                            : 'bg-indigo-600/30 text-indigo-300'
                        ].join(' ')}
                      >
                        {season.number}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold">{season.name}</h3>
                          {!season.legacy && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Текущий
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{season.period}</p>
                      </div>
                    </div>
                    <motion.span
                      className="text-slate-400"
                      animate={{ rotate: expandedSeason === season.number ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    >
                      <SvgChevronDown className="size-5" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedSeason === season.number && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-slate-800"
                      >
                        <div className="px-5 py-4 space-y-6">
                          <p className="text-slate-300">{season.description}</p>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">
                              Ключевые особенности:
                            </h4>
                            <ul className="space-y-2">
                              {season.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-indigo-400 mt-0.5">▸</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Screenshots Gallery */}
                          {season.screenshots.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-3">
                                Постройки сезона:
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                {season.screenshots.map((screenshot, idx) => (
                                  <motion.div
                                    key={screenshot}
                                    whileHover={{ scale: 1.03 }}
                                    className="aspect-video rounded-lg overflow-hidden border border-slate-700/50 shadow-md"
                                  >
                                    <ResponsiveImage
                                      name={toName(screenshot) as keyof typeof IMAGES}
                                      alt={`${season.name} - скриншот ${idx + 1}`}
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

                          {/* Players List */}
                          {season.players.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-400 mb-3">
                                Игроки сезона ({season.players.length}):
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {season.players.map((player) => {
                                  const avatar = playerAvatars[player.username]
                                  return (
                                    <Link
                                      key={player.username}
                                      to={`/u/${encodeURIComponent(player.username)}`}
                                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-700/50 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-600 transition-all group"
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
                                        <div className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-lg text-slate-400 group-hover:border-slate-600 transition-colors">
                                          {player.username[0]?.toUpperCase() || '?'}
                                        </div>
                                      )}
                                      <div className="text-center w-full">
                                        <div className="text-sm text-slate-200 group-hover:text-slate-100 truncate transition-colors">
                                          {player.username}
                                        </div>
                                        {player.role && (
                                          <div className="text-xs text-slate-500 truncate">
                                            {player.role}
                                          </div>
                                        )}
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
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="mx-auto max-w-7xl px-4 py-10 mb-10"
          initial={disableEntranceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
        >
          <div className="relative rounded-3xl border border-indigo-500/50 p-8 md:p-12 bg-linear-to-br from-indigo-900/30 via-slate-900/30 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden text-center">
            <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Готов присоединиться?
              </h2>
              <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
                Скачай лаунчер, получи проходку и начни своё приключение на {SERVER_NAME}!
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <a
                  href={LAUNCHER_DOWNLOAD_URL}
                  className="inline-flex rounded-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                >
                  Скачать лаунчер
                </a>
                <Link
                  to="/"
                  className="inline-flex rounded-xl px-6 py-3 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white font-medium transition-colors"
                >
                  На главную
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-slate-400">
                <a href={DISCORD_URL} className="hover:text-indigo-400 transition-colors">
                  Discord
                </a>
                <span>•</span>
                <a href={TELEGRAM_URL} className="hover:text-indigo-400 transition-colors">
                  Telegram
                </a>
                <span>•</span>
                <Link to="/wiki" className="hover:text-indigo-400 transition-colors">
                  Wiki
                </Link>
                <span>•</span>
                <Link to="/rules" className="hover:text-indigo-400 transition-colors">
                  Правила
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </>
  )
}
