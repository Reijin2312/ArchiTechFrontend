import './HomePage.premium.css'
import { HomeQuote } from './HomeQuote'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SERVER_NAME, SERVER_IP, RULES_URL, SHOP_URL, WIKI_URL, LAUNCHER_DOWNLOAD_URL } from '@/shared/constants'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type Variants, type Transition } from 'framer-motion'
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { ResponsiveImage } from '@/shared/ui/image/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SvgUserPlus, SvgSkin, SvgMcBlockGrass, SvgModpack, SvgRoute, SvgLauncher, SvgDownload, SvgShield, SvgGitHub, SvgCheck, SvgCopy, SvgChevronDown, SvgCrown } from '@/shared/ui/image/Icons'
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { TEAM_MEMBERS } from '@/shared/data/team';
import { useTeamAvatars } from '@/shared/hooks/useTeamAvatars';
import { HomeTeam } from './HomeTeam';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { homeTranslations } from '@/shared/i18n/translations';

type McStatus = {
  online: boolean
  version?: string
  motd?: string
  players?: { online: number; max: number; sample?: { name: string }[] }
  latencyMs?: number
  tps?: number
}

const SERVER_STATUS_CACHE_KEY = 'architech-server-status'
const SERVER_STATUS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

type LeaderboardRange = '7d' | '30d' | 'all'

// The historical online chart is temporarily hidden from the landing page.
// Keep its code below for an easy return when it becomes marketing-positive.
// The player counter is temporarily hidden from the hero.
// Keep the complete UI below so it can be restored with one flag.
const ONLINE_COUNTER_ENABLED = false

