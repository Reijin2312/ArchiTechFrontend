import { motion } from 'framer-motion'

type ProgressBarProps = {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  className?: string
  color?: 'sky' | 'emerald' | 'amber' | 'indigo'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = '',
  color = 'sky'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const colorClasses = {
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500'
  }

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-slate-300">{label}</span>}
          {showPercentage && <span className="text-slate-400">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className={`h-full rounded-full ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
