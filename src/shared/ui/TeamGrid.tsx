import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  return (
    <motion.div
      className={['grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className].filter(Boolean).join(' ')}
      variants={disableMotion ? undefined : teamContainer}
    >
      {team.map((member) => {
        const src = avatars[member.name] || TEAM_AVATAR_FALLBACK;
        return (
          <motion.div
            key={member.name}
            variants={disableMotion ? undefined : teamItem}
            whileHover={disableMotion ? undefined : { y: -4, scale: 1.01 }}
            whileTap={disableMotion ? undefined : { scale: 0.99 }}
            className="relative rounded-2xl border border-slate-800 p-4 bg-linear-to-b from-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden will-change-transform"
          >
            <Link to={`/u/${encodeURIComponent(member.name)}`} className="flex items-center gap-3">
              <img
                src={src}
                alt={member.name}
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="size-12 rounded-xl object-cover border border-slate-700 bg-slate-800"
                onError={(event) => {
                  const img = event.currentTarget as HTMLImageElement;
                  if (!img.src.endsWith(TEAM_AVATAR_FALLBACK)) img.src = TEAM_AVATAR_FALLBACK;
                }}
              />
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-slate-400">{member.role}</div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

