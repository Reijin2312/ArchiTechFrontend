import { useState } from 'react'
import { DragDropZone } from './DragDropZone'

type ProfileBannerProps = {
  bannerUrl?: string
  editable?: boolean
  onUpload?: (file: File) => void
  loading?: boolean
  className?: string
}

export function ProfileBanner({ bannerUrl, editable = false, onUpload, loading = false, className = '' }: ProfileBannerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (!editable || !onUpload) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
    onUpload(file)
  }

  const displayUrl = previewUrl || bannerUrl

  return (
    <DragDropZone
      onFile={handleFile}
      accept="image/*"
      maxSize={5 * 1024 * 1024}
      className={className}
    >
      <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-indigo-950/50 via-slate-900/50 to-slate-950/50">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Баннер профиля"
            className="h-full w-full object-cover pointer-events-none"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center pointer-events-none">
            <div className="text-center text-slate-500">
              <div className="mb-2 text-4xl">🖼️</div>
              {editable && <div className="text-sm">Перетащите изображение или кликните для загрузки</div>}
            </div>
          </div>
        )}

        {editable && (
          <label className="absolute bottom-4 right-4 z-20 cursor-pointer rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm backdrop-blur-sm hover:border-slate-500 transition-colors pointer-events-auto">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
              className="hidden"
            />
            📷 Изменить баннер
          </label>
        )}

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
          </div>
        )}
      </div>
    </DragDropZone>
  )
}