const NEOFORGE_LOGO_URL = 'https://raw.githubusercontent.com/neoforged/Documentation/main/static/img/logo.svg'

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
  const { language } = useI18n();
  const copy = homeTranslations[language];

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
  // Range switching is temporarily disabled. Keep the previous stateful version
  // here so it can be restored together with the tabs in TopPlayersSection.
  // const [leaderboardRange, setLeaderboardRange] = useState<LeaderboardRange>('7d')
  const leaderboardRange: LeaderboardRange = 'all'
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([])
  const [leaderboardAvatars, setLeaderboardAvatars] = useState<Record<string, string>>({})
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [galleryHover, setGalleryHover] = useState(false)
  // Spring-damped mouse parallax moves the photograph, not the controls or copy.
  const galleryOffsetX = useMotionValue(0)
  const galleryOffsetY = useMotionValue(0)
  const galleryPanX = useSpring(galleryOffsetX, { stiffness: 55, damping: 30, mass: 1.2 })
  const galleryPanY = useSpring(galleryOffsetY, { stiffness: 55, damping: 30, mass: 1.2 })

  function handleHeroPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (disableInteractiveMotion || isMobile || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    galleryOffsetX.set((0.5 - (event.clientX - bounds.left) / bounds.width) * 24)
    galleryOffsetY.set((0.5 - (event.clientY - bounds.top) / bounds.height) * 24)
  }

  function resetGalleryParallax() {
    galleryOffsetX.set(0)
    galleryOffsetY.set(0)
  }
  const shots = useMemo(
    () => [
      '/images/screen10.png',
      '/images/screen13.png',
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
      '/images/screen1.png': { title: copy.shots.screen1[0], subtitle: copy.shots.screen1[1] },
      '/images/screen13.png': { title: copy.shots.screen13[0], subtitle: copy.shots.screen13[1] },
      '/images/screen3.png': { title: copy.shots.screen3[0], subtitle: copy.shots.screen3[1] },
      '/images/screen4.png': { title: copy.shots.screen4[0], subtitle: copy.shots.screen4[1] },
      '/images/screen9.png': { title: copy.shots.screen9[0], subtitle: copy.shots.screen9[1] },
      '/images/screen10.png': { title: copy.shots.screen10[0], subtitle: copy.shots.screen10[1] },
      '/images/screen11.png': { title: copy.shots.screen11[0], subtitle: copy.shots.screen11[1] },
      '/images/screen12.png': { title: copy.shots.screen12[0], subtitle: copy.shots.screen12[1] },
    }),
    [copy],
  )
  const [shot, setShot] = useState(shots[0])
  const activeShotMeta =
    shotMeta[shot] ??
    ({ title: copy.fallbackShot, subtitle: copy.fallbackShotSubtitle } as ShotMeta)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sliderPaused, setSliderPaused] = useState(false)

  const thumbSpring: Transition = {
    type: 'spring',
    stiffness: 240,
    damping: 32,
    mass: 0.72,
  }

  const thumbVariants: Variants = {
    active: {
      scale: 1,
      opacity: 1,
      y: 0,
    },
    inactive: {
      scale: 1,
      opacity: 0.7,
      y: 0,
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

    const nextIdx = shots.indexOf(newSrc)
    if (nextIdx !== -1) setActiveIndex(nextIdx)
    setShot(newSrc)
  }

  function applyStatusPayload(data: any) {
    const nextStatus: McStatus = {
      online: data.online ?? false,
      version: data.version,
      motd: typeof data.motd === 'string' ? data.motd : data.motd?.clean?.[0] || data.motd?.raw?.[0],
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      players: data.online ? {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
        sample: data.players?.list?.map((name: string) => ({ name })) ?? []
      } : undefined
    }

    setStatus(nextStatus)
    try {
      localStorage.setItem(SERVER_STATUS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), status: nextStatus }))
    } catch { /* storage may be disabled */ }
  }

  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    try {
      const cached = JSON.parse(localStorage.getItem(SERVER_STATUS_CACHE_KEY) || 'null')
      if (cached?.status && Date.now() - Number(cached.savedAt) < SERVER_STATUS_CACHE_MAX_AGE_MS) {
        setStatus(cached.status as McStatus)
      }
    } catch { /* ignore an invalid cache */ }

    async function loadStatus() {
      try {
        const r = await fetch('/api/v1/public/server-status', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!r.ok) throw new Error('status failed')
        const data = await r.json()
        if (!stopped) applyStatusPayload(data)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          // Keep the last successful value. A client-side network failure is not proof
          // that the Minecraft server is offline.
        }
      }
    }
    void loadStatus()
    const id = window.setInterval(loadStatus, 15000)
    return () => {
      stopped = true
      controller.abort()
      window.clearInterval(id)
    }
  }, [])

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
    }, 7300)

    return () => window.clearInterval(id)
  }, [shot, sliderPaused, disableInteractiveMotion])

  // Warm the next full-resolution screenshot so the crossfade is not waiting on a cold image.
  // The responsive AVIF variant matches the browser viewport rather than forcing an original PNG.
  useEffect(() => {
    const next = shots[(shots.indexOf(shot) + 1) % shots.length]
    const entry = IMAGES[toName(next)]
    if (!entry) return
    const targetWidth = Math.min(1920, Math.max(640, window.innerWidth * (window.devicePixelRatio || 1)))
    const variant = entry.avif.find(item => item.w >= targetWidth)
    const image = new Image()
    image.src = variant?.path ?? entry.avif[entry.avif.length - 1]?.path ?? entry.original.avif
  }, [shot, shots])

  const onlineText = useMemo(() => {
    if (!status) return "-"
    if (!status.online) return 'Offline'
    const c = status.players?.online ?? 0
    const m = status.players?.max ?? 0
    return `${c} / ${m}`
  }, [status])

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

    <div className="architech-home">
      <WorldAtmosphere reduced={disableInteractiveMotion || isMobile} />
      <section className="at-hero" aria-label={copy.gallery}
        onPointerMove={handleHeroPointerMove} onPointerLeave={resetGalleryParallax} onPointerCancel={resetGalleryParallax}>
        <div className="at-hero-grid">
          <div className="at-hero-copy">
            <div className="at-hero-logo-wrap">
              <picture>
                <source srcSet="/images/logo.webp" type="image/webp" />
                <img className="at-hero-logo" src="/images/logo.png" alt={SERVER_NAME} width={1510} height={370} />
              </picture>
            </div>
            <p className="at-hero-description">{copy.hero}</p>
            <div className="at-hero-action-row flex flex-wrap items-center">
              <a className="at-primary-action" href={LAUNCHER_DOWNLOAD_URL}>
                <SvgDownload className="size-4" /> {copy.downloadLauncher}
              </a>
              <a className="at-source-action" href="https://github.com/Reijin2312/ArchiTech_Launcher"
                target="_blank" rel="noreferrer noopener" aria-label={copy.launcherSourceAria} title={copy.launcherSource}>
                <SvgGitHub className="size-5 shrink-0" aria-hidden="true" />
              </a>
            </div>
            <div className="at-ip-block">
              <div className="px-3 grid place-items-center border-r">IP</div>
              <div className="flex-1 grid place-items-center px-3 font-mono">{SERVER_IP}</div>
              <button type="button" onClick={copyIp} className="px-3 border-l"
                title={copyOk === 'ok' ? copy.copied : copyOk === 'err' ? copy.error : copy.copyIp}
                aria-label={copyOk === 'ok' ? copy.copied : copyOk === 'err' ? copy.error : copy.copyIp}>
                {copyOk === 'ok' ? <SvgCheck className="size-5"/> : <SvgCopy className="size-5"/>}
                <span className="sr-only" aria-live="polite">{copyOk === 'ok' ? copy.copied : copyOk === 'err' ? copy.error : ''}</span>
              </button>
            </div>
            <div className="at-status-row flex flex-wrap items-center">
              <Badge label={status == null ? copy.checking : status.online ? copy.online : copy.offline}
                ok={status == null ? null : status.online} reduceMotion />
              <span className="inline-flex items-center gap-2">
                <img src={NEOFORGE_LOGO_URL} alt="" aria-hidden="true" className="size-5 object-contain" />
                {copy.version}: <strong>1.21.1 NeoForge</strong>
              </span>
              {typeof status?.tps === 'number' && <span>TPS: <strong>{status.tps.toFixed(1)}</strong></span>}
              {typeof status?.latencyMs === 'number' && <span>{copy.ping}: <strong>{status.latencyMs}ms</strong></span>}
              {ONLINE_COUNTER_ENABLED && (
                <div className="relative">
                  <button ref={playersButtonRef} type="button" onClick={() => {
                    if (isMobile) { const box = playersButtonRef.current?.getBoundingClientRect(); if(box) setPlayersListPosition({top:box.top-8}); }
                    setShowPlayersList(v => !v);
                  }} onMouseEnter={() => !isMobile && setShowPlayersList(true)}
                    className="underline underline-offset-4">{copy.players}: {onlineText}</button>
                  {showPlayersList && status?.online && Boolean(status.players?.sample?.length) && (
                    <div className="absolute left-0 top-full z-30 mt-2 max-h-56 w-56 overflow-y-auto border border-stone-600 bg-[#171917] p-3"
                      style={isMobile ? {top:playersListPosition.top,position:'fixed'} : undefined}
                      onMouseLeave={() => setShowPlayersList(false)}>
                      {(status.players?.sample ?? []).map(player => (
                        <Link key={player.name} className="block py-1 text-xs" to={'/u/' + encodeURIComponent(player.name)}>
                          {playerAvatars[player.name] && <img className="mr-2 inline size-5 object-cover" src={playerAvatars[player.name]} alt="" />}
                          {player.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="at-gallery"
            onMouseEnter={() => {setSliderPaused(true);setGalleryHover(true)}}
            onMouseLeave={() => {setSliderPaused(false);setGalleryHover(false)}}
            onFocus={() => {setSliderPaused(true);setGalleryHover(true)}}
            onBlur={event => {if(!event.currentTarget.contains(event.relatedTarget)){setSliderPaused(false);setGalleryHover(false)}}}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
            <div className="at-gallery-frame">
              <AnimatePresence initial={false}>
                <motion.div key={shot} className="at-gallery-slide absolute inset-0"
                  initial={disableInteractiveMotion ? {opacity:0} : {opacity:0,scale:1.018}}
                  animate={{opacity:1,scale:1}}
                  exit={{opacity:0,scale:1}}
                  transition={{duration:disableInteractiveMotion ? .16 : 1.28,ease:[.22,1,.36,1]}}>
                  <motion.div className="at-gallery-pan" style={disableInteractiveMotion || isMobile ? undefined : { x: galleryPanX, y: galleryPanY }}>
                    <ResponsiveImage name={toName(shot) as keyof typeof IMAGES} alt={copy.galleryAlt} eager
                      width={1920} height={1080} sizes="100vw" className="h-full w-full object-cover"/>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
              <motion.div className="at-gallery-caption"
                initial={false} animate={{opacity:galleryHover?1:.94}}
                transition={{duration:.26}}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={shot}
                    initial={disableInteractiveMotion ? {opacity:0} : {opacity:0,y:5}}
                    animate={{opacity:1,y:0}}
                    exit={disableInteractiveMotion ? {opacity:0} : {opacity:0,y:-4}}
                    transition={{duration:disableInteractiveMotion?.12:.33,ease:[.22,1,.36,1]}}>
                    <div className="at-gallery-eyebrow">{copy.gallery} · {String(activeIndex+1).padStart(2,'0')} / {shots.length}</div>
                    <div className="at-gallery-title">{activeShotMeta.title}</div>
                    <div className="at-gallery-subtitle">{activeShotMeta.subtitle}</div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
            <div className="at-gallery-thumbs" onKeyDown={event => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              const nextIndex = (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + shots.length) % shots.length
              changeTo(shots[nextIndex])
              event.currentTarget.querySelectorAll('button')[nextIndex]?.focus()
            }}>
              {shots.map(src => (
                <motion.button type="button" key={src} onClick={() => changeTo(src)}
                  variants={thumbVariants} animate={src===shot?'active':'inactive'}
                  transition={thumbSpring} aria-pressed={src===shot}
                  aria-label={`${copy.showScreenshot}: ${shotMeta[src]?.title ?? ''}`}
                  className={src===shot?'ring-2 ring-stone-200':'opacity-75'}>
                  <ResponsiveImage name={toName(src) as keyof typeof IMAGES} alt=""
                    width={160} height={160} sizes="64px" className="h-full w-full object-cover" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <HomeQuote reduced={disableEntranceMotion} typewriterReduced={reduceMotion} />
      <section className="at-stories">
        <div className="at-stories-inner">
          <ParallaxChapter image="screen9.png" number="01" scene={shotMeta['/images/screen9.png']} reduced={disableInteractiveMotion || isMobile}
            title={copy.cards[0][0]} text={copy.cards[0][1]} href="/about" action={copy.cards[0][2]}/>
          <ParallaxChapter image="screen3.png" number="02" scene={shotMeta['/images/screen3.png']} reduced={disableInteractiveMotion || isMobile}
            title={copy.cards[1][0]} text={copy.cards[1][1]} href={WIKI_URL+'#mods'} action={copy.cards[1][2]}/>
          <ParallaxChapter image="screen12.png" number="03" scene={shotMeta['/images/screen12.png']} reduced={disableInteractiveMotion || isMobile}
            title={copy.cards[2][0]} text={copy.cards[2][1]} href={SHOP_URL} action={copy.cards[2][2]}/>
          <ParallaxChapter image="screen11.png" number="04" scene={shotMeta['/images/screen11.png']} reduced={disableInteractiveMotion || isMobile}
            title={copy.cards[3][0]} text={copy.cards[3][1]} href={LAUNCHER_DOWNLOAD_URL} action={copy.cards[3][2]}/>
        </div>
      </section>
      <section className="at-community">
        <div className="at-container">
          <div className="at-section-heading"><div><span className="at-kicker">ARCHITECH / COMMUNITY</span><h2>{copy.team}</h2></div></div>
          <div className="at-team-editorial"><HomeTeam team={TEAM_MEMBERS} avatars={avatars} disableMotion={disableEntranceMotion}/></div>
        </div>
      </section>
      <section className="at-ranking">
        <div className="at-container at-ranking-layout">
          <div className="at-section-heading"><div><span className="at-kicker">ARCHITECH / COMMUNITY</span><h2>{copy.leaderboard}</h2></div></div>
          <div className="at-rank-editorial">
            <TopPlayersSection players={leaderboardPlayers} avatars={leaderboardAvatars}
              loading={leaderboardLoading} range={leaderboardRange} disableMotion />
          </div>
        </div>
      </section>
      <section className="at-faq">
        <div className="at-container at-faq-layout">
          <div className="at-section-heading">
            <div><span className="at-kicker">ARCHITECH / FAQ</span><h2>{copy.faq}</h2></div>
          </div>
          <div className="at-faq-editorial">
            <motion.section
              className="at-faq-list"
              variants={faqContainer}
              initial={disableEntranceMotion ? undefined : 'hidden'}
              whileInView={disableEntranceMotion ? undefined : 'show'}
              viewport={{ once: true, margin: '-10% 0px' }}
            >
              <motion.div className="at-faq-rows">
                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq icon={<SvgRoute className="size-5" />} q={copy.faqItems.start} a={<StepsGuide />} />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.launcher}
                    icon={<SvgLauncher className="size-5" />}
                    a={<p>{copy.faqItems.launcherAnswer}</p>}
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.safety}
                    icon={<SvgShield className="size-5" />}
                    a={
                      <p>
                        {copy.faqItems.safetyBefore}{' '}
                        <a href="https://github.com/Reijin2312/ArchiTech_Launcher" target="_blank" rel="noreferrer noopener">
                          {copy.faqItems.safetyLink}
                        </a>
                        {copy.faqItems.safetyAfter}
                      </p>
                    }
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.free}
                    icon={<SvgUserPlus className="size-5" />}
                    a={<p>{copy.faqItems.freeAnswer}</p>}
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.license}
                    icon={<SvgShield className="size-5" />}
                    a={<p>{copy.faqItems.licenseAnswer}</p>}
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.mods}
                    icon={<SvgModpack className="size-5" />}
                    a={
                      <p>
                        {copy.faqItems.modsAnswer}{' '}
                        <a href={`${WIKI_URL}#mods`}>{copy.faqItems.modsLink}</a>
                      </p>
                    }
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.skins}
                    icon={<SvgSkin className="size-5" />}
                    a={<p>{copy.faqItems.skinsAnswer}</p>}
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.wipes}
                    icon={<SvgMcBlockGrass className="size-5" />}
                    a={
                      <div className="at-faq-prose">
                        <p><strong>{copy.faqItems.wipesStrong}</strong>{copy.faqItems.wipesAnswer}</p>
                        <p>{copy.faqItems.fullWipe}: {copy.faqItems.never}</p>
                        <p>{copy.faqItems.currentSeason}: {copy.faqItems.partial}</p>
                        <p>{copy.faqItems.bases}: {copy.faqItems.unaffected}</p>
                      </div>
                    }
                  />
                </motion.div>

                <motion.div variants={disableEntranceMotion ? undefined : faqItem}>
                  <Faq
                    q={copy.faqItems.rules}
                    icon={<SvgShield className="size-5" />}
                    a={
                      <div className="at-faq-prose">
                        <p><strong>{copy.faqItems.rulesTruth}</strong></p>
                        <ul>
                          <li>{copy.faqItems.rule1}</li>
                          <li>{copy.faqItems.rule2}</li>
                          <li>{copy.faqItems.rule3}</li>
                        </ul>
                        <p>{copy.faqItems.rulesDetails} <Link to={RULES_URL}>{copy.faqItems.rulesOpen}</Link></p>
                      </div>
                    }
                  />
                </motion.div>
              </motion.div>
            </motion.section>
          </div>
        </div>
      </section>
    </div>

            </>
          );
        }


function WorldAtmosphere({ reduced }: { reduced: boolean }) {
  const { scrollY } = useScroll()
  const rearY = useTransform(scrollY, [0, 3800], [0, -230])
  const frontY = useTransform(scrollY, [0, 3800], [0, 310])
  const rearSmooth = useSpring(rearY, { stiffness: 55, damping: 32 })
  const frontSmooth = useSpring(frontY, { stiffness: 55, damping: 32 })
  return (
    <div className="at-world" aria-hidden="true">
      <div className="at-world-stage">
        <motion.div className="at-world-rear" style={reduced ? undefined : {y:rearSmooth}}/>
        <motion.div className="at-world-front" style={reduced ? undefined : {y:frontSmooth}}/>
        <div className="at-world-wash"/>
      </div>
    </div>
  )
}

const chapterEntrance: Variants = {
  hidden: { opacity: 0, y: 17 },
  visible: { opacity: 1, y: 0, transition: { duration: .74, ease: [.22, 1, .36, 1] } },
}

const chapterSequence: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: .11, delayChildren: .06 } },
}

