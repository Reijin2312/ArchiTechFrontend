import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const SERVER_NAME = 'ArchiTech MC'
const SERVER_IP = 'architech-mc.online'
const DISCORD_URL = 'https://discord.gg/x6JwVPwPtw'
const TELEGRAM_URL = 'https://t.me/archi_tech_official'
const RULES_URL = '/rules'
const SHOP_URL = '/shop'
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { useScrollTop } from '@/shared/ui/useScrollTop';
import { AnimatePresence, motion, useReducedMotion, type Variants, type Transition, } from 'framer-motion'
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { ResponsiveImage } from '@/shared/ui/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SvgTelegram, SvgDiscord, SvgUserPlus, SvgMcBlockGrass, SvgCheck, SvgCopy, SvgChevronDown } from '@/shared/ui/Icons'

type McStatus = {
  online: boolean
  version?: string
  motd?: string
  players?: { online: number; max: number; sample?: { name: string }[] }
  latencyMs?: number
  tps?: number
}

export default function HomePage() {
  useWallpaper();

  const prefersReducedMotion = useReducedMotion();

  useScrollTop();

  const [status, setStatus] = useState<McStatus | null>(null)
  const [copyOk, setCopyOk] = useState<'idle' | 'ok' | 'err'>('idle')
  const shots = useMemo(
    () => [
      '/images/screen1.png',
      '/images/screen2.png',
      '/images/screen3.png',
      '/images/screen4.png',
      '/images/screen5.png',
      '/images/screen6.png',
      '/images/screen7.png',
      '/images/screen8.png',
    ],
    [],
  )
  const [shot, setShot] = useState(shots[0])
  const [prevShot, setPrevShot] = useState<string | null>(null)
  const [cross, setCross] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [sliderPaused, setSliderPaused] = useState(false)

  const thumbSpring: Transition = {
    type: 'spring',
    stiffness: 260,
    damping: 22,
    mass: 0.6,
  }

  const thumbVariants: Variants = {
    active: {
      scale: 1,
      opacity: 1,
      y: 0,
    },
    inactive: {
      scale: 0.85,
      opacity: 0.55,
      y: 2,
    },
  }

  const toName = (p: string) =>
  p.split('/').pop()!
   .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
   .replace(/\.(avif|webp)$/i, '.png')

  type PublicUser = {
    username: string
    userId: string
    avatarUrl?: string | null
    skinUrl?: string | null
  }

  const TEAM: { name: string; role: string }[] = [
    { name: 'Raijin',     role: 'Владелец & программист' },
    { name: 'Kelbor_Hal', role: 'Мл. Админ' },
    { name: 'Wolle',      role: 'Тех. Админ' },
    { name: 'Sile_Scorp', role: 'Дизайнер' },
    { name: 'Explyp',     role: 'Python-программист' },
  ]

  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const AVATAR_FALLBACK = '/images/avatar-fallback.png'

  useEffect(() => {
    let alive = true
    ;(async () => {
      const pairs = await Promise.all(
        TEAM.map(async (p) => {
          try {
            const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(p.name)}`)
            if (!r.ok) return [p.name, ''] as const
            const u: PublicUser = await r.json()
            return [p.name, u.avatarUrl || ''] as const
          } catch {
            return [p.name, ''] as const
          }
        })
      )
      if (!alive) return
      const next: Record<string, string> = {}
      for (const [k, v] of pairs) if (v) next[k] = v
      setAvatars(next)
    })()
    return () => { alive = false }
  }, [])

  function changeTo(newSrc: string) {
    if (newSrc === shot) return

    const currIdx = shots.indexOf(shot)
    const nextIdx = shots.indexOf(newSrc)
    if (currIdx !== -1 && nextIdx !== -1) {
      setDirection(nextIdx > currIdx ? 1 : -1)
      setActiveIndex(nextIdx)
    }

    setPrevShot(shot)
    setShot(newSrc)

    setCross(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCross(true))
    })
    setTimeout(() => setPrevShot(null), 320)
  }


  useEffect(() => {
    let stop = false
    ;(async () => {
      try {
        const r = await fetch('/api/mc/status', { cache: 'no-store' })
        if (!r.ok) throw new Error('status failed')
        const data: McStatus = await r.json()
        if (!stop) setStatus(data)
      } catch {
        if (!stop) setStatus({ online: false })
      }
    })()
    const id = setInterval(() => {
      fetch('/api/mc/status', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setStatus(d))
        .catch(() => {})
    }, 15000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return
    if (sliderPaused) return

    const id = window.setInterval(() => {
      const currentIndex = shots.indexOf(shot)
      const nextIndex = (currentIndex + 1 + shots.length) % shots.length
      changeTo(shots[nextIndex])
    }, 5000)

    return () => window.clearInterval(id)
  }, [shot, sliderPaused, prefersReducedMotion])

  const onlineText = useMemo(() => {
    if (!status) return '—'
    if (!status.online) return 'Offline'
    const c = status.players?.online ?? 0
    const m = status.players?.max ?? 0
    return `${c}/${m}`
  }, [status])

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(SERVER_IP)
      setCopyOk('ok')
      setTimeout(() => setCopyOk('idle'), 2000)
    } catch {
      setCopyOk('err')
      setTimeout(() => setCopyOk('idle'), 2000)
    }
  }

  const teamContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const teamItem: Variants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(8px)', scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  }

  const faqContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  }

  const faqItem: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  }

  return (
    <>
    <Seo {...routesMeta['/']} />
    <div className="min-h-dvh text-slate-100 relative overflow-x-hidden">
     <motion.section
        className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pt-16"
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-stretch">
          <div className="md:flex md:flex-col md:h-full">
            <h1 className="mb-3 text-[22px] md:text-[24px] font-bold leading-tight text-left!">
              Присоединяйся к <span className="text-indigo-400">{SERVER_NAME}!</span>
            </h1>
            <p className="mt-4 text-slate-300 max-w-prose">
              Модифицированный техномагический сервер c упором на строительство и творчество. Без вайпов и с уникальными самописными модами. Добрая администрация и отсутствие гриферов.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-800 max-w-md">
              <div className="px-3 hidden sm:grid place-items-center bg-slate-900/60 border-r border-slate-800 text-xs text-slate-300">IP</div>
              <div className="px-3 font-mono flex-1 truncate flex items-center justify-center text-center backdrop-blur-md backdrop-saturate-150">{SERVER_IP}</div>
                <button
                  onClick={copyIp}
                  className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm grid place-items-center"
                  aria-label={copyOk === 'ok' ? 'Скопировано' : copyOk === 'err' ? 'Ошибка' : 'Копировать IP'}
                  title={copyOk === 'ok' ? 'Скопировано' : copyOk === 'err' ? 'Ошибка' : 'Копировать IP'}
                  type="button"
                >
                  <motion.div
                    animate={
                      copyOk === 'ok'
                        ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                        : copyOk === 'err'
                          ? { x: [-2, 2, -2, 2, 0] }
                          : { scale: 1, rotate: 0, x: 0 }
                    }
                    transition={{ duration: 0.3 }}
                    className="grid place-items-center"
                  >
                    {copyOk === 'ok' ? (
                      <SvgCheck className="size-5" />
                    ) : (
                      <SvgCopy className="size-5" />
                    )}
                  </motion.div>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <Badge label={status?.online ? 'Онлайн' : 'Офлайн'} ok={!!status?.online} />
                <span>Онлайн: <strong className="text-slate-100">{onlineText}</strong></span>
                {status?.version && <span>Версия: <strong className="text-slate-100">{status.version}</strong></span>}
                {typeof status?.tps === 'number' && <span>TPS: <strong className="text-slate-100">{status.tps.toFixed(1)}</strong></span>}
                {typeof status?.latencyMs === 'number' && <span>Пинг: <strong className="text-slate-100">{status.latencyMs}ms</strong></span>}
              </div>

              <div>
                <a href="https://launcher.architech-mc.ru/download/launcher/latest" className="inline-flex rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-center">Скачать лаунчер</a>
              </div>
            </div>
          </div>

        <div className="relative max-w-full overflow-x-hidden"
          onMouseEnter={() => setSliderPaused(true)}
          onMouseLeave={() => setSliderPaused(false)}
          onFocus={() => setSliderPaused(true)}
          onBlur={() => setSliderPaused(false)}>
            <div className="aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
            <div className="relative h-full w-full overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={shot}
                  className="absolute inset-0 h-full w-full"
                  custom={direction}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 40 * direction, scale: 1.02 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -40 * direction, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                >
                  <ResponsiveImage
                    name={toName(shot) as keyof typeof IMAGES}
                    alt="Скриншот мира ArchiTech MC"
                    eager
                    width={1600}
                    height={900}
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 80vw, 1200px"
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <motion.div
            className="mt-3 flex flex-nowrap gap-3 overflow-x-auto overflow-y-visible py-1 -mx-1 px-1 no-scrollbar"
            layout
          >
            {shots.map((_, i) => {
              const idx = (activeIndex + i) % shots.length
              const src = shots[idx]
              const isActive = shot === src

              return (
                <motion.button
                  key={src}
                  layout
                  variants={thumbVariants}
                  animate={isActive ? 'active' : 'inactive'}
                  whileHover={{ scale: 1.05, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={thumbSpring}
                  onClick={() => changeTo(src)}
                  aria-label="Показать скриншот"
                  className={[
                    'flex-none w-16 aspect-square rounded-xl ring-offset-2 ring-offset-slate-950 border',
                    isActive
                      ? 'border-transparent ring-2 ring-indigo-500/40'
                      : 'border-slate-800 ring-0 ring-transparent',
                  ].join(' ')}
                >
                  <ResponsiveImage
                    name={toName(src) as keyof typeof IMAGES}
                    alt=""
                    width={160}
                    height={160}
                    sizes="64px"
                    className="h-full w-full object-cover rounded-xl"
                  />
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      </div>
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        initial={prefersReducedMotion ? undefined : { y: 24 }}
        animate={prefersReducedMotion ? undefined : { y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgMcBlockGrass className="h-5" />Лаунчер</span>}
            text="Автоматическое обновление модов" 
            href="https://launcher.architech-mc.ru/download/launcher/latest"
            button="Скачать"
          />
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgUserPlus className="h-5" />Доступ на сервер</span>}
            text="Получить проходку в Telegram-боте" 
            href={SHOP_URL} 
            button="Перейти" />
          <CardCTA
            title={<span className="inline-flex items-center gap-2"><SvgDiscord className="h-5" />Discord</span>}
            text="Посиделки в голосовых каналах"
            href={DISCORD_URL}
            button="Вступить"
          />
          <CardCTA
            title={<span className="inline-flex items-center gap-2"><SvgTelegram className="h-5" />Telegram</span>}
            text="Новости, уведомления, анонсы"
            href={TELEGRAM_URL}
            button="Подписаться"
          />
        </div>
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView={prefersReducedMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6"
          variants={faqItem}
        >
          Команда проекта
        </motion.h2>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={teamContainer}
        >

        {TEAM.map((p) => {
          const src = avatars[p.name] || AVATAR_FALLBACK
          return (
            <motion.div
              key={p.name}
              variants={teamItem}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative rounded-2xl border border-slate-800 p-4 bg-linear-to-b from-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden will-change-transform"
            >
              <Link to={`/u/${encodeURIComponent(p.name)}`} className="flex items-center gap-3">
                <img
                  src={src}
                  alt={p.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="size-12 rounded-xl object-cover border border-slate-700 bg-slate-800"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    if (!img.src.endsWith(AVATAR_FALLBACK)) img.src = AVATAR_FALLBACK
                  }}
                />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-slate-400">{p.role}</div>
                </div>
              </Link>
            </motion.div>
          )
        })}
        </motion.div>
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView={prefersReducedMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6"
          variants={faqItem}
        >
          FAQ
        </motion.h2>

        <motion.div className="grid gap-3">
          <motion.div variants={faqItem}>
          <Faq q="Как попасть на сервер?" a={<StepsGuide version={status?.version} />} />
          </motion.div>

          <motion.div variants={faqItem}>
          <Faq
            q="Проводятся ли вайпы?"
            a={
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 px-4 py-4 sm:px-5 sm:py-5 group transition">
                <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-indigo-500/40 via-sky-500/60 to-emerald-500/40 opacity-80" />

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 size-9 shrink-0 grid place-items-center rounded-xl bg-indigo-600/20 text-indigo-300">
                    <SvgMcBlockGrass className="h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                      <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5">
                        Сезоны и сохранность мира
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      <b>Вайпы существовали только с 1 по 3 сезон и навсегда отменены с началом четвёртого. </b>
                      Сейчас мир живёт максимально долго, прогресс и постройки никогда не будут обнулены и как-либо затронуты.
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-2 text-[11px] text-slate-300 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <dt className="text-slate-400">Полный вайп</dt>
                    <dd className="font-medium text-slate-100">
                      Никогда не будет проведён
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <dt className="text-slate-400">Текущий сезон</dt>
                    <dd className="font-medium text-slate-100">
                      Только частичные вайпы старых чанков без построек
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <dt className="text-slate-400">Ваши базы</dt>
                    <dd className="font-medium text-slate-100">
                      Не будут затронуты частичными вайпами
                    </dd>
                  </div>
                </dl>
              </div>
            }
            />
            </motion.div>

            <motion.div variants={faqItem}>
            <Faq
              q="Правила?"
              a={
                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 px-4 py-4 sm:px-5 sm:py-5 group transition">
                  <div className="pointer-events-none absolute -top-24 -left-16 h-40 w-40 rounded-full bg-rose-500/12 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -right-20 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />

                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-emerald-500/40 via-sky-500/60 to-indigo-500/40 opacity-80" />

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 size-9 shrink-0 grid place-items-center rounded-xl bg-emerald-600/20 text-emerald-300">
                      <span className="text-sm font-semibold">!</span>
                    </div>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                        <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5">
                          Коротко и по делу
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100">
                        Главная истина: не мешай другим играть
                      </div>
                      <ul className="mt-1 space-y-1 text-sm text-slate-300">
                        <li>— Не ломай чужие постройки и не воруй ресурсы;</li>
                        <li>— Без токсичности, хейта, угроз и спама в чате.</li>
                        <li>— Не используй читы, багоюзы, автокликеры;</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-1">
                      Подробный регламент правил см. на отдельной странице
                    </span>
                    <Link to=
                      {RULES_URL}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition"
                    >
                      Открыть правила
                    </Link>
                  </div>
                </div>
              }
            />
            </motion.div>
            </motion.div>
            </motion.section>
            </div>
            </>
          );
        }

function Badge({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border',
        ok
          ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-700/50 bg-rose-500/10 text-rose-300',
      ].join(' ')}
    >
      <motion.span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: ok ? '#22c55e' : '#ef4444' }}
        aria-hidden
        animate={
          ok
            ? {
                scale: [1, 1.6, 1],
                boxShadow: [
                  '0 0 0 0 rgba(34,197,94,0.6)',
                  '0 0 0 8px rgba(34,197,94,0)',
                  '0 0 0 0 rgba(34,197,94,0)',
                ],
              }
            : { scale: 1, boxShadow: 'none' }
        }
        transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.7 }}
      />
      {label}
    </span>
  )
}

const SHINE_EVERY = 4.5 
const SHINE_DURATION = 0.85

function CardCTA({
  title, text, href, button,
}: { title: React.ReactNode; text: string; href: string; button: string }) {
  const initialDelay = useMemo(() => Math.random() * SHINE_EVERY, [])

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative rounded-2xl border border-slate-800 p-5 bg-linear-to-b from-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden"
    >
    
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/10 to-transparent"
      initial={{ x: '-40%', opacity: 0 }}
      animate={{ x: ['-40%', '160%'], opacity: [0, 1, 0] }}
      transition={{
        duration: SHINE_DURATION,
        ease: 'easeOut',
        delay: initialDelay,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: SHINE_EVERY
      }}
      style={{ willChange: 'transform, opacity' }}
    />

    <div className="font-medium text-lg">{title}</div>
    <div className="text-sm text-slate-300 mt-1 mb-4">{text}</div>
    <a href={href} className="inline-flex rounded-xl px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm">{button}</a>
    </motion.div>
  )
}


function StepsGuide({ version }: { version?: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'err'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(SERVER_IP)
      setCopied('ok'); setTimeout(() => setCopied('idle'), 1500)
    } catch {
      setCopied('err'); setTimeout(() => setCopied('idle'), 1500)
    }
  }

  const spring: Transition = { type: 'spring', stiffness: 380, damping: 26, mass: 0.6 }

  const container: Variants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.06 } }
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98, filter: 'blur(6px)' },
    show:   { opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)', transition: spring }
  }

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-3"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
    >

    <motion.div
      variants={item}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
    >
      
    <motion.span
      aria-hidden
      className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.5 }}
    />

    <div className="p-5">
      <div className="size-10 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-3">
        <SvgUserPlus className="h-5" />
      </div>
      <div className="text-lg font-semibold mb-2">Зарегистрируйтесь на сайте</div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <Link to="/auth/login" className="inline-flex rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500">
          Войти или зарегистрироваться
        </Link>
        <div className="text-xs text-slate-400 mt-3">Потребуется только ваша почта</div>
      </div>
    </div>
    </motion.div>

    <motion.div
      variants={item}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
    >

    <motion.span
      aria-hidden
      className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.6, delay: 0.05 }}
    />

    <div className="p-5">
      <div className="size-10 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-3">
        <SvgTelegram className="h-5" />
      </div>
      <div className="text-lg font-semibold mb-2">Получите доступ</div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <a href={TELEGRAM_URL} className="inline-flex rounded-xl px-4 py-2 bg-sky-600 hover:bg-sky-500">
          Перейти в бота
        </a>
        <div className="text-xs text-slate-400 mt-3">Введите ваш ник на сайте, чтобы получить проходку</div>
      </div>
    </div>
  </motion.div>

  <motion.div
    variants={item}
    whileHover={{ y: -6, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
  >
    
  <motion.span
    aria-hidden
    className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
    initial={{ scaleX: 0 }}
    animate={{ scaleX: 1 }}
    transition={{ duration: 0.6, delay: 0.1 }}
  />

  <div className="p-5">
    <div className="size-10 rounded-xl bg-teal-600/20 grid place-items-center text-teal-300 mb-3">
      <SvgMcBlockGrass className="h-5" />
    </div>
    <div className="text-lg font-semibold mb-2">Зайдите на сервер</div>
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-800">
        <div className="px-3 hidden sm:grid place-items-center bg-slate-900/60 border-r border-slate-800 text-xs text-slate-300">
          IP
        </div>
        <div className="px-3 py-2 font-mono flex-1 truncate flex items-center justify-center text-center">
          {SERVER_IP}
        </div>
        <button
          onClick={copy}
          className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm grid place-items-center"
          aria-label={copied === 'ok' ? 'Скопировано' : copied === 'err' ? 'Ошибка' : 'Копировать IP'}
          title={copied === 'ok' ? 'Скопировано' : copied === 'err' ? 'Ошибка' : 'Копировать IP'}
          type="button"
        >
          <motion.div
            animate={
              copied === 'ok'
                ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                : copied === 'err'
                ? { x: [-2, 2, -2, 2, 0] }
                : { scale: 1, rotate: 0, x: 0 }
            }
            transition={{ duration: 0.3 }}
            className="grid place-items-center"
          >
            {copied === 'ok' ? (
              <SvgCheck className="size-5" />
            ) : (
              <SvgCopy className="size-5" />
            )}
          </motion.div>
        </button>
      </div>
      <div className="text-xs text-slate-400 mt-3 text-center">
        Откройте Minecraft: Java Edition 1.21.1
        {version ? <> версии <b className="text-slate-300">{version}</b></> : null} и вставьте IP
      </div>
    </div>
  </div>
  </motion.div>
  </motion.div>
  )
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md backdrop-saturate-150">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 bg-slate-900/50 hover:bg-slate-900/70 flex items-center justify-between"
      >
        <span className="font-medium">{q}</span>
        <motion.span
          className="text-slate-400 inline-block"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <SvgChevronDown className="size-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-content"
            initial={{ height: 0, opacity: 0, filter: 'blur(6px)' }}
            animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
            exit={{ height: 0, opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 text-sm text-slate-300">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}