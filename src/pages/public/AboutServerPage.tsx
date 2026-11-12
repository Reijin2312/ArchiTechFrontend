import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Seo } from '@/shared/seo/seo'
import { routesMeta, ORIGIN } from '@/shared/seo/routesMeta'
import { ResponsiveImage } from '@/shared/ui/image/ResponsiveImage'
import { IMAGES } from '@/shared/images.manifest'
import { SERVER_NAME, DISCORD_URL, TELEGRAM_URL, LAUNCHER_DOWNLOAD_URL } from '@/shared/constants'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { aboutTranslations, englishSeasons } from '@/shared/i18n/aboutTranslations'
import './AboutServerPage.atelier.css'

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

const reveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: .6, ease: [.22, 1, .36, 1] } },
}

const revealList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: .09 } },
}

const imageName = (src: string) => src.split('/').pop()!
  .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
  .replace(/\.(avif|webp)$/i, '.png')

function SeasonPicture({ src, alt, eager = false, sizes = '(max-width: 720px) 100vw, 50vw' }: {
  src: string
  alt: string
  eager?: boolean
  sizes?: string
}) {
  return (
    <ResponsiveImage
      name={imageName(src) as keyof typeof IMAGES}
      alt={alt}
      eager={eager}
      width={1440}
      height={810}
      sizes={sizes}
      className="at-legacy-image"
    />
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

function LegacyJoin({ copy }: { copy: typeof aboutTranslations.ru | typeof aboutTranslations.en }) {
  return (
    <section className="at-legacy-join" id="join">
      <div className="at-legacy-shell at-legacy-join-inner">
        <span className="at-legacy-kicker">ARCHITECH / COMMUNITY</span>
        <h2>{copy.join}</h2>
        <p>{copy.joinText}</p>
        <div className="at-legacy-actions">
          <a className="at-legacy-action at-legacy-action--primary" href={LAUNCHER_DOWNLOAD_URL}>{copy.download}<span aria-hidden="true">↗</span></a>
          <Link className="at-legacy-action at-legacy-action--secondary" to="/">{copy.home}<span aria-hidden="true">↗</span></Link>
        </div>
        <nav className="at-legacy-join-links" aria-label="ArchiTech">
          <a href={DISCORD_URL}>Discord</a>
          <a href={TELEGRAM_URL}>Telegram</a>
          <Link to="/wiki">{copy.wiki}</Link>
          <Link to="/rules">{copy.rules}</Link>
        </nav>
      </div>
    </section>
  )
}

export default function AboutServerPage({ seasonNumberOverride }: { seasonNumberOverride?: number } = {}) {
  const { seasonNumber } = useParams<{ seasonNumber?: string }>()
  const { language } = useI18n()
  const copy = aboutTranslations[language]
  const seasons = useMemo(() => language === 'en'
    ? SEASONS.map((season, index) => ({ ...season, ...englishSeasons[index], features: [...englishSeasons[index].features] }))
    : SEASONS, [language])
  const activeSeasonNumber = seasonNumberOverride ? String(seasonNumberOverride) : seasonNumber
  const season = activeSeasonNumber ? seasons.find(item => String(item.number) === activeSeasonNumber) : undefined
  const previousSeason = season && seasons.find(item => item.number === season.number - 1)
  const nextSeason = season && seasons.find(item => item.number === season.number + 1)
  const reducedMotion = Boolean(useReducedMotion())
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!season) return
    const controller = new AbortController()
    setPlayerAvatars({})
    const usernames = Array.from(new Set(season.players.map(player => player.username)))
    void Promise.all(usernames.map(async username => {
      try {
        const response = await fetch(
          `/api/v1/users/by-name?username=${encodeURIComponent(username)}`,
          { signal: controller.signal },
        )
        if (!response.ok) return null
        const result = await response.json()
        return typeof result?.avatarUrl === 'string' && result.avatarUrl
          ? { username, url: result.avatarUrl as string }
          : null
      } catch {
        return null
      }
    })).then(results => {
      if (!controller.signal.aborted) {
        const images: Record<string, string> = {}
        for (const item of results) if (item) images[item.username] = item.url
        setPlayerAvatars(images)
      }
    })
    return () => controller.abort()
  }, [season?.number])

  useEffect(() => {
    if (activeSeasonNumber) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    } else if (window.location.hash === '#seasons') {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById('seasons')?.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
      return () => window.cancelAnimationFrame(frame)
    }
  }, [activeSeasonNumber])

  if (activeSeasonNumber && !season) return <Navigate to="/about#seasons" replace />

  const seasonUrl = season ? `${ORIGIN}/about/seasons/${season.number}` : undefined
  const pageSeo = season ? {
    ...routesMeta['/about'],
    title: `${season.name} — ${language === 'ru' ? 'История сезона' : 'Season history'} | ArchiTech MC`,
    description: season.description.slice(0, 170),
    canonical: seasonUrl,
    og: { url: seasonUrl, type: 'article', image: `${ORIGIN}${season.screenshots[0]}` },
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'Article',
      headline: season.name, description: season.description,
      mainEntityOfPage: seasonUrl, image: `${ORIGIN}${season.screenshots[0]}`,
      author: { '@type': 'Organization', name: 'ArchiTech MC' }
    }],
  } : routesMeta['/about']

  const fadeProps = reducedMotion
    ? { initial: false as const }
    : { variants: reveal, initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: .12 } }

  return (
    <>
      <Seo {...pageSeo} />
      <div className="at-legacy">
        {season && (
          <div className="at-legacy-season">
            <header className="at-legacy-shell at-legacy-detail-header">
              <Link className="at-legacy-back" to="/about#seasons"><span aria-hidden="true">←</span>{language === 'ru' ? 'Все сезоны' : 'All seasons'}</Link>
              <div className="at-legacy-detail-topline">
                <span className="at-legacy-kicker">ARCHITECH / LEGACY / {String(season.number).padStart(2, '0')}</span>
                {!season.legacy && <span className="at-legacy-current">{copy.current}</span>}
              </div>
              <h1>{season.name}</h1>
              <p className="at-legacy-detail-period">{season.period}</p>
              <div className="at-legacy-detail-rule" />
            </header>

            <motion.figure className="at-legacy-shell at-legacy-detail-cover" {...fadeProps}>
              <SeasonPicture src={season.screenshots[0]} alt={`${season.name} — ${copy.screenshot} 1`} eager sizes="(max-width: 1380px) 100vw, 1380px" />
              <figcaption>{String(season.number).padStart(2, '0')} / ARCHITECH</figcaption>
            </motion.figure>

            <section className="at-legacy-shell at-legacy-detail-story" aria-labelledby="at-legacy-story-title">
              <div className="at-legacy-detail-side">
                <span className="at-legacy-kicker">01 / {language === 'ru' ? 'ИСТОРИЯ' : 'STORY'}</span>
                <h2 id="at-legacy-story-title">{language === 'ru' ? 'История сезона' : 'Season story'}</h2>
              </div>
              <motion.div className="at-legacy-reading" {...fadeProps}>
                <p>{season.description}</p>
              </motion.div>
            </section>

            <section className="at-legacy-shell at-legacy-detail-story at-legacy-detail-story--events" aria-labelledby="at-legacy-events-title">
              <div className="at-legacy-detail-side">
                <span className="at-legacy-kicker">02 / {language === 'ru' ? 'СОБЫТИЯ' : 'EVENTS'}</span>
                <h2 id="at-legacy-events-title">{copy.events}</h2>
              </div>
              <motion.ol className="at-legacy-events" {...fadeProps}>
                {season.features.map((feature, index) => (
                  <li key={index}>
                    <span className="at-legacy-event-index">{String(index + 1).padStart(2, '0')}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </motion.ol>
            </section>

            {season.screenshots.length > 1 && (
              <section className="at-legacy-shell at-legacy-gallery-section" aria-labelledby="at-legacy-gallery-title">
                <div className="at-legacy-section-head">
                  <div>
                    <span className="at-legacy-kicker">03 / {language === 'ru' ? 'АРХИВ' : 'ARCHIVE'}</span>
                    <h2 id="at-legacy-gallery-title">{copy.builds}</h2>
                  </div>
                  <span className="at-legacy-section-count">{String(season.screenshots.length).padStart(2, '0')} {language === 'ru' ? 'снимка' : 'images'}</span>
                </div>
                <motion.div className="at-legacy-gallery" variants={reducedMotion ? undefined : revealList} initial={reducedMotion ? false : 'hidden'} whileInView={reducedMotion ? undefined : 'show'} viewport={{ once: true, amount: .12 }}>
                  {season.screenshots.slice(1).map((screenshot, index) => (
                    <motion.figure key={screenshot} variants={reducedMotion ? undefined : reveal} className="at-legacy-gallery-item">
                      <SeasonPicture src={screenshot} alt={`${season.name} — ${copy.screenshot} ${index + 2}`} />
                      <figcaption>{String(index + 2).padStart(2, '0')} / {String(season.screenshots.length).padStart(2, '0')}</figcaption>
                    </motion.figure>
                  ))}
                </motion.div>
              </section>
            )}

            <section className="at-legacy-shell at-legacy-players-section" aria-labelledby="at-legacy-players-title">
              <div className="at-legacy-section-head">
                <div>
                  <span className="at-legacy-kicker">04 / {language === 'ru' ? 'ЛЮДИ' : 'PEOPLE'}</span>
                  <h2 id="at-legacy-players-title">{copy.players}</h2>
                </div>
                <span className="at-legacy-section-count">{String(season.players.length).padStart(2, '0')}</span>
              </div>
              <div className="at-legacy-players">
                {season.players.map(player => (
                  <Link className="at-legacy-player" key={player.username} to={`/u/${encodeURIComponent(player.username)}`}>
                    <span className="at-legacy-avatar">
                      {playerAvatars[player.username] ? (
                        <img src={playerAvatars[player.username]} alt="" loading="lazy" decoding="async" />
                      ) : <span aria-hidden="true">{player.username[0]?.toUpperCase() || '?'}</span>}
                    </span>
                    <span className="at-legacy-player-info">
                      <strong>{player.username}</strong>
                      {player.role && <small>{language === 'en' ? englishRole(player.role) : player.role}</small>}
                    </span>
                    <span className="at-legacy-player-arrow" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </section>

            <nav className="at-legacy-shell at-legacy-season-nav" aria-label={language === 'ru' ? 'Навигация по сезонам' : 'Season navigation'}>
              {previousSeason ? (
                <Link to={`/about/seasons/${previousSeason.number}`}><span>← {language === 'ru' ? 'Предыдущий сезон' : 'Previous season'}</span><strong>{previousSeason.name}</strong></Link>
              ) : <span />}
              {nextSeason ? (
                <Link to={`/about/seasons/${nextSeason.number}`}><span>{language === 'ru' ? 'Следующий сезон' : 'Next season'} →</span><strong>{nextSeason.name}</strong></Link>
              ) : <Link to="/about#seasons"><span>{language === 'ru' ? 'Вернуться' : 'Return'} →</span><strong>{copy.history}</strong></Link>}
            </nav>
          </div>
        )}
        {!season && (
          <div>
            <header className="at-legacy-shell at-legacy-intro">
              <motion.div {...fadeProps}>
                <span className="at-legacy-kicker">ARCHITECH / COMMUNITY</span>
                <h1>{copy.title} <span>{SERVER_NAME}</span></h1>
                <p className="at-legacy-lead">{copy.lead}</p>
              </motion.div>
            </header>

            <motion.figure className="at-legacy-shell at-legacy-world" {...fadeProps}>
              <SeasonPicture src="/images/screen2.png" alt={copy.worldAlt} eager sizes="(max-width: 1380px) 100vw, 1380px" />
              <figcaption>ARCHITECH / MINECRAFT</figcaption>
            </motion.figure>

            <section className="at-legacy-shell at-legacy-values" aria-label={language === 'ru' ? 'Особенности сервера' : 'Server features'}>
              {copy.cards.map(([title, description], index) => (
                <div className="at-legacy-value" key={title}>
                  <span className="at-legacy-value-index">{String(index + 1).padStart(2, '0')}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              ))}
            </section>

            <section className="at-legacy-shell at-legacy-seasons-section" id="seasons" aria-labelledby="at-legacy-seasons-title">
              <div className="at-legacy-section-head">
                <div>
                  <span className="at-legacy-kicker">ARCHITECH / LEGACY</span>
                  <h2 id="at-legacy-seasons-title">{copy.history}</h2>
                </div>
                <p className="at-legacy-seasons-period">{language === 'ru' ? 'Май 2022 — настоящее время' : 'May 2022 — present'}</p>
              </div>

              <motion.div className="at-legacy-seasons-grid" variants={reducedMotion ? undefined : revealList} initial={reducedMotion ? false : 'hidden'} whileInView={reducedMotion ? undefined : 'show'} viewport={{ once: true, amount: .08 }}>
                {[...seasons].reverse().map(item => (
                  <motion.div key={item.number} variants={reducedMotion ? undefined : reveal} className="at-legacy-season-grid-item">
                    <Link className="at-legacy-season-card" to={`/about/seasons/${item.number}`}>
                      <div className="at-legacy-season-card-image">
                        <SeasonPicture src={item.screenshots[0]} alt={`${item.name} — ${copy.screenshot} 1`} />
                        <span className="at-legacy-image-number">{String(item.number).padStart(2, '0')} / 04</span>
                      </div>
                      <div className="at-legacy-season-card-content">
                        <div className="at-legacy-season-card-topline">
                          <span className="at-legacy-card-label">{language === 'ru' ? 'СЕЗОН' : 'SEASON'} {String(item.number).padStart(2, '0')}</span>
                          {!item.legacy && <span className="at-legacy-current">{copy.current}</span>}
                        </div>
                        <h3>{item.name}</h3>
                        <span className="at-legacy-season-period">{item.period}</span>
                        <p>{item.description}</p>
                        <span className="at-legacy-season-open">{language === 'ru' ? 'История сезона' : 'Explore season'} <span aria-hidden="true">↗</span></span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </section>
          </div>
        )}
        <LegacyJoin copy={copy} />
      </div>
    </>
  )
}
