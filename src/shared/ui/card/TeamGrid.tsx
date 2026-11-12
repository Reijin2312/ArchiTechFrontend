import { motion, type Variants } from 'framer-motion';
import type { TeamMember } from '@/shared/data/team';
import { TEAM_AVATAR_FALLBACK } from '@/shared/data/team';
import { SvgCurseForge, SvgModrinth, SvgGitHub } from '@/shared/ui/image/Icons';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { teamTranslations } from '@/shared/i18n/translations';

type TeamGridProps = {
  team: TeamMember[];
  avatars: Record<string, string>;
  disableMotion?: boolean;
  className?: string;
};

const teamContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const teamItem: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(8px)', scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export function TeamGrid({ team, avatars, disableMotion, className }: TeamGridProps) {
  const { language } = useI18n();
  const copy = teamTranslations[language];
  if (!team.length) return null;

  const [leader, ...otherMembers] = team;
  const leaderSrc = avatars[leader.name] || TEAM_AVATAR_FALLBACK;

  return (
    <motion.div
      className={[
        'grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.46fr)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      variants={disableMotion ? undefined : teamContainer}
    >
      <motion.div
        variants={disableMotion ? undefined : teamItem}
        whileHover={disableMotion ? undefined : { y: -4 }}
        whileTap={disableMotion ? undefined : { scale: 0.995 }}
        className="relative flex flex-col justify-center overflow-hidden rounded-[9px] border border-[rgba(239,232,218,.23)] border-t-2 border-t-[#c5aa84] bg-[#22241f]/95 p-7 backdrop-blur-[8px] transition-[border-color,box-shadow] duration-300 hover:border-[#bfa681] hover:shadow-[0_14px_35px_rgba(0,0,0,.20),0_0_23px_rgba(197,170,132,.06)]"
      >

        <div className="relative z-10 flex items-stretch gap-4">
          <a href={`/u/${encodeURIComponent(leader.name)}`} className="shrink-0 self-stretch">
            <img
              src={leaderSrc}
              alt={leader.name}
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="h-full min-h-28 w-28 rounded-[9px] border border-[rgba(239,232,218,.25)] bg-[#30332c] object-cover"
              onError={(event) => {
                const img = event.currentTarget as HTMLImageElement;
                if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
              }}
            />
          </a>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="font-[Onest] text-[11px] font-semibold uppercase tracking-[.18em] text-[#c5aa84]">{copy.lead}</div>
            <a href={`/u/${encodeURIComponent(leader.name)}`} className="mt-2 block min-w-0">
              <div className="truncate font-[Onest] text-[26px] font-semibold tracking-[-.035em] text-[#f2efe9]">{leader.name}</div>
              <div className="mt-1 text-[14px] leading-6 text-[#c9c3b8]">{localizedRole(leader.name, leader.role, copy)}</div>
            </a>

            {(leader.curseForgeUrl || leader.modrinthUrl || leader.githubUrl) && (
              <div className="mt-3 flex items-center gap-3">
                {leader.curseForgeUrl && (
                  <a
                    href={leader.curseForgeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid size-10 place-items-center rounded-[8px] border border-[rgba(239,232,218,.21)] text-[#cfc6b7] transition-[color,border-color] hover:border-[#c5aa84] hover:text-[#e0b795]"
                    aria-label={copy.curseForge}
                    title="CurseForge"
                  >
                    <SvgCurseForge className="size-8" />
                  </a>
                )}
                {leader.modrinthUrl && (
                  <a
                    href={leader.modrinthUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid size-10 place-items-center rounded-[8px] border border-[rgba(239,232,218,.21)] text-[#cfc6b7] transition-[color,border-color] hover:border-[#c5aa84] hover:text-[#9acb9d]"
                    aria-label={copy.modrinth}
                    title="Modrinth"
                  >
                    <SvgModrinth className="size-8" />
                  </a>
                )}
                {leader.githubUrl && (
                  <a
                    href={leader.githubUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid size-10 place-items-center rounded-[8px] border border-[rgba(239,232,218,.21)] text-[#cfc6b7] transition-[color,border-color] hover:border-[#c5aa84] hover:text-white"
                    aria-label="GitHub Reijin2312"
                    title="GitHub"
                  >
                    <SvgGitHub className="size-7" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {otherMembers.map((member) => {
          const src = avatars[member.name] || TEAM_AVATAR_FALLBACK;
          return (
            <motion.div
              key={member.name}
              variants={disableMotion ? undefined : teamItem}
              whileHover={disableMotion ? undefined : { y: -3 }}
              whileTap={disableMotion ? undefined : { scale: 0.99 }}
              className="group relative overflow-hidden rounded-[9px] border border-[rgba(239,232,218,.20)] bg-[#20221e]/95 p-5 backdrop-blur-[8px] transition-[border-color,background-color] duration-300 hover:border-[rgba(239,232,218,.37)] hover:bg-[#292b25]"
            >
              <a href={`/u/${encodeURIComponent(member.name)}`} className="flex items-center gap-3">
                <img
                  src={src}
                  alt={member.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  title={
                    member.retiredSince
                      ? copy.retiredTitle.replace('{reason}', language === 'ru' ? (member.retirementReason ?? copy.left) : copy.left).replace('{year}', String(member.retiredSince))
                      : undefined
                  }
                  className={`size-16 shrink-0 rounded-[9px] border border-[rgba(239,232,218,.22)] bg-[#32342e] object-cover transition duration-300 ${
                    member.retiredSince
                      ? 'grayscale opacity-65 group-hover:grayscale-0 group-hover:opacity-100'
                      : ''
                  }`}
                  onError={(event) => {
                    const img = event.currentTarget as HTMLImageElement;
                    if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
                  }}
                />
                <div className="min-w-0">
                  <div className="truncate font-[Onest] text-[18px] font-semibold tracking-[-.025em] text-[#f2efe9]">{member.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] leading-5 text-[#beb7aa]">
                    <span className={member.retiredSince ? 'line-through decoration-slate-500' : undefined}>
                      {localizedRole(member.name, member.role, copy)}
                    </span>
                    {member.retiredSince && (
                      <span
                        className="rounded-[5px] border border-[rgba(197,170,132,.21)] bg-[rgba(197,170,132,.07)] px-1.5 py-0.5 text-[10px] tracking-wide text-[#c5aa84]"
                        title={copy.retiredTitle.replace('{reason}', language === 'ru' ? (member.retirementReason ?? copy.left) : copy.left).replace('{year}', String(member.retiredSince))}
                      >
                        retired {member.retiredSince}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function localizedRole(name: string, fallback: string, copy: typeof teamTranslations.ru | typeof teamTranslations.en) {
  if (name === 'Raijin') return copy.owner;
  if (name === 'Kelbor_Hal') return copy.juniorAdmin;
  if (name === 'Wolle') return copy.techAdmin;
  if (name === 'Sile_Scorp') return copy.designer;
  if (name === 'Explyp') return copy.python;
  return fallback;
}
