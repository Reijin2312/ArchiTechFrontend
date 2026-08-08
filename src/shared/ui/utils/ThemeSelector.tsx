import { useState } from 'react'
import { motion } from 'framer-motion'
import { ColorPicker } from '../form/ColorPicker'
import { useI18n } from '@/shared/i18n/I18nProvider'

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
  const { language } = useI18n()
  const themeNames: Record<string, string> = language === 'ru'
    ? { default: 'По умолчанию', ocean: 'Океан', sunset: 'Закат', forest: 'Лес', purple: 'Аметист', fire: 'Огонь' }
    : { default: 'Default', ocean: 'Ocean', sunset: 'Sunset', forest: 'Forest', purple: 'Amethyst', fire: 'Fire' }
  const [localColor1, setLocalColor1] = useState(customColor1 || '#0ea5e9')
  const [localColor2, setLocalColor2] = useState(customColor2 || '#1e40af')
  
  const isCustom = value === 'custom'

  return (
    <div className={className}>
      <div className="mb-3 text-sm font-semibold text-slate-300">{language === 'ru' ? 'Тема профиля' : 'Profile theme'}</div>
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
                <span className="text-sm font-medium text-white">{themeNames[theme.id]}</span>
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
            <span className="text-sm font-medium text-white">🎨 {language === 'ru' ? 'Своя тема' : 'Custom theme'}</span>
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

      {isCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
        >
          <div>
            <label className="mb-2 block text-xs text-slate-400">{language === 'ru' ? 'Первый цвет' : 'First color'}</label>
            <ColorPicker
              value={localColor1}
              onChange={(color) => {
                setLocalColor1(color)
                onChange('custom', color, localColor2)
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">{language === 'ru' ? 'Второй цвет' : 'Second color'}</label>
            <ColorPicker
              value={localColor2}
              onChange={(color) => {
                setLocalColor2(color)
                onChange('custom', localColor1, color)
              }}
            />
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <div className="mb-1 text-xs text-slate-400">{language === 'ru' ? 'Предпросмотр:' : 'Preview:'}</div>
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

const GRADIENT_ALPHA = 0.65

function toRgbaWithAlpha(color: string, alpha: number) {
  const trimmed = color.trim()

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    if (hex.length !== 3 && hex.length !== 6) return trimmed

    const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)

    if ([r, g, b].some((v) => Number.isNaN(v))) return trimmed
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/)
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(/[\s,\/]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => parseInt(part, 10))

    if (parts.length === 3 && parts.every((v) => !Number.isNaN(v))) {
      const [r, g, b] = parts
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }

  return trimmed
}

function buildGradient(colorA: string, colorB: string, alpha = GRADIENT_ALPHA) {
  return `linear-gradient(to bottom right, ${toRgbaWithAlpha(colorA, alpha)}, ${toRgbaWithAlpha(colorB, alpha)})`
}

export function getThemeGradient(themeId?: string, color1?: string, color2?: string): string {
  if (!themeId) return ''
  
  if (themeId === 'custom' && color1 && color2) {
    return buildGradient(color1, color2)
  }
  
  const gradientMap: Record<string, string> = {
    'default': buildGradient('rgb(15 23 42)', 'rgb(2 6 23)'),
    'ocean': buildGradient('rgb(22 78 99)', 'rgb(23 37 84)'),
    'sunset': buildGradient('rgb(124 45 18)', 'rgb(76 5 25)'),
    'forest': buildGradient('rgb(6 78 59)', 'rgb(5 46 22)'),
    'purple': buildGradient('rgb(88 28 135)', 'rgb(49 46 129)'),
    'fire': buildGradient('rgb(127 29 29)', 'rgb(67 20 7)'),
  }
  
  return gradientMap[themeId] || ''
}
