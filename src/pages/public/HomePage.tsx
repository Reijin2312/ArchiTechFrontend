import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SERVER_NAME, SERVER_IP, DISCORD_URL, TELEGRAM_URL, RULES_URL, SHOP_URL, LAUNCHER_DOWNLOAD_URL } from '@/shared/constants'
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { AnimatePresence, motion, useReducedMotion, type Variants, type Transition, } from 'framer-motion'
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { ResponsiveImage } from '@/shared/ui/image/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SvgTelegram, SvgDiscord, SvgUserPlus, SvgMcBlockGrass, SvgCheck, SvgCopy, SvgChevronDown, SvgCrown } from '@/shared/ui/image/Icons'
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { TEAM_MEMBERS } from '@/shared/data/team';
import { useTeamAvatars } from '@/shared/hooks/useTeamAvatars';
import { TeamGrid } from '@/shared/ui/card/TeamGrid';

type McStatus = {
  online: boolean
  version?: string
  motd?: string
  players?: { online: number; max: number; sample?: { name: string }[] }
  latencyMs?: number
  tps?: number
}

type OnlineHistoryPoint = {
  ts: number
  online: number
  max: number
}

type OnlineRange = '24h' | '7d' | '30d'
type LeaderboardRange = '7d' | '30d' | 'all'

type OnlineTrendResponse = {
  range?: OnlineRange
  from?: string
  to?: string
  bucketMinutes?: number
  points?: Array<{
    ts?: string | number
    online?: number
  }>
  summary?: {
    currentOnline?: number
    peakOnline?: number
    averageOnline?: number
  }
}

type LeaderboardPlayer = {
  rank: number
  username: string
  totalMinutes: number
  totalHours: number
  sessions: number
  activeDays: number
}

type LeaderboardResponse = {
  range?: LeaderboardRange
  from?: string
  to?: string
  limit?: number
  players?: Array<{
    rank?: number
    username?: string
    totalMinutes?: number
    totalHours?: number
    sessions?: number
    activeDays?: number
  }>
}

type ShotMeta = {
  title: string
  subtitle: string
}

