import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  className?: string
}

const PRESET_COLORS = [
  '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#64748b',
]

/**
 * Color picker with gradient panel and presets
 */
export function ColorPicker({ value, onChange, className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hue, setHue] = useState(200)
  const [saturation, setSaturation] = useState(80)
  const [lightness, setLightness] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)

  // Parse HSL from hex
  useEffect(() => {
    if (!value.startsWith('#')) return
    const hex = value.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    setHue(Math.round(h * 360))
    setSaturation(Math.round(s * 100))
    setLightness(Math.round(l * 100))
  }, [value])

  // Convert HSL to Hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100
    const a = (s * Math.min(l, 1 - l)) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientRef.current) return
    const rect = gradientRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newSat = Math.round((x / rect.width) * 100)
    const newLight = Math.round(100 - (y / rect.height) * 100)
    setSaturation(newSat)
    setLightness(newLight)
    onChange(hslToHex(hue, newSat, newLight))
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const currentColor = hslToHex(hue, saturation, lightness)

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-500 transition-colors"
      >
        <div
          className="h-6 w-6 rounded border border-slate-600"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-mono uppercase">{value}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
          >
            {/* Gradient Picker */}
            <div
              ref={gradientRef}
              onClick={handleGradientClick}
              className="relative h-40 w-full cursor-crosshair rounded-lg"
              style={{
                background: `linear-gradient(to bottom, 
                  hsl(${hue}, 100%, 100%) 0%, 
                  hsl(${hue}, 100%, 50%) 50%, 
                  hsl(${hue}, 100%, 0%) 100%),
                  linear-gradient(to right, 
                  hsl(${hue}, 0%, 50%) 0%, 
                  hsl(${hue}, 100%, 50%) 100%)`,
                backgroundBlendMode: 'multiply',
              }}
            >
              {/* Cursor */}
              <div
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
                style={{
                  left: `${saturation}%`,
                  top: `${100 - lightness}%`,
                  backgroundColor: currentColor,
                }}
              />
            </div>

            {/* Hue Slider */}
            <div className="mt-3">
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => {
                  const newHue = parseInt(e.target.value)
                  setHue(newHue)
                  onChange(hslToHex(newHue, saturation, lightness))
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
            </div>

            {/* Preset Colors */}
            <div className="mt-3 grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange(color)}
                  className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${
                    value.toLowerCase() === color.toLowerCase()
                      ? 'border-white ring-2 ring-sky-500'
                      : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Hex Input */}
            <div className="mt-3">
              <input
                type="text"
                value={currentColor}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    onChange(val)
                  }
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center text-xs font-mono uppercase outline-none focus:border-slate-500"
                placeholder="#0ea5e9"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
