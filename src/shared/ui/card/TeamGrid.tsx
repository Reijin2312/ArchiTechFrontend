import { motion, type Variants } from 'framer-motion';
import type { TeamMember } from '@/shared/data/team';
import { TEAM_AVATAR_FALLBACK } from '@/shared/data/team';

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
        className="relative overflow-hidden rounded-2xl border border-sky-500/40 bg-linear-to-br from-slate-900/85 via-slate-900/65 to-sky-950/35 p-5 shadow-[0_14px_38px_rgba(2,6,23,0.55)]"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-indigo-500/18 blur-3xl" />

        <a href={`/u/${encodeURIComponent(leader.name)}`} className="relative z-10 block">
          <div className="text-[10px] uppercase tracking-[0.16em] text-sky-300/90">Координация развития проекта</div>
          <div className="mt-3 flex items-center gap-4">
            <img
              src={leaderSrc}
              alt={leader.name}
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="size-[4.5rem] rounded-2xl border border-slate-700/90 bg-slate-800 object-cover"
              onError={(event) => {
                const img = event.currentTarget as HTMLImageElement;
                if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
              }}
            />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-100">{leader.name}</div>
              <div className="text-sm text-slate-300">{leader.role}</div>
            </div>
          </div>
        </a>
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
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/60 to-slate-900/20 p-4 backdrop-blur-md backdrop-saturate-150 will-change-transform"
            >
              <a href={`/u/${encodeURIComponent(member.name)}`} className="flex items-center gap-3">
                <img
                  src={src}
                  alt={member.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="size-12 rounded-xl border border-slate-700 bg-slate-800 object-cover"
                  onError={(event) => {
                    const img = event.currentTarget as HTMLImageElement;
                    if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
                  }}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{member.name}</div>
                  <div className="text-sm text-slate-400">{member.role}</div>
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