export default function HomePage() {
  useWallpaper();

  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const isMobile = useIsMobile();
  const disableEntranceMotion = reduceMotion || isMobile;
  const disableInteractiveMotion = reduceMotion;

  const [status, setStatus] = useState<McStatus | null>(null)
  const [copyOk, setCopyOk] = useState<'idle' | 'ok' | 'err'>('idle')
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({})
  const [showPlayersList, setShowPlayersList] = useState(false)
  const playersButtonRef = useRef<HTMLButtonElement>(null)
  const [playersListPosition, setPlayersListPosition] = useState({ top: 0 })
  const [onlinePoints, setOnlinePoints] = useState<OnlineHistoryPoint[]>([])
  const [onlineRange, setOnlineRange] = useState<OnlineRange>('7d')
  const [leaderboardRange, setLeaderboardRange] = useState<LeaderboardRange>('7d')
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([])
  const [leaderboardAvatars, setLeaderboardAvatars] = useState<Record<string, string>>({})
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [galleryHover, setGalleryHover] = useState(false)
  const shots = useMemo(
    () => [
      '/images/screen10.png',
      '/images/screen2.png',
      '/images/screen9.png',
      '/images/screen4.png',
      '/images/screen11.png',
      '/images/screen1.png',
      '/images/screen3.png',
      '/images/screen12.png',
    ],
    [],
  )
  const shotMeta = useMemo<Record<string, ShotMeta>>(
    () => ({
      '/images/screen1.png': { title: 'Ветрогенераторы', subtitle: 'Построены Hoshimori Inc.' },
      '/images/screen2.png': { title: 'Старый маяк', subtitle: 'Он был здесь до начала времён' },
      '/images/screen3.png': { title: 'Дирижабль', subtitle: 'Так и сгинул, упал в океан... Дирижабль Левиафан' },
      '/images/screen4.png': { title: 'Как это тут оказалось?', subtitle: 'Игрок KIDron позирует на ветрогенераторе' },
      '/images/screen9.png': { title: 'Цитадель Альянса', subtitle: 'По совместительству база игрока Andrej_Dinera' },
      '/images/screen10.png': { title: 'Ходячий замок', subtitle: 'Нестареющая классика' },
      '/images/screen11.png': { title: 'Радиотелескоп', subtitle: 'ОНИ следят за нами...' },
      '/images/screen12.png': { title: 'Портал', subtitle: 'Главный портал спавна в стиле древнего монолита' },
    }),
    [],
  )
  const [shot, setShot] = useState(shots[0])
  const activeShotMeta =
    shotMeta[shot] ??
    ({ title: 'Скриншот ArchiTech', subtitle: 'Момент из жизни сервера' } as ShotMeta)
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
    p
      .split('/')
      .pop()!
      .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
      .replace(/\.(avif|webp)$/i, '.png')

  const swipeState = useRef<{ startX: number; startY: number; deltaX: number; deltaY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    active: false,
  })

  function goRelative(direction: 1 | -1) {
    const currentIndex = shots.indexOf(shot)
    if (currentIndex === -1) return
    const nextIndex = (currentIndex + direction + shots.length) % shots.length
    changeTo(shots[nextIndex])
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      active: true,
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!swipeState.current.active) return
    const touch = e.touches[0]
    swipeState.current.deltaX = touch.clientX - swipeState.current.startX
    swipeState.current.deltaY = touch.clientY - swipeState.current.startY

    if (Math.abs(swipeState.current.deltaX) > Math.abs(swipeState.current.deltaY)) {
      e.preventDefault()
    }
  }

  function handleTouchEnd() {
    if (!swipeState.current.active) return
    const { deltaX, deltaY } = swipeState.current
    swipeState.current.active = false
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goRelative(deltaX < 0 ? 1 : -1)
    }
  }

  function handleTouchCancel() {
    swipeState.current.active = false
  }

  const avatars = useTeamAvatars(TEAM_MEMBERS)

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

  function applyStatusPayload(data: any) {
    const nextStatus: McStatus = {
      online: data.online ?? false,
      version: data.version,
      motd: data.motd?.clean?.[0] || data.motd?.raw?.[0],
      players: data.online ? {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
        sample: data.players?.list?.map((name: string) => ({ name })) ?? []
      } : undefined
    }

    setStatus(nextStatus)
  }

  useEffect(() => {
    let stop = false
    ;(async () => {
      try {
        const r = await fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' })
        if (!r.ok) throw new Error('status failed')
        const data = await r.json()
        if (!stop) applyStatusPayload(data)
      } catch {
        if (!stop) {
          setStatus({ online: false })
        }
      }
    })()
    const id = setInterval(() => {
      fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d) applyStatusPayload(d)
        })
        .catch(() => {
          setStatus((prev) => prev ?? { online: false })
        })
    }, 15000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let stop = false

    async function loadOnlineTrend() {
      try {
        const response = await fetch(`/api/v1/sessions/online-trend?range=${encodeURIComponent(onlineRange)}`, {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('trend failed')

        const data = (await response.json()) as OnlineTrendResponse
        const parsedPoints = (data.points ?? [])
          .map((point) => {
            const tsRaw = point?.ts
            const ts =
              typeof tsRaw === 'number'
                ? tsRaw
                : typeof tsRaw === 'string'
                  ? Date.parse(tsRaw)
                  : Number.NaN
            if (!Number.isFinite(ts)) return null

            const online = Math.max(0, Math.round(Number(point?.online ?? 0)))
            return { ts, online, max: online } as OnlineHistoryPoint
          })
          .filter((point): point is OnlineHistoryPoint => point !== null)
          .sort((a, b) => a.ts - b.ts)
        if (!stop) setOnlinePoints(parsedPoints)
      } catch {
        if (!stop) setOnlinePoints((prev) => prev)
      }
    }

    void loadOnlineTrend()
    const id = window.setInterval(() => void loadOnlineTrend(), 60_000)

    return () => {
      stop = true
      clearInterval(id)
    }
  }, [onlineRange])

  useEffect(() => {
    let stop = false

    async function loadLeaderboard() {
      if (!stop) setLeaderboardLoading(true)

      try {
        const response = await fetch(
          `/api/v1/sessions/leaderboard?range=${encodeURIComponent(leaderboardRange)}&limit=5`,
          { cache: 'no-store' },
        )
        if (!response.ok) throw new Error('leaderboard failed')

        const data = (await response.json()) as LeaderboardResponse
        const parsedPlayers = (data.players ?? [])
          .map((item, index) => {
            const username = (item?.username ?? '').trim()
            if (!username) return null

            const totalMinutes = Math.max(0, Math.round(Number(item?.totalMinutes ?? 0)))
            const totalHours = Number(item?.totalHours ?? totalMinutes / 60)
            const sessions = Math.max(0, Math.round(Number(item?.sessions ?? 0)))
            const activeDays = Math.max(0, Math.round(Number(item?.activeDays ?? 0)))
            const rankRaw = Math.round(Number(item?.rank ?? index + 1))

            return {
              rank: Math.max(1, rankRaw),
              username,
              totalMinutes,
              totalHours: Number.isFinite(totalHours) ? totalHours : totalMinutes / 60,
              sessions,
              activeDays,
            } as LeaderboardPlayer
          })
          .filter((item): item is LeaderboardPlayer => item !== null)

        if (stop) return
        setLeaderboardPlayers(parsedPlayers)

        const avatars: Record<string, string> = {}
        await Promise.all(
          parsedPlayers.map(async (player) => {
            try {
              const profileResponse = await fetch(
                `/api/v1/users/by-name?username=${encodeURIComponent(player.username)}`,
                { cache: 'no-store' },
              )
              if (!profileResponse.ok) return
              const profileData = await profileResponse.json()
              if (typeof profileData?.avatarUrl === 'string' && profileData.avatarUrl) {
                avatars[player.username] = profileData.avatarUrl
              }
            } catch {}
          }),
        )

        if (!stop) setLeaderboardAvatars(avatars)
      } catch {
        if (!stop) {
          setLeaderboardPlayers([])
          setLeaderboardAvatars({})
        }
      } finally {
        if (!stop) setLeaderboardLoading(false)
      }
    }

    void loadLeaderboard()
    const id = window.setInterval(() => void loadLeaderboard(), 120_000)

    return () => {
      stop = true
      clearInterval(id)
    }
  }, [leaderboardRange])

  useEffect(() => {
    if (disableInteractiveMotion) return
    if (sliderPaused) return

    const id = window.setInterval(() => {
      const currentIndex = shots.indexOf(shot)
      const nextIndex = (currentIndex + 1 + shots.length) % shots.length
      changeTo(shots[nextIndex])
    }, 5000)

    return () => window.clearInterval(id)
  }, [shot, sliderPaused, disableInteractiveMotion])

  const onlineText = useMemo(() => {
    if (!status) return "-"
    if (!status.online) return 'Offline'
    const c = status.players?.online ?? 0
    const m = status.players?.max ?? 0
    return `${c} / ${m}`
  }, [status])

  const onlineSeries = useMemo(() => {
    if (onlinePoints.length > 0) return onlinePoints

    return [{
      ts: Date.now(),
      online: status?.players?.online ?? 0,
      max: status?.players?.max ?? 0,
    }]
  }, [onlinePoints, status?.players?.online, status?.players?.max])

  const onlinePeak = useMemo(
    () => onlineSeries.reduce((max, p) => Math.max(max, p.online), 0),
    [onlineSeries]
  )

  const onlineAvg = useMemo(() => {
    if (!onlineSeries.length) return 0
    const sum = onlineSeries.reduce((acc, p) => acc + p.online, 0)
    return Math.round(sum / onlineSeries.length)
  }, [onlineSeries])

  const onlineNow = onlineSeries[onlineSeries.length - 1]?.online ?? status?.players?.online ?? 0

  useEffect(() => {
    const players = status?.players?.sample ?? []
    if (!players.length) {
      setPlayerAvatars({})
      return
    }

    let alive = true
    ;(async () => {
      const avatars: Record<string, string> = {}
      await Promise.all(
        players.map(async (player) => {
          try {
            const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(player.name)}`)
            if (!r.ok) return
            const data = await r.json()
            if (data.avatarUrl && alive) avatars[player.name] = data.avatarUrl
          } catch {}
        }),
      )
      if (alive) setPlayerAvatars(avatars)
    })()

    return () => {
      alive = false
    }
  }, [status?.players?.sample])

  useEffect(() => {
    if (!isMobile) setShowPlayersList(false)
  }, [isMobile])

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
        initial={disableEntranceMotion ? undefined : { opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={disableEntranceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-stretch">
          <div className="md:flex md:flex-col md:h-full">
            <h1 className="mb-3 text-[22px] md:text-[24px] font-bold leading-tight text-left! font-techno text-techno-glow">
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
                <Badge label={status?.online ? 'Онлайн' : 'Офлайн'} ok={!!status?.online} reduceMotion={disableInteractiveMotion} />
                <div
                  className="relative"
                  onMouseEnter={() => !isMobile && setShowPlayersList(true)}
                  onMouseLeave={() => !isMobile && setShowPlayersList(false)}
                >
                  <button
                    ref={playersButtonRef}
                    type="button"
                    onClick={() => {
                      if (isMobile) {
                        const button = playersButtonRef.current
                        if (button) {
                          const rect = button.getBoundingClientRect()
                          setPlayersListPosition({
                            top: rect.top - 8
                          })
                        }
                        setShowPlayersList((v) => !v)
                      }
                    }}
                    className="cursor-pointer bg-transparent border-0 text-sm text-slate-300 p-0 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
                  >
                    Игроки: <strong className="text-slate-100">{onlineText}</strong>
                  </button>
                  <AnimatePresence>
                    {showPlayersList && status?.online && status?.players?.sample && status.players.sample.length > 0 && (
                      <>
                        {isMobile && (
                          <div
                            className="fixed inset-0 z-40 bg-black/20"
                            onClick={() => setShowPlayersList(false)}
                          />
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`${isMobile ? 'fixed right-4' : 'absolute left-0 top-full mt-2'} z-50 ${isMobile ? 'w-[calc(100vw-2rem)] max-w-64' : 'w-64'} rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-xl p-3`}
                          style={isMobile ? {
                            top: `${playersListPosition.top}px`,
                            transform: 'translateY(-100%)'
                          } : undefined}
                        >
                        <div className="text-xs font-semibold text-slate-400 mb-2 px-1 flex items-center justify-between gap-2">
                          <span>Игроки онлайн ({status.players.sample.length})</span>
                          {isMobile && (
                            <button
                              type="button"
                              onClick={() => setShowPlayersList(false)}
                              className="text-slate-400 hover:text-white text-xs"
                            >
                              Закрыть
                            </button>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-1.5">
                          {status.players.sample.map((player) => {
                            const avatar = playerAvatars[player.name]
                            return (
                              <Link
                                key={player.name}
                                to={`/u/${encodeURIComponent(player.name)}`}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors group"
                              >
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt={player.name}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-lg object-cover border border-slate-700"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                                    {player.name[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <span className="text-sm text-slate-200 group-hover:text-slate-100 truncate flex-1">
                                  {player.name}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                {status?.version && <span>Версия: <strong className="text-slate-100">{status.version} Neoforge</strong></span>}
                {typeof status?.tps === 'number' && <span>TPS: <strong className="text-slate-100">{status.tps.toFixed(1)}</strong></span>}
                {typeof status?.latencyMs === 'number' && <span>Пинг: <strong className="text-slate-100">{status.latencyMs}ms</strong></span>}
              </div>

              <div>
                <a href={LAUNCHER_DOWNLOAD_URL} className="inline-flex rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-center">Скачать лаунчер</a>
              </div>
            </div>
          </div>

        <div
          className="relative max-w-full overflow-x-hidden"
          onMouseEnter={() => {
            setSliderPaused(true)
            setGalleryHover(true)
          }}
          onMouseLeave={() => {
            setSliderPaused(false)
            setGalleryHover(false)
          }}
          onFocus={() => {
            setSliderPaused(true)
            setGalleryHover(true)
          }}
          onBlur={() => {
            setSliderPaused(false)
            setGalleryHover(false)
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
            <div className="aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
            <div className="relative h-full w-full overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={shot}
                  className="absolute inset-0 h-full w-full"
                  custom={direction}
                  initial={disableInteractiveMotion ? false : { opacity: 0, x: 40 * direction, scale: 1.02 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={disableInteractiveMotion ? { opacity: 0 } : { opacity: 0, x: -40 * direction, scale: 0.98 }}
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

              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5"
                initial={false}
                animate={galleryHover ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={
                  disableInteractiveMotion
                    ? { duration: 0.12 }
                    : { type: 'spring', stiffness: 280, damping: 28, mass: 0.65 }
                }
              >
                <div className="w-fit max-w-[90%] rounded-xl border border-slate-700/80 bg-slate-950/75 px-4 py-2.5 backdrop-blur-md shadow-[0_10px_30px_rgba(2,6,23,0.62)]">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-indigo-300/95">Галерея</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{activeShotMeta.title}</div>
                  <div className="text-xs text-slate-300">{activeShotMeta.subtitle}</div>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            className="mt-3 flex flex-nowrap gap-3 overflow-x-auto overflow-y-visible py-1 -mx-1 px-2 no-scrollbar"
            layout
          >
            {shots.map((_, i) => {
              const idx = (activeIndex + i) % shots.length
              const src = shots[idx]
              const isActive = shot === src
              const thumbMeta = shotMeta[src]

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
                    'group relative flex-none w-16 aspect-square rounded-xl ring-offset-2 ring-offset-slate-950 border',
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
                  <span className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-[118%] whitespace-nowrap rounded-lg border border-slate-700/85 bg-slate-950/95 px-2 py-1 text-[10px] font-medium text-slate-100 opacity-0 shadow-xl transition-all duration-200 group-hover:-translate-y-[130%] group-hover:opacity-100 group-focus-visible:-translate-y-[130%] group-focus-visible:opacity-100 md:block">
                    {thumbMeta?.title ?? 'Скриншот'}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      </div>
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        initial={disableEntranceMotion ? undefined : { y: 24 }}
        animate={disableEntranceMotion ? undefined : { y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgMcBlockGrass className="h-5" />Лаунчер</span>}
            text="Автоматическое обновление модов" 
            href={LAUNCHER_DOWNLOAD_URL}
            button="Скачать"
            reduceMotion={disableInteractiveMotion}
          />
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgUserPlus className="h-5" />Доступ на сервер</span>}
            text="Получить проходку в Telegram-боте" 
            href={SHOP_URL} 
            button="Перейти"
            reduceMotion={disableInteractiveMotion}
          />
          <CardCTA
            title={<span className="inline-flex items-center gap-2"><SvgDiscord className="h-5" />Discord</span>}
            text="Посиделки в голосовых каналах"
            href={DISCORD_URL}
            button="Вступить"
            reduceMotion={disableInteractiveMotion}
          />
          <CardCTA
            title={<span className="inline-flex items-center gap-2"><SvgTelegram className="h-5" />Telegram</span>}
            text="Новости, уведомления, анонсы"
            href={TELEGRAM_URL}
            button="Подписаться"
            reduceMotion={disableInteractiveMotion}
          />
        </div>
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={disableEntranceMotion ? undefined : 'hidden'}
        whileInView={disableEntranceMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6 font-techno"
          variants={disableEntranceMotion ? undefined : faqItem}
        >
          Команда проекта
        </motion.h2>

        <TeamGrid team={TEAM_MEMBERS} avatars={avatars} disableMotion={disableEntranceMotion} />
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={disableEntranceMotion ? undefined : 'hidden'}
        whileInView={disableEntranceMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6 font-techno"
          variants={disableEntranceMotion ? undefined : faqItem}
        >
          {'\u0422\u043e\u043f \u0438\u0433\u0440\u043e\u043a\u043e\u0432'}
        </motion.h2>

        <TopPlayersSection
          players={leaderboardPlayers}
          avatars={leaderboardAvatars}
          loading={leaderboardLoading}
          range={leaderboardRange}
          onRangeChange={setLeaderboardRange}
          disableMotion={disableInteractiveMotion}
        />
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={disableEntranceMotion ? undefined : 'hidden'}
        whileInView={disableEntranceMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6 font-techno"
          variants={disableEntranceMotion ? undefined : faqItem}
        >
          Онлайн сервера
        </motion.h2>

        <OnlineTrendSection
          points={onlineSeries}
          range={onlineRange}
          onRangeChange={setOnlineRange}
          current={onlineNow}
          peak={onlinePeak}
          average={onlineAvg}
          disableMotion={disableInteractiveMotion}
        />
      </motion.section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-10"
        variants={faqContainer}
        initial={disableEntranceMotion ? undefined : 'hidden'}
        whileInView={disableEntranceMotion ? undefined : 'show'}
        viewport={{ once: true, margin: '-10% 0px' }}
      >
        <motion.h2
          className="text-2xl font-semibold mb-6 font-techno"
          variants={disableEntranceMotion ? undefined : faqItem}
        >
          FAQ
        </motion.h2>

        <motion.div className="grid gap-3">
          <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
          <Faq q="Как попасть на сервер?" a={<StepsGuide version={status?.version} disableMotion={disableEntranceMotion} />} />
          </motion.div>

          <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
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

            <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
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

function Badge({ label, ok, reduceMotion }: { label: string; ok?: boolean; reduceMotion?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs border',
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
          reduceMotion || !ok
            ? { scale: 1, boxShadow: 'none' }
            : {
                scale: [1, 1.6, 1],
                boxShadow: [
                  '0 0 0 0 rgba(34,197,94,0.6)',
                  '0 0 0 8px rgba(34,197,94,0)',
                  '0 0 0 0 rgba(34,197,94,0)',
                ],
              }
        }
        transition={reduceMotion ? undefined : { duration: 1.3, repeat: Infinity, repeatDelay: 0.7 }}
      />
      {label}
    </span>
  )
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i]
    path += ` L ${current.x} ${current.y}`
  }
  return path
}

function OnlineTrendSection({
  points,
  range,
  onRangeChange,
  current,
  peak,
  average,
  disableMotion,
}: {
  points: OnlineHistoryPoint[]
  range: OnlineRange
  onRangeChange: (range: OnlineRange) => void
  current: number
  peak: number
  average: number
  disableMotion?: boolean
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const gradientScopeId = useId().replace(/:/g, '')
  const areaGradientId = `online-area-gradient-${gradientScopeId}`
  const lineShineGradientId = `online-line-shine-gradient-${gradientScopeId}`

  const chart = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.ts - b.ts)
    const safe = sorted.length ? sorted : [{ ts: Date.now(), online: 0, max: 0 }]

    const width = 960
    const height = 280
    const padX = 26
    const padY = 18

    const minTs = safe[0].ts
    const maxTs = safe[safe.length - 1].ts
    const tsSpan = Math.max(1, maxTs - minTs)
    const maxOnline = Math.max(10, ...safe.map((p) => p.online), ...safe.map((p) => p.max))

    const toX = (ts: number) => padX + ((ts - minTs) / tsSpan) * (width - padX * 2)
    const toY = (value: number) => height - padY - (value / maxOnline) * (height - padY * 2)

    const linePoints = safe.map((p) => ({ x: toX(p.ts), y: toY(p.online), ts: p.ts, online: p.online }))
    const linePath = buildSmoothSvgPath(linePoints)

    const first = linePoints[0]
    const last = linePoints[linePoints.length - 1]
    const areaPath = `${linePath} L ${last.x} ${height - padY} L ${first.x} ${height - padY} Z`

    const tickValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxOnline * ratio))

    const formatTs = (ts: number) =>
      range === '24h'
        ? new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

    const midTs = minTs + tsSpan / 2

    return {
      width,
      height,
      padX,
      padY,
      linePath,
      areaPath,
      linePoints,
      tickValues,
      maxOnline,
      labels: {
        start: formatTs(minTs),
        mid: formatTs(midTs),
        end: formatTs(maxTs),
      },
    }
  }, [points, range])

  useEffect(() => {
    setHoverIndex(null)
  }, [range, chart.linePoints.length])

  const hoveredPoint =
    hoverIndex == null || chart.linePoints.length === 0
      ? null
      : chart.linePoints[Math.min(Math.max(hoverIndex, 0), chart.linePoints.length - 1)]

  const hoveredMeta = useMemo(() => {
    if (!hoveredPoint) return null

    const tooltipWidth = 168
    const tooltipHeight = 48
    const x = Math.min(
      chart.width - chart.padX - tooltipWidth,
      Math.max(chart.padX, hoveredPoint.x - tooltipWidth / 2),
    )
    const y = Math.max(chart.padY, hoveredPoint.y - tooltipHeight - 10)

    const timeText =
      range === '24h'
        ? new Date(hoveredPoint.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : new Date(hoveredPoint.ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

    return {
      x,
      y,
      timeText,
      valueText: `\u041e\u043d\u043b\u0430\u0439\u043d: ${hoveredPoint.online}`,
    }
  }, [chart.padX, chart.padY, chart.width, hoveredPoint, range])

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!chart.linePoints.length) return

    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return

    const point = svg.createSVGPoint()
    point.x = e.clientX
    point.y = e.clientY
    const local = point.matrixTransform(ctm.inverse())
    const localX = Math.min(chart.width, Math.max(0, local.x))

    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < chart.linePoints.length; i += 1) {
      const d = Math.abs(chart.linePoints[i].x - localX)
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = i
      }
    }
    setHoverIndex(bestIndex)
  }

  const rangeTitle =
    range === '24h'
      ? '\u0437\u0430 24 \u0447\u0430\u0441\u0430'
      : range === '7d'
        ? '\u0437\u0430 7 \u0434\u043d\u0435\u0439'
        : '\u0437\u0430 30 \u0434\u043d\u0435\u0439'

  const rangeTabs: Array<{ value: OnlineRange; label: string }> = [
    { value: '24h', label: '24\u0447' },
    { value: '7d', label: '7\u0434' },
    { value: '30d', label: '30\u0434' },
  ]

  const rangePillLayoutId = `online-range-pill-${gradientScopeId}`

  return (
    <div className="rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-200 font-arcane uppercase">
          {'\u0414\u0438\u043d\u0430\u043c\u0438\u043a\u0430'} {rangeTitle}
        </div>
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-1">
          {rangeTabs.map((tab) => {
            const active = range === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onRangeChange(tab.value)}
                className="relative rounded-lg px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
              >
                {active && (
                  <motion.span
                    layoutId={rangePillLayoutId}
                    transition={
                      disableMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }
                    }
                    className="absolute inset-0 rounded-lg bg-indigo-600 shadow-[0_6px_18px_rgba(99,102,241,0.4)]"
                  />
                )}
                <span className={`relative z-10 ${active ? 'text-white' : 'text-slate-300'}`}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Сейчас" value={current} accent="text-emerald-300" />
        <MetricCard label="Пик" value={peak} accent="text-sky-300" />
        <MetricCard label="Средний" value={average} accent="text-indigo-300" />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-64 w-full"
          role="img"
          aria-label="График онлайна сервера"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
            {!disableMotion && (
              <linearGradient
                id={lineShineGradientId}
                gradientUnits="userSpaceOnUse"
                x1={-chart.width}
                y1={0}
                x2={0}
                y2={0}
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="44%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.95" />
                <stop offset="56%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                <animate attributeName="x1" from={-chart.width} to={chart.width} dur="3.4s" repeatCount="indefinite" />
                <animate attributeName="x2" from={0} to={chart.width * 2} dur="3.4s" repeatCount="indefinite" />
              </linearGradient>
            )}
          </defs>

          {chart.tickValues.map((tick) => {
            const y = chart.height - chart.padY - (tick / chart.maxOnline) * (chart.height - chart.padY * 2)
            return (
              <g key={`tick-${tick}`}>
                <line x1={chart.padX} y1={y} x2={chart.width - chart.padX} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
                <text x={chart.padX - 8} y={y + 4} textAnchor="end" fill="rgba(148,163,184,0.8)" fontSize="11">
                  {tick}
                </text>
              </g>
            )
          })}

          <path d={chart.areaPath} fill={`url(#${areaGradientId})`} />
          <path
            d={chart.linePath}
            fill="none"
            stroke="#818cf8"
            strokeWidth="3"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            style={disableMotion ? undefined : { filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.45))' }}
          />
          {!disableMotion && (
            <path
              d={chart.linePath}
              fill="none"
              stroke={`url(#${lineShineGradientId})`}
              strokeWidth="4.5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              pointerEvents="none"
              style={{ filter: 'drop-shadow(0 0 12px rgba(199,210,254,0.55))' }}
            />
          )}

          {hoveredPoint && (
            <g pointerEvents="none">
              <line
                x1={hoveredPoint.x}
                y1={chart.padY}
                x2={hoveredPoint.x}
                y2={chart.height - chart.padY}
                stroke="rgba(129,140,248,0.45)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
            </g>
          )}

          {chart.linePoints.length > 0 && !hoveredPoint && (
            <circle
              cx={chart.linePoints[chart.linePoints.length - 1].x}
              cy={chart.linePoints[chart.linePoints.length - 1].y}
              r="5"
              fill="#a5b4fc"
            />
          )}

          {hoveredPoint && hoveredMeta && (
            <g pointerEvents="none">
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5.5" fill="#a5b4fc" />
              <g transform={`translate(${hoveredMeta.x}, ${hoveredMeta.y})`}>
                <rect width="168" height="48" rx="8" fill="rgba(2,6,23,0.94)" stroke="rgba(99,102,241,0.55)" />
                <text x="10" y="18" fill="rgba(226,232,240,0.95)" fontSize="11" fontWeight="600">
                  {hoveredMeta.timeText}
                </text>
                <text x="10" y="34" fill="rgba(148,163,184,0.95)" fontSize="11">
                  {hoveredMeta.valueText}
                </text>
              </g>
            </g>
          )}

          <text x={chart.padX} y={chart.height - 2} fill="rgba(148,163,184,0.75)" fontSize="11">
            {chart.labels.start}
          </text>
          <text x={chart.width / 2} y={chart.height - 2} textAnchor="middle" fill="rgba(148,163,184,0.75)" fontSize="11">
            {chart.labels.mid}
          </text>
          <text x={chart.width - chart.padX} y={chart.height - 2} textAnchor="end" fill="rgba(148,163,184,0.75)" fontSize="11">
            {chart.labels.end}
          </text>
        </svg>
      </div>
    </div>
  )
}

function TopPlayersSection({
  players,
  avatars,
  loading,
  range,
  onRangeChange,
  disableMotion,
}: {
  players: LeaderboardPlayer[]
  avatars: Record<string, string>
  loading: boolean
  range: LeaderboardRange
  onRangeChange: (range: LeaderboardRange) => void
  disableMotion?: boolean
}) {
  const rangeLabel = range === 'all' ? '\u0432\u0441\u0451 \u0432\u0440\u0435\u043c\u044f' : range === '7d' ? '7\u0434' : '30\u0434'
  const rangeTabs: Array<{ value: LeaderboardRange; label: string }> = [
    { value: '7d', label: '7\u0434' },
    { value: '30d', label: '30\u0434' },
    { value: 'all', label: '\u0432\u0441\u0451' },
  ]
  const rangePillLayoutId = `leaderboard-range-pill-${useId().replace(/:/g, '')}`

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="text-sm text-slate-300 font-arcane uppercase">{'\u041b\u0438\u0434\u0435\u0440\u044b \u043f\u043e \u0438\u0433\u0440\u043e\u0432\u043e\u043c\u0443 \u0432\u0440\u0435\u043c\u0435\u043d\u0438 \u0437\u0430'} {rangeLabel}</div>
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-1">
            {rangeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onRangeChange(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  range === tab.value ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-sm text-slate-300 font-arcane uppercase">{'\u041b\u0438\u0434\u0435\u0440\u044b \u043f\u043e \u0438\u0433\u0440\u043e\u0432\u043e\u043c\u0443 \u0432\u0440\u0435\u043c\u0435\u043d\u0438 \u0437\u0430'} {rangeLabel}</div>
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-1">
          {rangeTabs.map((tab) => {
            const active = range === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onRangeChange(tab.value)}
                className="relative rounded-lg px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
              >
                {active && (
                  <motion.span
                    layoutId={rangePillLayoutId}
                    transition={
                      disableMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }
                    }
                    className="absolute inset-0 rounded-lg bg-indigo-600 shadow-[0_6px_18px_rgba(99,102,241,0.4)]"
                  />
                )}
                <span className={`relative z-10 ${active ? 'text-white' : 'text-slate-300'}`}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
          {'\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u0440\u0435\u0439\u0442\u0438\u043d\u0433\u0430.'}
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player, index) => {
            const isKing = index === 0
            const isSilver = index === 1
            const isBronze = index === 2
            const isTopThree = index < 3
            const avatar = avatars[player.username]
            const hours = player.totalHours >= 10 ? Math.round(player.totalHours).toString() : player.totalHours.toFixed(1)
            const cardTone = isKing
              ? 'border-amber-300/70 bg-linear-to-r from-amber-500/20 via-slate-900/84 to-slate-900/92 shadow-[0_0_22px_rgba(251,191,36,0.5)]'
              : isSilver
                ? 'border-slate-200/65 bg-linear-to-r from-slate-200/14 via-slate-900/88 to-slate-900/92 shadow-[0_0_20px_rgba(226,232,240,0.38)]'
                : isBronze
                  ? 'border-orange-300/65 bg-linear-to-r from-orange-500/16 via-slate-900/88 to-slate-900/92 shadow-[0_0_20px_rgba(251,146,60,0.35)]'
                  : 'border-slate-800 bg-slate-950/60'
            const rankTextTone = isKing
              ? 'text-amber-200'
              : isSilver
                ? 'text-slate-200'
                : isBronze
                  ? 'text-orange-200'
                  : 'text-slate-400'
            const nameTone = isKing
              ? 'text-amber-100'
              : isSilver
                ? 'text-slate-100'
                : isBronze
                  ? 'text-orange-100'
                  : 'text-slate-100'
            const hoursTone = isKing
              ? 'text-amber-200'
              : isSilver
                ? 'text-slate-200'
                : isBronze
                  ? 'text-orange-300'
                  : 'text-sky-300'
            const avatarTone = isKing
              ? 'border-amber-300/70 ring-2 ring-amber-300/40'
              : isSilver
                ? 'border-slate-300/65 ring-2 ring-slate-300/30'
                : isBronze
                  ? 'border-orange-300/70 ring-2 ring-orange-300/30'
                  : 'border-slate-700'
            const glowShadowMin = isKing
              ? '0 0 0 1px rgba(251,191,36,0.54), 0 0 20px rgba(251,191,36,0.42), inset 0 0 11px rgba(251,191,36,0.18)'
              : isSilver
                ? '0 0 0 1px rgba(226,232,240,0.45), 0 0 18px rgba(226,232,240,0.32), inset 0 0 9px rgba(226,232,240,0.16)'
                : '0 0 0 1px rgba(251,146,60,0.44), 0 0 18px rgba(251,146,60,0.3), inset 0 0 9px rgba(251,146,60,0.15)'
            const glowShadowMax = isKing
              ? '0 0 0 1px rgba(251,191,36,0.76), 0 0 30px rgba(251,191,36,0.68), inset 0 0 16px rgba(251,191,36,0.26)'
              : isSilver
                ? '0 0 0 1px rgba(226,232,240,0.68), 0 0 26px rgba(226,232,240,0.5), inset 0 0 14px rgba(226,232,240,0.24)'
                : '0 0 0 1px rgba(251,146,60,0.68), 0 0 26px rgba(251,146,60,0.48), inset 0 0 14px rgba(251,146,60,0.22)'
            const glowOrbTone = isKing ? 'bg-amber-200/42' : isSilver ? 'bg-slate-100/38' : 'bg-orange-200/40'

            return (
              <motion.div
                key={player.username}
                whileHover={disableMotion ? undefined : { y: -2, scale: 1.005 }}
                className={[
                  'relative overflow-hidden rounded-xl border px-3 py-2.5',
                  cardTone,
                ].join(' ')}
              >
                {isTopThree && !disableMotion && (
                  <>
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-xl mix-blend-screen"
                      animate={{
                        boxShadow: [glowShadowMin, glowShadowMax, glowShadowMin],
                        opacity: [0.48, 0.86, 0.48],
                      }}
                      transition={{ duration: 2.8 + index * 0.35, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className={`pointer-events-none absolute -top-10 left-0 h-28 w-28 rounded-full blur-3xl mix-blend-screen ${glowOrbTone}`}
                      animate={{
                        x: ['-30%', '320%', '0%'],
                        y: [0, 8, 0],
                        opacity: [0.28, 0.72, 0.28],
                      }}
                      transition={{ duration: 4.1 + index * 0.45, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className={[
                      'relative size-11 shrink-0 overflow-hidden rounded-xl border bg-slate-900',
                      avatarTone,
                    ].join(' ')}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={player.username}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-300">
                        {player.username[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}

                    {isKing && (
                      <div className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-amber-300/70 bg-amber-400/90 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.65)]">
                        <SvgCrown className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${rankTextTone}`}>
                        #{player.rank}
                      </span>
                      <span className={`truncate text-sm font-semibold ${nameTone}`}>
                        {player.username}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {player.activeDays} {'\u0434\u043d. \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u00b7'} {player.sessions} {'\u0441\u0435\u0441\u0441\u0438\u0439'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-semibold leading-none ${hoursTone}`}>
                      {hours}ч
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{'\u043d\u0430\u0438\u0433\u0440\u0430\u043d\u043e'}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={`text-xl font-semibold ${accent}`}>{value}</div>
    </div>
  )
}

const SHINE_EVERY = 4.5 
const SHINE_DURATION = 0.85

function CardCTA({
  title, text, href, button, reduceMotion,
}: { title: React.ReactNode; text: string; href: string; button: string; reduceMotion?: boolean }) {
  const initialDelay = useMemo(() => Math.random() * SHINE_EVERY, [])

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative rounded-2xl border border-slate-800 p-5 bg-linear-to-b from-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden"
    >
    
    {!reduceMotion && (
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
    )}

    <div className="font-medium text-lg">{title}</div>
    <div className="text-sm text-slate-300 mt-1 mb-4">{text}</div>
    <a href={href} className="inline-flex rounded-xl px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm">{button}</a>
    </motion.div>
  )
}


function StepsGuide({ version, disableMotion }: { version?: string; disableMotion?: boolean }) {
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
      variants={disableMotion ? undefined : container}
      initial={disableMotion ? undefined : 'hidden'}
      whileInView={disableMotion ? undefined : 'show'}
      viewport={disableMotion ? undefined : { once: true, margin: '-10% 0px' }}
    >

    <motion.div
      variants={disableMotion ? undefined : item}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
    >
      
    <motion.span
      aria-hidden
      className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
      initial={disableMotion ? undefined : { scaleX: 0 }}
      animate={disableMotion ? undefined : { scaleX: 1 }}
      transition={disableMotion ? undefined : { duration: 0.5 }}
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
      variants={disableMotion ? undefined : item}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
    >

    <motion.span
      aria-hidden
      className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
      initial={disableMotion ? undefined : { scaleX: 0 }}
      animate={disableMotion ? undefined : { scaleX: 1 }}
      transition={disableMotion ? undefined : { duration: 0.6, delay: 0.05 }}
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
    variants={disableMotion ? undefined : item}
    whileHover={{ y: -6, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    className="relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform"
  >
    
  <motion.span
    aria-hidden
    className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left"
    initial={disableMotion ? undefined : { scaleX: 0 }}
    animate={disableMotion ? undefined : { scaleX: 1 }}
    transition={disableMotion ? undefined : { duration: 0.6, delay: 0.1 }}
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
        Откройте Minecraft: Java Edition
        {version ? <> <b className="text-slate-300">{version}</b></> : null} и вставьте IP
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

