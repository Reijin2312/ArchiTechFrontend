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
        'grid gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.44fr)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      variants={disableMotion ? undefined : teamContainer}
    >
      <motion.div
        variants={disableMotion ? undefined : teamItem}
        whileHover={disableMotion ? undefined : { y: -4, scale: 1.005 }}
        whileTap={disableMotion ? undefined : { scale: 0.995 }}
        className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-sky-500/40 bg-linear-to-br from-slate-900/72 via-slate-900/56 to-sky-950/30 p-5 backdrop-blur-md backdrop-saturate-150 shadow-[0_14px_38px_rgba(2,6,23,0.55)]"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-indigo-500/18 blur-3xl" />

        <div className="relative z-10 flex items-stretch gap-4">
          <a href={`/u/${encodeURIComponent(leader.name)}`} className="shrink-0 self-stretch">
            <img
              src={leaderSrc}
              alt={leader.name}
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="h-full min-h-28 w-28 rounded-2xl border border-slate-700/90 bg-slate-800 object-cover"
              onError={(event) => {
                const img = event.currentTarget as HTMLImageElement;
                if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
              }}
            />
          </a>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="text-[10px] uppercase tracking-[0.16em] text-sky-300/90">{copy.lead}</div>
            <a href={`/u/${encodeURIComponent(leader.name)}`} className="mt-2 block min-w-0">
              <div className="truncate text-lg font-semibold text-slate-100">{leader.name}</div>
              <div className="text-sm text-slate-300">{localizedRole(leader.name, leader.role, copy)}</div>
            </a>

            {(leader.curseForgeUrl || leader.modrinthUrl || leader.githubUrl) && (
              <div className="mt-3 flex items-center gap-3">
                {leader.curseForgeUrl && (
                  <a
                    href={leader.curseForgeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid size-9 place-items-center text-[#f16436] transition-transform hover:scale-110 hover:text-[#ff8158]"
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
                    className="grid size-9 place-items-center text-[#00af5c] transition-transform hover:scale-110 hover:text-[#36d17b]"
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
                    className="grid size-9 place-items-center text-slate-300 transition-transform hover:scale-110 hover:text-white"
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
              whileHover={disableMotion ? undefined : { y: -4, scale: 1.01 }}
              whileTap={disableMotion ? undefined : { scale: 0.99 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/60 to-slate-900/20 p-4 backdrop-blur-md backdrop-saturate-150 will-change-transform"
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
                  className={`size-12 rounded-xl border border-slate-700 bg-slate-800 object-cover transition duration-300 ${
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
                  <div className="truncate font-medium">{member.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
                    <span className={member.retiredSince ? 'line-through decoration-slate-500' : undefined}>
                      {localizedRole(member.name, member.role, copy)}
                    </span>
                    {member.retiredSince && (
                      <span
                        className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500"
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