function ParallaxChapter({image,number,reduced,title,text,href,action,scene}: {
  image: string
  number: string
  reduced: boolean
  title: string
  text: string
  href: string
  action: string
  scene?: ShotMeta
}) {
  const target = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'end start'] })
  const yTarget = useTransform(scrollYProgress, [0, 1], [-64, 64])
  const y = useSpring(yTarget, { stiffness: 68, damping: 32, mass: .7 })

  return (
    <section ref={target} className={'at-chapter at-chapter--' + number}>
      <motion.div className="at-chapter-image" style={reduced ? undefined : { y }}>
        <ResponsiveImage name={image as keyof typeof IMAGES} alt="" width={1920} height={1080}
          sizes="100vw" className="h-full w-full object-cover" />
      </motion.div>
      <div className="at-chapter-shade" aria-hidden="true" />
      <motion.div className="at-chapter-content"
        variants={reduced ? undefined : chapterSequence}
        initial={reduced ? false : 'hidden'}
        whileInView={reduced ? undefined : 'visible'}
        viewport={{ once: true, amount: .3 }}>
        <motion.span className="at-kicker at-chapter-kicker" variants={reduced ? undefined : chapterEntrance}>
          {number} / ARCHITECH
        </motion.span>
        <motion.h2 className="at-chapter-title" variants={reduced ? undefined : chapterEntrance}>{title}</motion.h2>
        <motion.p className="at-chapter-description" variants={reduced ? undefined : chapterEntrance}>{text}</motion.p>
        <motion.a className="at-chapter-link" href={href} variants={reduced ? undefined : chapterEntrance}>
          <span>{action}</span><span className="at-chapter-link-arrow" aria-hidden="true">↗</span>
        </motion.a>
      </motion.div>
      {scene && (
        <div className="at-chapter-scene" aria-hidden="true">
          <span className="at-chapter-scene-index">{number} / 04</span>
          <span className="at-chapter-scene-title">{scene.title}</span>
          <span className="at-chapter-scene-subtitle">{scene.subtitle}</span>
        </div>
      )}
    </section>
  )
}

