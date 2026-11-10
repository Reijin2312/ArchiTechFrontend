import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { homeTranslations, teamTranslations } from '@/shared/i18n/translations'
import { TEAM_MEMBERS, TEAM_AVATAR_FALLBACK } from '@/shared/data/team'

const Skin3DViewer = lazy(() =>
  import('@/shared/ui/skin/Skin3DViewer').then((module) => ({ default: module.Skin3DViewer })),
)

const OWNER = TEAM_MEMBERS[0].name

type PublicProfile = { skinUrl?: string | null }

// This is deliberately an excerpt from the existing, hand-written homepage copy.
// It is not a second description of the server or a new marketing slogan.
function originalExcerpt(language: 'ru' | 'en') {
  const text = homeTranslations[language].hero
  if (language === 'ru') {
    return text.match(/где можно возвести завод, улететь на собственном дирижабле и случайно стать магом\./)?.[0] ?? text
  }
  return text.match(/build a factory, fly your own airship, and accidentally become a wizard\./)?.[0] ?? text
}

export function HomeQuote({ reduced, fallbackAvatar }: { reduced: boolean; fallbackAvatar?: string }) {
  const { language } = useI18n()
  const root = useRef<HTMLElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [skinUrl, setSkinUrl] = useState<string | null>(null)
  const [skinReady, setSkinReady] = useState(false)
  const handleSkinReady = useCallback(() => setSkinReady(true), [])

  // Defer the WebGL renderer until this section approaches the screen.
  useEffect(() => {
    const element = root.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearViewport) return
    const controller = new AbortController()
    const loadSkin = async () => {
      try {
        const response = await fetch(
          '/api/v1/users/by-name?username=' + encodeURIComponent(OWNER),
          { signal: controller.signal },
        )
        if (!response.ok) return
        const profile = (await response.json()) as PublicProfile
        if (!controller.signal.aborted && profile.skinUrl) {
          setSkinUrl(profile.skinUrl)
        }
      } catch {
        // The static avatar remains visible when the optional skin endpoint fails.
      }
    }
    void loadSkin()
    return () => controller.abort()
  }, [nearViewport])

  const quote = originalExcerpt(language)
  const role = language === 'ru' ? teamTranslations.ru.owner : teamTranslations.en.owner

  return (
    <section ref={root} className="at-intro at-testimonial" aria-label={language === 'ru' ? 'О проекте — слова основателя' : 'About the project — a word from the founder'}>
      <div className="at-intro-inner at-testimonial-inner">
        <motion.div className="at-testimonial-portrait"
          initial={reduced ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .18 }}
          transition={{ duration: .95, ease: [.22, 1, .36, 1] }}>
          <div className="at-testimonial-stage">
            <img
              className={'at-testimonial-avatar' + (skinReady ? ' at-testimonial-avatar--hidden' : '')}
              src={fallbackAvatar || TEAM_AVATAR_FALLBACK}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                if (!event.currentTarget.src.endsWith(TEAM_AVATAR_FALLBACK)) {
                  event.currentTarget.src = TEAM_AVATAR_FALLBACK
                }
              }}
            />
            {nearViewport && skinUrl && (
              <Suspense fallback={null}>
                <Skin3DViewer
                  skinUrl={skinUrl}
                  background="#1b1c19"
                  animated={false}
                  autoRotate={false}
                  interactive={false}
                  onReady={handleSkinReady}
                  className={'at-testimonial-skin' + (skinReady ? ' at-testimonial-skin--visible' : '')}
                />
              </Suspense>
            )}
          </div>
          <div className="at-testimonial-portrait-caption" aria-hidden="true">ARCHITECH / MINECRAFT</div>
        </motion.div>
        <motion.div className="at-testimonial-copy"
          initial={reduced ? false : { opacity: 0, y: 17 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .22 }}
          transition={{ duration: .8, delay: reduced ? 0 : .09, ease: [.22, 1, .36, 1] }}>
          <div className="at-testimonial-meta">
            <span className="at-kicker">ARCHITECH / MINECRAFT</span>
            <div className="at-testimonial-author">
              <a href={'/u/' + encodeURIComponent(OWNER)} className="at-testimonial-name">{OWNER}</a>
              <span className="at-testimonial-role">{role}</span>
            </div>
          </div>
          <blockquote className="at-intro-quote at-testimonial-quote">
            <span className="at-testimonial-open-quote" aria-hidden="true">“</span>
            <p>{quote}</p>
          </blockquote>
          <div className="at-testimonial-signature" aria-hidden="true">
            <span className="at-testimonial-signature-line" />
            <span>ARCHITECH MC</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
