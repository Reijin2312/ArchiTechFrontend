import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authStore } from '@/shared/store/auth'

const SERVER_NAME = 'ArchiTech MC'
const SERVER_IP = 'play.architech.gg'
const DISCORD_URL = 'https://discord.gg/your-invite'
const TELEGRAM_URL = 'https://t.me/archi_tech_official'
const MAP_URL = '/map'
const RULES_URL = '/rules'
const SHOP_URL = '/shop'
const WIKI_URL = '/wiki'
const MODPACK_URL = '/modpack'
const PROFILE_URL = '/profile'

type McStatus = {
  online: boolean
  version?: string
  motd?: string
  players?: { online: number; max: number; sample?: { name: string }[] }
  latencyMs?: number
  tps?: number
}

export default function HomePage() {
  const [status, setStatus] = useState<McStatus | null>(null)
  const [copyOk, setCopyOk] = useState<'idle' | 'ok' | 'err'>('idle')
  const shots = ['/images/screen1.png','/images/screen2.png','/images/screen3.png']
  const [shot, setShot] = useState(shots[0])
  const [prevShot, setPrevShot] = useState<string | null>(null)
  const [cross, setCross] = useState(false)

  function changeTo(newSrc: string) {
   if (newSrc === shot) return
    setPrevShot(shot)
    setShot(newSrc)
    setCross(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCross(true))
    })
    setTimeout(() => setPrevShot(null), 320)
  }

  const user = authStore(s => s.user)
  const { pathname, search } = useLocation()
  const next = encodeURIComponent(pathname + search)

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
    const id = setInterval(() => {
      const next = shots[(shots.indexOf(shot) + 1) % shots.length]
      changeTo(next)
    }, 5000)
    return () => clearInterval(id)
  }, [shot])


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

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 relative">
      {/* Фон */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
          }}
        />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pt-16">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Присоединяйся к <span className="text-indigo-400">{SERVER_NAME}!</span>
            </h1>
            <p className="mt-4 text-slate-300 max-w-prose">
              Модифицированный техномагический сервер c упором на строительство и творчество. Без вайпов и с уникальными самописными модами. Добрая администрация и отсутствие гриферов.
            </p>

            {/* IP + статус + кнопка скачивания */}
            <div className="mt-6 grid gap-3">
              <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-800 max-w-md">
              <div className="px-3 hidden sm:grid place-items-center bg-slate-900/60 border-r border-slate-800 text-xs text-slate-300">IP</div>
              <div className="px-3 font-mono flex-1 truncate flex items-center justify-center text-center">{SERVER_IP}</div>
              <button onClick={copyIp} className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm">
                {copyOk === 'ok' ? 'Скопировано' : copyOk === 'err' ? 'Ошибка' : 'Копировать'}
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
                <a href={MODPACK_URL} className="inline-flex rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-center">Скачать лаунчер</a>
              </div>
            </div>
          </div>

          {/* Галерея */}
          <div className="relative">
            <div className="aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
              <div className="relative h-full w-full">
              {/* текущий кадр (сверху), с плавным появлением */}
              <img
                key={shot}
                src={shot}
                alt="screenshot"
                className={
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " +
                  (cross ? "opacity-100" : "opacity-0")
                }
              />
              {/* предыдущий кадр (снизу), с плавным исчезновением */}
              {prevShot && (
                <img
                  key={prevShot + "-prev"}
                  src={prevShot}
                  alt=""
                  aria-hidden
                  className={
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " +
                    (cross ? "opacity-0" : "opacity-100")
                  }
                />
              )}
            </div>
            </div>
            <div className="mt-3 flex gap-3">
            {shots.map((src) => (
              <button
                key={src}
                onClick={() => changeTo(src)}
                aria-label="Показать скриншот"
                className={[
                  'size-16 rounded-xl overflow-hidden border',
                  shot === src ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-slate-800'
                ].join(' ')}
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
              </button>
            ))}
          </div>
          </div>
        </div>
      </section>

      
      {/* Витрина / CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CardCTA title="Лайв-карта" text="Следи за миром в реальном времени" href={MAP_URL} button="Открыть карту" />
          <CardCTA title="Покупка проходки" text="Приобрести доступ на сервер" href={SHOP_URL} button="Перейти" />
          <CardCTA title="Discord" text="Чат, анонсы, тикеты" href={DISCORD_URL} button="Вступить" />
          <CardCTA title="Telegram" text="Новости, уведомления, наборы" href={TELEGRAM_URL} button="Подписаться" />
        </div>
      </section>

      {/* Команда */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl font-semibold mb-6">Команда проекта</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Raijin', role: 'Owner' },
            { name: 'Alex', role: 'Admin' },
            { name: 'Mira', role: 'Moderator' },
            { name: 'Fox', role: 'Builder' }
          ].map(p => (
            <div key={p.name} className="rounded-2xl border border-slate-800 p-4 bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-slate-800 grid place-items-center">🧑‍💻</div>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-slate-400">{p.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
        <div className="grid gap-3">
          <Faq q="Как попасть на сервер?" a={<StepsGuide version={status?.version} />} />
          <Faq q="Проводятся ли вайпы?" a="Вайпы существовали только с 1 по 3 сезон. Навсегда отменены с началом четвёртого. Вы можете не бояться потерять свой прогресс и постройки." />
          <Faq q="Правила?" a={<span>Коротко и без воды — <a className='underline' href={RULES_URL}>читай тут</a>.</span>} />
        </div>
      </section>
    </div>
  )
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
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: ok ? '#22c55e' : '#ef4444' }}
      />
      {label}
    </span>
  )
}

function Feature({ title, text, icon }: { title: string; text: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900/40">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-slate-300">{text}</div>
    </div>
  )
}

