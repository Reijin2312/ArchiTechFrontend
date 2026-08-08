import { useState, useCallback, type DragEvent } from 'react'
import { useI18n } from '@/shared/i18n/I18nProvider'

type DragDropZoneProps = {
  onFile: (file: File) => void
  accept?: string
  maxSize?: number
  children: React.ReactNode
  className?: string
}

export function DragDropZone({ onFile, accept, maxSize = 2 * 1024 * 1024, children, className = '' }: DragDropZoneProps) {
  const { language } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setError(null)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]

        if (accept) {
          const acceptedTypes = accept.split(',').map((t) => t.trim())
          const fileType = file.type
          const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

          const isAccepted = acceptedTypes.some(
            (type) =>
              type === fileType ||
              type === fileExt ||
              (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
          )

          if (!isAccepted) {
            setError(language === 'ru' ? `Разрешены только: ${accept}` : `Allowed formats: ${accept}`)
            return
          }
        }

        if (file.size > maxSize) {
          setError(language === 'ru' ? `Файл слишком большой (макс. ${(maxSize / 1024 / 1024).toFixed(1)} МБ)` : `File is too large (${(maxSize / 1024 / 1024).toFixed(1)} MB max)`)
          return
        }

        onFile(file)
      }
    },
    [onFile, accept, maxSize, language]
  )

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative transition-all ${className}`}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-500 bg-sky-500/10 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-2xl mb-2">📁</div>
            <div className="text-sm font-medium text-sky-300">{language === 'ru' ? 'Отпустите файл' : 'Drop the file'}</div>
          </div>
        </div>
      )}
      {children}
      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  )
}
