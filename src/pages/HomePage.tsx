import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const SERVER_NAME = 'ArchiTech MC'
const SERVER_IP = 'architech-mc.online'
const DISCORD_URL = 'https://discord.gg/x6JwVPwPtw'
const TELEGRAM_URL = 'https://t.me/archi_tech_official'
const RULES_URL = '/rules'
const SHOP_URL = '/shop'
import { useWallpaper } from '@/shared/ui/useWallpaper';

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

  const [status, setStatus] = useState<McStatus | null>(null)
  const [copyOk, setCopyOk] = useState<'idle' | 'ok' | 'err'>('idle')
  const shots = ['/images/screen1.png','/images/screen2.png','/images/screen3.png', '/images/screen4.png', '/images/screen5.png', '/images/screen6.png', '/images/screen7.png', '/images/screen8.png']
  const [shot, setShot] = useState(shots[0])
  const [prevShot, setPrevShot] = useState<string | null>(null)
  const [cross, setCross] = useState(true);

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
}: { className?: string; gap?: number }) {
  return (
    <svg
      viewBox="0 0 29 29"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M21 7.00001C21 6.7348 21.1054 6.48044 21.2929 6.29291C21.4805 6.10537 21.7348 6.00001 22 6.00001H24V4.00001C24 3.7348 24.1054 3.48044 24.2929 3.29291C24.4805 3.10537 24.7348 3.00001 25 3.00001C25.2652 3.00001 25.5196 3.10537 25.7071 3.29291C25.8947 3.48044 26 3.7348 26 4.00001V6.00001H28C28.2652 6.00001 28.5196 6.10537 28.7071 6.29291C28.8947 6.48044 29 6.7348 29 7.00001C29 7.26523 28.8947 7.51958 28.7071 7.70712C28.5196 7.89466 28.2652 8.00001 28 8.00001H26V10C26 10.2652 25.8947 10.5196 25.7071 10.7071C25.5196 10.8947 25.2652 11 25 11C24.7348 11 24.4805 10.8947 24.2929 10.7071C24.1054 10.5196 24 10.2652 24 10V8.00001H22C21.7348 8.00001 21.4805 7.89466 21.2929 7.70712C21.1054 7.51958 21 7.26523 21 7.00001ZM28.82 13.835C29.2769 16.5507 28.8589 19.3413 27.6263 21.804C26.3938 24.2666 24.4105 26.2738 21.9628 27.5358C19.5151 28.7978 16.7297 29.2492 14.0087 28.8249C11.2877 28.4006 8.77199 27.1226 6.82472 25.1753C4.87744 23.2281 3.59941 20.7123 3.17513 17.9913C2.75085 15.2704 3.20229 12.4849 4.46426 10.0373C5.72624 7.58958 7.73344 5.60628 10.1961 4.37373C12.6587 3.14118 15.4493 2.72316 18.165 3.18001C18.4246 3.22592 18.6556 3.37247 18.8077 3.58778C18.9598 3.80309 19.0207 4.06974 18.9772 4.32974C18.9337 4.58974 18.7893 4.82204 18.5754 4.97613C18.3615 5.13021 18.0954 5.1936 17.835 5.15251C16.2577 4.88717 14.6415 4.96873 13.0989 5.39152C11.5563 5.81431 10.1243 6.56817 8.90268 7.60064C7.68104 8.63311 6.69906 9.91938 6.02508 11.3699C5.3511 12.8205 5.0013 14.4005 5.00003 16C4.99766 18.6928 5.98734 21.292 7.78003 23.3013C8.89532 21.6851 10.4636 20.4348 12.2875 19.7075C11.3078 18.9358 10.5928 17.878 10.2421 16.6811C9.89143 15.4843 9.92241 14.2079 10.3308 13.0294C10.7391 11.851 11.5046 10.8291 12.5206 10.1059C13.5367 9.38263 14.7529 8.99399 16 8.99399C17.2472 8.99399 18.4634 9.38263 19.4795 10.1059C20.4955 10.8291 21.2609 11.851 21.6693 13.0294C22.0777 14.2079 22.1086 15.4843 21.7579 16.6811C21.4072 17.878 20.6923 18.9358 19.7125 19.7075C21.5365 20.4348 23.1047 21.6851 24.22 23.3013C26.0127 21.292 27.0024 18.6928 27 16C27.0001 15.3852 26.9491 14.7714 26.8475 14.165C26.8245 14.0349 26.8275 13.9016 26.8564 13.7727C26.8852 13.6437 26.9393 13.5218 27.0155 13.4139C27.0917 13.306 27.1885 13.2143 27.3004 13.144C27.4123 13.0738 27.537 13.0264 27.6672 13.0046C27.7975 12.9828 27.9309 12.987 28.0595 13.017C28.1881 13.0471 28.3096 13.1023 28.4168 13.1795C28.5239 13.2567 28.6148 13.3544 28.684 13.4669C28.7532 13.5794 28.7994 13.7045 28.82 13.835ZM16 19C16.7912 19 17.5645 18.7654 18.2223 18.3259C18.8801 17.8864 19.3928 17.2617 19.6956 16.5307C19.9983 15.7998 20.0775 14.9956 19.9232 14.2197C19.7688 13.4437 19.3879 12.731 18.8285 12.1716C18.269 11.6122 17.5563 11.2312 16.7804 11.0769C16.0045 10.9225 15.2002 11.0017 14.4693 11.3045C13.7384 11.6072 13.1137 12.1199 12.6742 12.7777C12.2346 13.4355 12 14.2089 12 15C12 16.0609 12.4215 17.0783 13.1716 17.8284C13.9218 18.5786 14.9392 19 16 19ZM16 27C18.4417 27.0025 20.8142 26.1885 22.74 24.6875C22.0166 23.5561 21.02 22.625 19.8421 21.9801C18.6642 21.3351 17.3429 20.9971 16 20.9971C14.6571 20.9971 13.3358 21.3351 12.1579 21.9801C10.98 22.625 9.98345 23.5561 9.26003 24.6875C11.1859 26.1885 13.5583 27.0025 16 27Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SvgMcBlockGrass({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 29 29"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M26 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V26C4 26.5304 4.21071 27.0391 4.58579 27.4142C4.96086 27.7893 5.46957 28 6 28H26C26.5304 28 27.0391 27.7893 27.4142 27.4142C27.7893 27.0391 28 26.5304 28 26V6C28 5.46957 27.7893 4.96086 27.4142 4.58579C27.0391 4.21071 26.5304 4 26 4ZM24.4137 15L17 7.58625V6H18.5863L26 13.415V15H24.4137ZM17 10.4137L21.5863 15H17V10.4137ZM26 10.5863L21.4137 6H26V10.5863ZM15 6V15H6V6H15ZM13.4137 26L6 18.5863V17H7.58625L15 24.4137V26H13.4137ZM15 21.5863L10.4137 17H15V21.5863ZM6 21.4137L10.5863 26H6V21.4137ZM26 26H17V17H26V26Z"
        fill="currentColor"
      />
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
    <div className="min-h-dvh text-slate-100 relative">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pt-16">
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
                <a href="https://launcher.architech-mc.ru/download/launcher/latest" className="inline-flex rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-center">Скачать лаунчер</a>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
              <div className="relative h-full w-full">
              <img
                key={shot}
                src={shot}
                alt="screenshot"
                className={
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " +
                  (cross ? "opacity-100" : "opacity-0")
                }
              />
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
            href="https://launcher.architech-mc.ru/download/launcher/latest"
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
          {TEAM.map((p) => {
            const src = avatars[p.name] || AVATAR_FALLBACK
            return (
              <div key={p.name} className="rounded-2xl border border-slate-800 p-4 bg-slate-900/40 backdrop-blur-md backdrop-saturate-150">
                <div className="flex items-center gap-3">
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
                </div>
              </div>
            )
          })}
        </div>
      </section>

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

function CardCTA({ title, text, href, button }: {
  title: React.ReactNode; text: string; href: string; button: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 p-5
                    bg-linear-to-b from-slate-900/60 to-slate-900/20
                    backdrop-blur-md backdrop-saturate-150">
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-5">
          <div className="size-10 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-3">👤</div>
          <div className="text-lg font-semibold mb-2">Зарегистрируйтесь на сайте</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <Link to="/auth/login" className="inline-flex rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500">Войти или зарегистрироваться</Link>
            <div className="text-xs text-slate-400 mt-3">Потребуется только ваша почта</div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-5">
          <div className="size-10 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-3">➕</div>
          <div className="text-lg font-semibold mb-2">Получите доступ</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <a href={TELEGRAM_URL} className="inline-flex rounded-xl px-4 py-2 bg-sky-600 hover:bg-sky-500">Перейти в бота</a>
            <div className="text-xs text-slate-400 mt-3">Введите ваш ник на сайте, чтобы получить проходку</div>
          </div>
        </div>
      </div>
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
    <div className="rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md backdrop-saturate-150">
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