import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/shared/i18n/I18nProvider'

type StatusOption = {
  id: string
  emoji: string
  label: string
  color?: string
}

const DEFAULT_STATUSES: StatusOption[] = [
  { id: 'online', emoji: '🟢', label: 'В сети', color: 'text-emerald-400' },
  { id: 'playing', emoji: '🎮', label: 'Играю', color: 'text-sky-400' },
  { id: 'building', emoji: '🏗️', label: 'Строю', color: 'text-amber-400' },
  { id: 'afk', emoji: '💤', label: 'AFK', color: 'text-slate-400' },
  { id: 'dnd', emoji: '⛔', label: 'Не беспокоить', color: 'text-red-400' },
]

type StatusSelectProps = {
  value?: string
  customStatus?: string
  onChange: (statusId: string, customText?: string) => void
  className?: string
}

export function StatusSelect({ value, customStatus, onChange, className = '' }: StatusSelectProps) {
  const { language } = useI18n()
  const labels: Record<string, string> = language === 'ru'
    ? { online: 'В сети', playing: 'Играю', building: 'Строю', afk: 'AFK', dnd: 'Не беспокоить' }
    : { online: 'Online', playing: 'Playing', building: 'Building', afk: 'AFK', dnd: 'Do not disturb' }
  const [open, setOpen] = useState(false)
  const [editingCustom, setEditingCustom] = useState(false)
  const [customText, setCustomText] = useState(customStatus || '')

  const selected = DEFAULT_STATUSES.find((s) => s.id === value) || DEFAULT_STATUSES[0]

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm hover:border-slate-600 transition-colors"
      >
        <span className="text-lg">{selected.emoji}</span>
        <span className={selected.color || 'text-slate-300'}>
          {customStatus || labels[selected.id]}
        </span>
        <span className="ml-auto text-slate-500">▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl"
            >
              <div className="max-h-64 overflow-y-auto">
                {DEFAULT_STATUSES.map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => {
                      onChange(status.id)
                      setEditingCustom(false)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      status.id === value
                        ? 'bg-slate-800'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-lg">{status.emoji}</span>
                    <span className={status.color || 'text-slate-300'}>{labels[status.id]}</span>
                  </button>
                ))}
                <div className="border-t border-slate-800 p-2">
                  {editingCustom ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder={language === 'ru' ? 'Свой статус...' : 'Custom status...'}
                        maxLength={50}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onChange(value || 'online', customText)
                          setEditingCustom(false)
                          setOpen(false)
                        }}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCustom(true)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-300"
                    >
                      ✏️ {language === 'ru' ? 'Свой статус' : 'Custom status'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
