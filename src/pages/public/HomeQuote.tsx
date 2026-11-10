import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { homeTranslations, teamTranslations } from '@/shared/i18n/translations'
import { TEAM_MEMBERS } from '@/shared/data/team'

const Skin3DViewer = lazy(() =>
  import('@/shared/ui/skin/Skin3DViewer').then((module) => ({ default: module.Skin3DViewer })),
)

const OWNER = TEAM_MEMBERS[0].name
// Static, classic Steve skin used whenever a public player skin is unavailable.
const DEFAULT_STEVE_SKIN = 'https://raw.githubusercontent.com/nodecraft/crafthead/master/src/worker/assets/steve.png'

type PublicProfile = { skinUrl?: string | null }

// This is deliberately an excerpt from the existing, hand-written homepage copy.
// It is not a second description of the server or a new marketing slogan.
function originalExcerpt(language: 'ru' | 'en') {
  const text = homeTranslations[language].hero
  // A verbatim fragment, with only the first letter capitalized for typesetting.
  const excerpt = language === 'ru'
    ? text.match(/можно возвести завод, улететь на собственном дирижабле и случайно стать магом\./)?.[0]
    : text.match(/build a factory, fly your own airship, and accidentally become a wizard\./)?.[0]
  const source = excerpt ?? text.split('.')[0] + '.'
  return source.charAt(0).toUpperCase() + source.slice(1)
}

export function HomeQuote({ reduced, typewriterReduced = reduced }: { reduced: boolean; typewriterReduced?: boolean }) {
  const { language } = useI18n()
  const root = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLQuoteElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [quoteInView, setQuoteInView] = useState(false)
  const [typedCount, setTypedCount] = useState(0)
  const [skinUrl, setSkinUrl] = useState(DEFAULT_STEVE_SKIN)
  const [skinReady, setSkinReady] = useState(false)
  const handleSkinReady = useCallback(() => setSkinReady(true), [])
  const handleSkinError = useCallback(() => {
    setSkinUrl(current => current === DEFAULT_STEVE_SKIN ? current : DEFAULT_STEVE_SKIN)
  }, [])

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
        // Keep the 3D Steve model when the optional player profile is unavailable.
      }
    }
    void loadSkin()
    return () => controller.abort()
  }, [nearViewport])

  const quote = originalExcerpt(language)
  const role = language === 'ru' ? teamTranslations.ru.owner : teamTranslations.en.owner
  const displayedQuote = typewriterReduced ? quote : quote.slice(0, typedCount)

  // Start only when the quotation itself is visible; the skin preloads earlier.
  useEffect(() => {
    const element = quoteRef.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setQuoteInView(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setQuoteInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Short, one-shot typewriter, without layout shifts or a repeating restart.
  useEffect(() => {
    if (!quoteInView || typewriterReduced || typedCount >= quote.length) return
    const timer = window.setTimeout(() => {
      setTypedCount(count => Math.min(count + 1, quote.length))
    }, 27)
    return () => window.clearTimeout(timer)
  }, [quoteInView, typewriterReduced, typedCount, quote.length])

  // Language switches should never force the viewer to watch the animation again.
  const previousLanguage = useRef(language)
  useEffect(() => {
    if (previousLanguage.current !== language) {
      previousLanguage.current = language
      setTypedCount(quote.length)
    }
  }, [language, quote.length])

  return (
    <section ref={root} className="at-intro at-testimonial" aria-label={language === 'ru' ? 'О проекте — слова основателя' : 'About the project — a word from the founder'}>
      <div className="at-intro-inner at-testimonial-inner">
        <motion.div className="at-testimonial-portrait"
          initial={reduced ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .18 }}
          transition={{ duration: .95, ease: [.22, 1, .36, 1] }}>
          <div className="at-testimonial-stage">
            {nearViewport && (
              <Suspense fallback={null}>
                <Skin3DViewer
                  skinUrl={skinUrl}
                  background="#1b1c19"
                  animated={false}
                  autoRotate={false}
                  interactive={false}
                  portraitYaw={0.36}
                  followCursor={!typewriterReduced}
                  onReady={handleSkinReady}
                  onError={handleSkinError}
                  className={'at-testimonial-skin' + (skinReady ? ' at-testimonial-skin--visible' : '')}
                />
              </Suspense>
            )}
          </div>
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
          <blockquote ref={quoteRef} className="at-intro-quote at-testimonial-quote">
            <span className="at-testimonial-open-quote" aria-hidden="true">“</span>
            <div className="at-testimonial-type">
              <p className="at-testimonial-type-measure" aria-hidden="true">
                {quote}<span className="at-testimonial-type-caret">|</span>
              </p>
              <p className="at-testimonial-type-live" aria-hidden="true">
                {displayedQuote}<span className="at-testimonial-type-caret">|</span>
              </p>
              <span className="sr-only">{quote}</span>
            </div>
          </blockquote>
        </motion.div>
      </div>
    </section>
  )
}
