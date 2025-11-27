import { motion } from 'framer-motion'

type BadgeProps = {
  icon: string
  title: string
  description: string
  unlocked?: boolean
  unlockedAt?: string
  onClick?: () => void
  className?: string
}

export function Badge({ icon, title, description, unlocked = false, unlockedAt, onClick, className = '' }: BadgeProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!unlocked}
      whileHover={unlocked ? { scale: 1.05, y: -2 } : undefined}
      whileTap={unlocked ? { scale: 0.98 } : undefined}
      className={`group relative rounded-xl border p-3 text-left transition-all ${
        unlocked
          ? 'border-amber-700/50 bg-linear-to-br from-amber-900/30 to-slate-900/30 hover:border-amber-600 cursor-pointer'
          : 'border-slate-800 bg-slate-900/40 opacity-60 cursor-not-allowed'
      } ${className}`}
      title={unlocked && unlockedAt ? `Получено: ${new Date(unlockedAt).toLocaleDateString()}` : undefined}
    >
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
          <div className="text-2xl">🔒</div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${unlocked ? 'text-amber-300' : 'text-slate-400'}`}>
            {title}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 line-clamp-2">{description}</div>
        </div>
      </div>
    </motion.button>
  )
}
