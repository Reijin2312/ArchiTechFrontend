import { motion } from 'framer-motion';

interface UploadProgressProps {
  progress: number; // 0-100
  onCancel?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { circle: 40, stroke: 3, text: 'text-xs' },
  md: { circle: 60, stroke: 4, text: 'text-sm' },
  lg: { circle: 80, stroke: 5, text: 'text-base' },
};

/**
 * Круговой индикатор прогресса загрузки
 */
export function UploadProgress({
  progress,
  onCancel,
  className = '',
  size = 'md',
}: UploadProgressProps) {
  const { circle, stroke, text } = sizeMap[size];
  const radius = (circle - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={circle} height={circle} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={circle / 2}
          cy={circle / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-slate-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={circle / 2}
          cy={circle / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-500"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {onCancel ? (
          <button
            onClick={onCancel}
            className="hover:bg-red-500/20 rounded-full p-1 transition-colors"
            title="Отменить загрузку"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <span className={`font-semibold text-slate-200 ${text}`}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
}
