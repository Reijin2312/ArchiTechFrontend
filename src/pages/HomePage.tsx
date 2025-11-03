import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authStore } from '@/shared/store/auth'

const SERVER_NAME = 'ArchiTech MC'
const SERVER_IP = 'architech-mc.online'
const DISCORD_URL = 'https://discord.gg/your-invite'
const TELEGRAM_URL = 'https://t.me/archi_tech_official'
const MAP_URL = '/map'
const RULES_URL = '/rules'
const SHOP_URL = 'https://t.me/@Archi_payment_bot'
const MODPACK_URL = '/modpack'

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
  const shots = ['/images/screen1.png','/images/screen2.png','/images/screen3.png', '/images/screen4.png', '/images/screen5.png']
  const [shot, setShot] = useState(shots[0])
  const [prevShot, setPrevShot] = useState<string | null>(null)
  const [cross, setCross] = useState(true);

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

  function SvgTelegram({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M2.53419 10.491 20.4342 3.72755c.5979-.22564 1.2652.07521 1.4908.67307.0791.21021.0964.43779.0482.65668l-3.0857 14.0805c-.1562.7136-.8611 1.1658-1.5747 1.0086-.1774-.0385-.3442-.1138-.4918-.2198l-6.1453-4.4415c-.3694-.2671-.4533-.784-.1852-1.1543.0289-.0395.0617-.0771.0964-.1118l6.319-6.07213c.1311-.12632.135-.33557.0087-.46768-.109-.11282-.2826-.13404-.4156-.04918L7.88597 13.0975c-.5101.324-1.13978.3973-1.7116.1996l-3.618-1.2516c-.43103-.1485-.65957-.6201-.51107-1.0511.081-.2314.25939-.4166.48889-.5034Z"/>
      </svg>
    );
  }

  function SvgDiscord({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
      </svg>
    );
  }

  function SvgUserPlus({
    className,
    gap = 4,
  }: { className?: string; gap?: number }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        {}
        <g transform={`translate(${-gap},0)`}>
          <circle cx="12" cy="8" r="4" />                         {}
          <path d="M4 19c0-3.866 3.134-7 7-7h2c3.866 0 7 3.134 7 7v1H4v-1Z"/> {}
        </g>
        {}
        <path d="M18 4h2v3h3v2h-3v3h-2V9h-3V7h3V4Z"/>
      </svg>
    );
  }

function SvgMcBlockGrass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      {}
      <path fill="#6FBF3D" d="M12 2.5 20 7 12 11.5 4 7 12 2.5Z"/>
      {}
      <path fill="#5EAB30" d="M12 2.5 20 7l-2.2 1.2L12 5 6.2 8.2 4 7 12 2.5Z"/>
      {}
      <path fill="#8B5E3C" d="M20 7v8l-8 5.5v-9L20 7Z"/>
      {}
      <path fill="#7A5030" d="M12 11.5v9L4 15V7l8 4.5Z"/>
    </svg>
  );
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
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
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-stretch">
          <div className="md:flex md:flex-col md:h-full">
            <h1 className="text-left! text-4xl md:text-5xl font-bold leading-tight">
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
              <button
                onClick={copyIp}
                className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm grid place-items-center"
                aria-label={copyOk === 'ok' ? 'Скопировано' : copyOk === 'err' ? 'Ошибка' : 'Копировать IP'}
                title={copyOk === 'ok' ? 'Скопировано' : copyOk === 'err' ? 'Ошибка' : 'Копировать IP'}
              >
                {copyOk === 'ok' ? (
          
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
       
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                    <path d="M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
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

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgMcBlockGrass className="h-5" />Лаунчер</span>}
            text="Автоматическое обновление модов" 
            href={MAP_URL}
            button="Скачать" />
          <CardCTA 
            title={<span className="inline-flex items-center gap-2"><SvgUserPlus className="h-5" />Доступ на сервер</span>}
            text="Получить проходку в телеграмм-боте" 
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
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl font-semibold mb-6">Команда проекта</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Raijin', role: 'Владелец & программист' },
            { name: 'Kelbor-Hal', role: 'Мл. Админ' },
            { name: 'Wolle', role: 'Тех. Админ' },
            { name: 'Sile Scorp', role: 'Дизайнер' },
            { name: 'Explyp', role: 'Python-программист' }
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

function CardCTA({ title, text, href, button }: {
    title: React.ReactNode; text: string; href: string; button: string
  }) {
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