function Badge({ label, ok, reduceMotion }: { label: string; ok: boolean | null; reduceMotion?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs border',
        ok === true
          ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
          : ok === false
            ? 'border-rose-700/50 bg-rose-500/10 text-rose-300'
            : 'border-slate-700/60 bg-slate-500/10 text-slate-300',
      ].join(' ')}
    >
      <motion.span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: ok === true ? '#22c55e' : ok === false ? '#ef4444' : '#94a3b8' }}
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

function TopPlayersSection({
  players,
  avatars,
  loading,
  range,
  // onRangeChange,
  disableMotion,
}: {
  players: LeaderboardPlayer[]
  avatars: Record<string, string>
  loading: boolean
  range: LeaderboardRange
  // onRangeChange: (range: LeaderboardRange) => void
  disableMotion?: boolean
}) {
  const { language } = useI18n()
  const rangeLabel = range === 'all' ? (language === 'ru' ? 'всё время' : 'all time') : range === '7d' ? '7d' : '30d'
  const leadersPrefix = language === 'ru' ? 'Лидеры по игровому времени за' : 'Playtime leaders for'
  /* Range tabs are temporarily hidden while the leaderboard is fixed to `all`.
  const rangeTabs: Array<{ value: LeaderboardRange; label: string }> = [
    { value: '7d', label: '7\u0434' },
    { value: '30d', label: '30\u0434' },
    { value: 'all', label: '\u0432\u0441\u0451' },
  ]
  const rangePillLayoutId = `leaderboard-range-pill-${useId().replace(/:/g, '')}`
  */

  // Always present five places; missing API results never become fictional users.
  const displayedPlayers = Array.from({ length: 5 }, (_, index) => players[index] ?? null)

  return (
    <div className="border-0 bg-transparent p-0 shadow-none" aria-busy={loading}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-sm text-slate-300 font-arcane uppercase">{leadersPrefix} {rangeLabel}</div>
        {/* Range switch is temporarily disabled.
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
        */}
      </div>

      <div className="space-y-2" aria-live="polite">
        {displayedPlayers.map((player, index) => {
          if (!player) {
            return (
              <div
                key={`vacant-${index + 1}`}
                className="relative overflow-hidden rounded-none border-0 border-b border-[var(--at-line)] bg-transparent px-[5px] py-[23px] shadow-none transition-[background-color] duration-[270ms] hover:bg-[rgba(244,239,230,0.035)]"
                aria-label={language === 'ru' ? `Место ${index + 1}: нет данных` : `Rank ${index + 1}: no data`}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-full w-full p-2.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="3.3" />
                      <path d="M5.5 21v-1.8c0-3.7 2.8-5.8 6.5-5.8s6.5 2.1 6.5 5.8V21" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                      <span className="truncate text-sm font-semibold text-slate-400">—</span>
                    </div>
                    <div className="text-[11px] text-slate-400">—</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold leading-none text-slate-400">—</div>
                    <div className="mt-1 text-[11px] text-slate-400">{language === 'ru' ? 'наиграно' : 'played'}</div>
                  </div>
                </div>
              </div>
            )
          }

            const isKing = index === 0
            const isSilver = index === 1
            const isBronze = index === 2
            const avatar = avatars[player.username]
            const hours = player.totalHours >= 10 ? Math.round(player.totalHours).toString() : player.totalHours.toFixed(1)
            const rankTextTone = (isKing || isBronze) ? 'text-[#d8bf99]' : isSilver ? 'text-slate-200' : 'text-slate-400'
            const nameTone = (isKing || isBronze) ? 'text-[#d8bf99]' : 'text-slate-100'
            const hoursTone = isSilver ? 'text-slate-200' : 'text-[#d8bf99]'

            return (
              <Link
                key={player.username}
                to={`/u/${encodeURIComponent(player.username)}`}
                aria-label={language === 'ru' ? `Открыть профиль ${player.username}` : `Open ${player.username}'s profile`}
                className="block rounded-none border-0 border-b border-[var(--at-line)] bg-transparent shadow-none outline-none"
              >
                <motion.div
                  whileHover={disableMotion ? undefined : { y: -2, scale: 1.005 }}
                  className="relative overflow-hidden rounded-none border-0 border-b border-[var(--at-line)] bg-transparent px-[5px] py-[23px] shadow-none transition-[background-color] duration-[270ms] hover:bg-[rgba(244,239,230,0.035)]"
                >

                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className="relative size-11 shrink-0 overflow-hidden rounded-[8px] border border-[rgba(241,235,222,0.3)] bg-transparent shadow-none"
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
                      {player.activeDays} {language === 'ru' ? 'дн. активности ·' : 'active days ·'} {player.sessions} {language === 'ru' ? 'сессий' : 'sessions'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-semibold leading-none ${hoursTone}`}>
                      {hours}{language === 'ru' ? 'ч' : 'h'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{language === 'ru' ? 'наиграно' : 'played'}</div>
                  </div>
                </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
    </div>
  )
}

function StepsGuide() {
  const { language } = useI18n()
  const copy = homeTranslations[language].steps

  return (
    <ol className="at-faq-steps">
      <li>
        <p>{copy.register}. {copy.registerHint}.</p>
        <Link to="/auth/login">{copy.registerAction}</Link>
      </li>
      <li>
        <p>{copy.launcher}. {copy.launcherHint}.</p>
        <a href={LAUNCHER_DOWNLOAD_URL}>{copy.launcherAction}</a>
      </li>
      <li><p>{copy.join}. {copy.joinHint}</p></li>
    </ol>
  )
}

function Faq({ q, a, icon }: { q: string; a: React.ReactNode; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="at-faq-row">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="at-faq-trigger"
      >
        <span className="at-faq-question">
          {icon && <span className="at-faq-question-icon" aria-hidden="true">{icon}</span>}
          <span>{q}</span>
        </span>
        <motion.span
          className="at-faq-chevron"
          aria-hidden="true"
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
            className="at-faq-panel"
          >
            <div className="at-faq-answer">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
