import { useState } from 'react'
import { motion } from 'framer-motion'
import { ColorPicker } from '../form/ColorPicker'

type ProfileTheme = {
  id: string
  name: string
  gradient: string
  preview: string
}

const THEMES: ProfileTheme[] = [
  {
    id: 'default',
    name: 'По умолчанию',
    gradient: 'from-slate-900 to-slate-950',
    preview: 'bg-linear-to-br from-slate-900 to-slate-950'
  },
  {
    id: 'ocean',
    name: 'Океан',
    gradient: 'from-cyan-900 to-blue-950',
    preview: 'bg-linear-to-br from-cyan-900 to-blue-950'
  },
  {
    id: 'sunset',
    name: 'Закат',
    gradient: 'from-orange-900 to-rose-950',
    preview: 'bg-linear-to-br from-orange-900 to-rose-950'
  },
  {
    id: 'forest',
    name: 'Лес',
    gradient: 'from-emerald-900 to-green-950',
    preview: 'bg-linear-to-br from-emerald-900 to-green-950'
  },
  {
    id: 'purple',
    name: 'Аметист',
    gradient: 'from-purple-900 to-indigo-950',
    preview: 'bg-linear-to-br from-purple-900 to-indigo-950'
  },
  {
    id: 'fire',
    name: 'Огонь',
    gradient: 'from-red-900 to-orange-950',
    preview: 'bg-linear-to-br from-red-900 to-orange-950'
  },
]

type ThemeSelectorProps = {
  value?: string
  customColor1?: string
  customColor2?: string
  onChange: (themeId: string, color1?: string, color2?: string) => void
  className?: string
}

export function ThemeSelector({ value = 'default', customColor1, customColor2, onChange, className = '' }: ThemeSelectorProps) {
  const [localColor1, setLocalColor1] = useState(customColor1 || '#0ea5e9')
  const [localColor2, setLocalColor2] = useState(customColor2 || '#1e40af')
  
  const isCustom = value === 'custom'

  return (
    <div className={className}>
      <div className="mb-3 text-sm font-semibold text-slate-300">Тема профиля</div>
      <div className="grid grid-cols-3 gap-3">
        {THEMES.map((theme) => {
          const isSelected = value === theme.id
          return (
            <motion.button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative overflow-hidden rounded-xl border transition-all ${
                isSelected
                  ? 'border-sky-500 ring-2 ring-sky-500/40'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className={`h-20 w-full ${theme.preview}`} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium text-white">{theme.name}</span>
              </div>
              {isSelected && (
                <motion.div
                  layoutId="selected-theme"
                  className="absolute inset-0 border-2 border-sky-500 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
        
        {/* Custom Theme */}
        <motion.button
          type="button"
          onClick={() => onChange('custom', localColor1, localColor2)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative overflow-hidden rounded-xl border transition-all ${
            isCustom
              ? 'border-sky-500 ring-2 ring-sky-500/40'
              : 'border-slate-700 hover:border-slate-500'
          }`}
        >
          <div 
            className="h-20 w-full"
            style={{
              background: `linear-gradient(to bottom right, ${localColor1}, ${localColor2})`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-sm font-medium text-white">🎨 Своя тема</span>
          </div>
          {isCustom && (
            <motion.div
              layoutId="selected-theme"
              className="absolute inset-0 border-2 border-sky-500 rounded-xl"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      </div>

      {/* Custom Color Pickers */}
      {isCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
        >
          <div>
            <label className="mb-2 block text-xs text-slate-400">Первый цвет</label>
            <ColorPicker
              value={localColor1}
              onChange={(color) => {
                setLocalColor1(color)
                onChange('custom', color, localColor2)
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">Второй цвет</label>
            <ColorPicker
              value={localColor2}
              onChange={(color) => {
                setLocalColor2(color)
                onChange('custom', localColor1, color)
              }}
            />
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <div className="mb-1 text-xs text-slate-400">Предпросмотр:</div>
            <div 
              className="h-16 rounded-lg"
              style={{
                background: `linear-gradient(to bottom right, ${localColor1}, ${localColor2})`
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Helper function to get CSS gradient string for inline styles
 */
export function getThemeGradient(themeId?: string, color1?: string, color2?: string): string {
  if (!themeId) return ''
  
  // Custom theme
  if (themeId === 'custom' && color1 && color2) {
    return `linear-gradient(to bottom right, ${color1}, ${color2})`
  }
  
  // Convert TailwindCSS gradient to inline CSS style
  const gradientMap: Record<string, string> = {
    'default': 'linear-gradient(to bottom right, rgb(15 23 42), rgb(2 6 23))',
    'ocean': 'linear-gradient(to bottom right, rgb(22 78 99), rgb(23 37 84))',
    'sunset': 'linear-gradient(to bottom right, rgb(124 45 18), rgb(76 5 25))',
    'forest': 'linear-gradient(to bottom right, rgb(6 78 59), rgb(5 46 22))',
    'purple': 'linear-gradient(to bottom right, rgb(88 28 135), rgb(49 46 129))',
    'fire': 'linear-gradient(to bottom right, rgb(127 29 29), rgb(67 20 7))',
  }
  
  return gradientMap[themeId] || ''
}