function CardCTA({ title, text, href, button }: { title: string; text: string; href: string; button: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 p-5 bg-linear-to-b from-slate-900/60 to-slate-900/20">
      <div className="font-medium text-lg">{title}</div>
      <div className="text-sm text-slate-300 mt-1 mb-4">{text}</div>
      <a href={href} className="inline-flex rounded-xl px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm">{button}</a>
    </div>
  )
}

function StepsGuide({ version }: { version?: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'err'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(SERVER_IP)
      setCopied('ok')
      setTimeout(() => setCopied('idle'), 1500)
    } catch {
      setCopied('err')
      setTimeout(() => setCopied('idle'), 1500)
    }
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Шаг 1 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-5">
          <div className="size-10 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-3">👤</div>
          <div className="text-lg font-semibold mb-2">Зарегистрируйтесь на сайте</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <Link to="/auth/login" className="inline-flex rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500">Войти или зарегистрироваться</Link>
            <div className="text-xs text-slate-400 mt-3">Потребуется аккаунт Minecraft: Java Edition</div>
          </div>
        </div>
      </div>
      {/* Шаг 2 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-5">
          <div className="size-10 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-3">➕</div>
          <div className="text-lg font-semibold mb-2">Купите доступ</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="font-medium">Временно недоступно</div>
            <div className="text-xs text-slate-400 mt-1">Подписывайтесь на Telegram, чтобы не пропустить</div>
            <a href={TELEGRAM_URL} className="mt-3 inline-flex rounded-xl px-4 py-2 bg-sky-600 hover:bg-sky-500">Перейти в канал</a>
          </div>
        </div>
      </div>
      {/* Шаг 3 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-5">
          <div className="size-10 rounded-xl bg-teal-600/20 grid place-items-center text-teal-300 mb-3">🗺️</div>
          <div className="text-lg font-semibold mb-2">Зайдите на сервер</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-slate-800">
              <div className="px-3 hidden sm:grid place-items-center bg-slate-900/60 border-r border-slate-800 text-xs text-slate-300">IP адрес</div>
              <div className="px-3 py-2 font-mono flex-1 truncate">{SERVER_IP}</div>
              <button onClick={copy} className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm">
                {copied === 'ok' ? 'Скопировано' : copied === 'err' ? 'Ошибка' : 'Копировать'}
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-3 text-center">
              Откройте Minecraft: Java Edition
              {version ? (
                <> версии <b className="text-slate-300">{version}</b></>
              ) : null}
              {' '}и вставьте IP
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SvgVisa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 14" className={className} fill="currentColor" aria-hidden>
      <path d="M9.5 2.14 6.21 9.88H4.08L2.48 3.7c-.1-.38-.19-.52-.49-.68A8.62 8.62 0 0 0 0 2.38l.05-.23h3.43c.23 0 .45.08.62.23.17.14.28.34.32.56l.85 4.48 2.1-5.27h2.12Z" />
      <path d="M17.86 7.35c0-2.04-2.85-2.15-2.83-3.06 0-.28.27-.58.86-.65.68-.07 1.37.05 1.99.34l.35-1.64A5.47 5.47 0 0 0 16.34 2c-2 0-3.4 1.05-3.41 2.56-.01 1.11 1 1.73 1.77 2.1.78.38 1.05.63 1.04.96 0 .52-.62.75-1.2.76-1.02.02-1.6-.27-2.08-.49l-.36 1.7c.47.21 1.34.4 2.24.41 2.12 0 3.51-1.04 3.52-2.65Z" />
      <path d="M23.13 9.88H25l-1.63-7.74h-1.73a.93.93 0 0 0-.86.57l-3.03 7.17h2.13l.42-1.16h2.59l.24 1.16Zm-2.25-2.74 1.06-2.9.61 2.9h-1.67Zm-8.5-5L10.7 9.88H8.69l1.67-7.74h2.02Z" />
    </svg>
  )
}

function SvgMastercard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 14" className={className} fill="currentColor" aria-hidden>
      <path d="m9.48 10.88.14.12a5.98 5.98 0 0 1-8.14-1.42A6 6 0 0 1 9.62 1l-.13.12a6.44 6.44 0 0 0-.01 9.76Z" />
      <path d="M13.72 0c-1.23 0-2.37.37-3.32 1l.13.12a6.44 6.44 0 0 1-.14 9.88 5.98 5.98 0 0 0 7.57-.76A6 6 0 0 0 13.72 0Z" />
      <path d="M10 1.3a5.98 5.98 0 0 0 0 9.43 5.98 5.98 0 0 0 0-9.43Z" />
    </svg>
  )
}

function SvgTelegram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2.53419 10.491 20.4342 3.72755c.5979-.22564 1.2652.07521 1.4908.67307.0791.21021.0964.43779.0482.65668l-3.0857 14.0805c-.1562.7136-.8611 1.1658-1.5747 1.0086-.1774-.0385-.3442-.1138-.4918-.2198l-6.1453-4.4415c-.3694-.2671-.4533-.784-.1852-1.1543.0289-.0395.0617-.0771.0964-.1118l6.319-6.07213c.1311-.12632.135-.33557.0087-.46768-.109-.11282-.2826-.13404-.4156-.04918L7.88597 13.0975c-.5101.324-1.13978.3973-1.7116.1996l-3.618-1.2516c-.43103-.1485-.65957-.6201-.51107-1.0511.081-.2314.25939-.4166.48889-.5034Z" />
    </svg>
  )
}

function SvgDiscord({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 bg-slate-900/50 hover:bg-slate-900/70 flex items-center justify-between"
      >
        <span className="font-medium">{q}</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 py-3 text-sm text-slate-300">{a}</div>}
    </div>
  )
}
