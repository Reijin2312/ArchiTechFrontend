import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Skin3DViewer } from './Skin3DViewer'

type Skin3DPreviewProps = {
  skinUrl: string
  className?: string
  autoRotate?: boolean
  compact?: boolean
}

export function Skin3DPreview({ skinUrl, className = '', autoRotate = false, compact = false }: Skin3DPreviewProps) {
  const [loading] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl z-10"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
          </motion.div>
        )}
      </AnimatePresence>
      <Skin3DViewer
        skinUrl={skinUrl}
        autoRotate={autoRotate}
        className="h-full w-full"
      />
    </div>
  )
}
