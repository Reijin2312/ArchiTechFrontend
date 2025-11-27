import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type SavedSkin = {
  id: string
  name: string
  url: string
  model: 'classic' | 'slim'
  savedAt: string
}

type SkinGalleryProps = {
  skins: SavedSkin[]
  currentSkinUrl?: string
  onSelect: (skin: SavedSkin) => void
  onDelete: (skinId: string) => void
  onSave: (name: string, url: string, model: 'classic' | 'slim') => void
  maxSkins?: number
  className?: string
}

export function SkinGallery({
  skins,
  currentSkinUrl,
  onSelect,
  onDelete,
  onSave,
  maxSkins = 10,
  className = ''
}: SkinGalleryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = (skinId: string) => {
    if (deleteConfirm === skinId) {
      onDelete(skinId)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(skinId)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-300">
          Сохранённые скины ({skins.length}/{maxSkins})
        </div>
        {currentSkinUrl && skins.length < maxSkins && (
          <button
            type="button"
            onClick={() => {
              const name = prompt('Название скина:')
              if (name) onSave(name.trim(), currentSkinUrl, 'classic')
            }}
            className="rounded-lg border border-sky-700 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-900/20"
          >
            💾 Сохранить текущий
          </button>
        )}
      </div>

      {skins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
          <div className="mb-2 text-2xl">👕</div>
          У вас пока нет сохранённых скинов
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {skins.map((skin) => {
              const isCurrent = skin.url === currentSkinUrl
              return (
                <motion.div
                  key={skin.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`group relative overflow-hidden rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-sky-500 ring-2 ring-sky-500/40'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(skin)}
                    className="w-full"
                  >
                    <div className="aspect-square w-full bg-slate-900">
                      <img
                        src={skin.url}
                        alt={skin.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="bg-slate-900/80 px-2 py-1.5 backdrop-blur-sm">
                      <div className="truncate text-xs font-medium text-slate-200">
                        {skin.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {skin.model === 'slim' ? 'Slim' : 'Classic'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(skin.id)}
                    className={`absolute right-2 top-2 rounded-lg border px-2 py-1 text-xs transition-all ${
                      deleteConfirm === skin.id
                        ? 'border-red-700 bg-red-900/80 text-red-200'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                    title={deleteConfirm === skin.id ? 'Нажмите ещё раз для удаления' : 'Удалить'}
                  >
                    {deleteConfirm === skin.id ? '⚠️' : '🗑️'}
                  </button>

                  {isCurrent && (
                    <div className="absolute left-2 top-2 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-medium text-white">
                      ✓ Текущий
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
