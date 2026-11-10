import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import type { TeamMember } from '@/shared/data/team'
import { SvgArrowUpRight, SvgCurseForge, SvgGitHub, SvgModrinth } from '@/shared/ui/image/Icons'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { teamTranslations } from '@/shared/i18n/translations'

type TeamProps = {
  team: TeamMember[]
  avatars: Record<string, string>
  disableMotion?: boolean
}

const appear: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: .66, ease: [.22, 1, .36, 1] } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: .09 } },
}

function MinecraftPortrait({ name, src, prominent = false }: {
  name: string
  src?: string
  prominent?: boolean
}) {
  const [imageStatus, setImageStatus] = useState<{ src?: string; loaded: boolean; failed: boolean }>({
    src, loaded: false, failed: false,
  })
  // State from the previous source must not conceal a new portrait or reveal an old one.
  const loaded = imageStatus.src === src && imageStatus.loaded
  const failed = imageStatus.src === src && imageStatus.failed

  return (
    <span className={prominent ? 'at-staff-portrait at-staff-portrait--large' : 'at-staff-portrait'}>
      <span className="at-staff-pixel-head" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" focusable="false">
          <path d="M12 8h40v40H12z" fill="#8E836F"/>
          <path d="M12 8h40v12H12zM12 20h8v8h-8zm32 0h8v8h-8z" fill="#393A34"/>
          <path d="M20 28h8v8h-8zm16 0h8v8h-8z" fill="#222823"/>
          <path d="M28 36h8v8h-8z" fill="#BBA783"/>
          <path d="M20 44h24v4H20z" fill="#41392F"/>
          <path d="M4 56h56v8H4z" fill="#4F594B"/>
          <path d="M12 48h40v8H12z" fill="#626C5C"/>
        </svg>
      </span>
      {src && !failed && (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={loaded ? 'at-staff-portrait-image at-staff-portrait-image--loaded' : 'at-staff-portrait-image'}
          width={prominent ? 224 : 80}
          height={prominent ? 224 : 80}
          decoding="async"
          loading="lazy"
          onLoad={() => setImageStatus({ src, loaded: true, failed: false })}
          onError={() => setImageStatus({ src, loaded: false, failed: true })}
        />
      )}
      <span className="sr-only">{name}</span>
    </span>
  )
}

function roleFor(member: TeamMember, copy: typeof teamTranslations.ru | typeof teamTranslations.en) {
  switch (member.name) {
    case 'Raijin': return copy.owner
    case 'Kelbor_Hal': return copy.juniorAdmin
    case 'Wolle': return copy.techAdmin
    case 'Sile_Scorp': return copy.designer
    case 'Explyp': return copy.python
    default: return member.role
  }
}

export function HomeTeam({ team, avatars, disableMotion = false }: TeamProps) {
  const { language } = useI18n()
  const copy = teamTranslations[language]

  if (!team.length) return null

  const [founder, ...members] = team
  const founderPath = '/u/' + encodeURIComponent(founder.name)

  return (
    <motion.div
      className="at-staff"
      variants={disableMotion ? undefined : stagger}
      initial={disableMotion ? false : 'hidden'}
      whileInView={disableMotion ? undefined : 'show'}
      viewport={{ once: true, amount: .12 }}
    >
      <motion.article className="at-staff-feature" variants={disableMotion ? undefined : appear}>
        <a className="at-staff-feature-photo" href={founderPath} aria-label={founder.name}>
          <MinecraftPortrait name={founder.name} src={avatars[founder.name]} prominent />
          <span className="at-staff-photo-index" aria-hidden="true">01 / 0{team.length}</span>
        </a>
        <div className="at-staff-feature-body">
          <p className="at-staff-eyebrow">{copy.lead}</p>
          <a className="at-staff-founder-name" href={founderPath}>
            <span>{founder.name}</span>
            <SvgArrowUpRight className="at-staff-arrow" />
          </a>
          <p className="at-staff-founder-role">{roleFor(founder, copy)}</p>
          <div className="at-staff-socials">
            {founder.curseForgeUrl && (
              <a href={founder.curseForgeUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.curseForge} title="CurseForge">
                <SvgCurseForge />
                <span>CurseForge</span>
              </a>
            )}
            {founder.modrinthUrl && (
              <a href={founder.modrinthUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.modrinth} title="Modrinth">
                <SvgModrinth />
                <span>Modrinth</span>
              </a>
            )}
            {founder.githubUrl && (
              <a href={founder.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">
                <SvgGitHub />
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>
        <span className="at-staff-feature-rule" aria-hidden="true" />
      </motion.article>

      <div className="at-staff-grid">
        {members.map((member, index) => {
          const retired = Boolean(member.retiredSince)
          const reason = language === 'ru' ? member.retirementReason ?? copy.left : copy.left
          const retiredTitle = member.retiredSince
            ? copy.retiredTitle.replace('{reason}', reason).replace('{year}', String(member.retiredSince))
            : undefined

          return (
            <motion.a
              key={member.name}
              variants={disableMotion ? undefined : appear}
              className={retired ? 'at-staff-person at-staff-person--former' : 'at-staff-person'}
              href={'/u/' + encodeURIComponent(member.name)}
              aria-label={member.name + ' — ' + roleFor(member, copy)}
              title={retiredTitle}
            >
              <MinecraftPortrait name={member.name} src={avatars[member.name]} />
              <span className="at-staff-person-main">
                <span className="at-staff-person-name">{member.name}</span>
                <span className="at-staff-person-role">{roleFor(member, copy)}</span>
                {member.retiredSince && (
                  <span className="at-staff-former-label">{copy.left} · {member.retiredSince}</span>
                )}
              </span>
              <span className="at-staff-person-side">
                <span className="at-staff-person-index">{String(index + 2).padStart(2, '0')}</span>
                <SvgArrowUpRight className="at-staff-arrow" />
              </span>
            </motion.a>
          )
        })}
      </div>
    </motion.div>
  )
}
