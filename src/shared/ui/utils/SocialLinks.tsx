import { useState } from 'react'
import { SvgDiscord, SvgTelegram } from '../image/Icons'

type SocialLink = {
  type: 'discord' | 'telegram' | 'vk' | 'youtube' | 'twitch' | 'github' | 'custom'
  value: string
  label?: string
}

type SocialLinksProps = {
  links: SocialLink[] | Record<string, string>
  onChange?: (links: SocialLink[] | Record<string, string>) => void
  editable?: boolean
  readOnly?: boolean
  className?: string
}

const SOCIAL_ICONS: Record<string, { icon: React.ReactNode; placeholder: string; color: string }> = {
  discord: { icon: <SvgDiscord className="h-5" />, placeholder: 'username#1234', color: 'text-indigo-400' },
  telegram: { icon: <SvgTelegram className="h-5" />, placeholder: '@username', color: 'text-sky-400' },
  vk: { icon: '🔵', placeholder: 'vk.com/username', color: 'text-blue-400' },
  youtube: { icon: '▶️', placeholder: '@channel', color: 'text-red-400' },
  twitch: { icon: '📺', placeholder: 'username', color: 'text-purple-400' },
  github: { icon: '🐙', placeholder: 'username', color: 'text-slate-300' },
  custom: { icon: '🔗', placeholder: 'https://...', color: 'text-slate-400' },
}

export function SocialLinks({ links, onChange, editable = false, readOnly = false, className = '' }: SocialLinksProps) {
  const [editing, setEditing] = useState(false)
  
  const normalizedLinks: SocialLink[] = Array.isArray(links)
    ? links
    : Object.entries(links).map(([type, value]) => ({ 
        type: type as SocialLink['type'], 
        value: String(value) 
      }))
  
  const [editLinks, setEditLinks] = useState<SocialLink[]>(normalizedLinks)

  const handleSave = () => {
    const filtered = editLinks.filter((l) => l.value.trim())
    onChange?.(Array.isArray(links) ? filtered : Object.fromEntries(filtered.map(l => [l.type, l.value])))
    setEditing(false)
  }

  const handleAdd = (type: SocialLink['type']) => {
    setEditLinks([...editLinks, { type, value: '', label: undefined }])
  }

  const handleRemove = (index: number) => {
    setEditLinks(editLinks.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, value: string) => {
    const newLinks = [...editLinks]
    newLinks[index].value = value
    setEditLinks(newLinks)
  }

  if (editable && editing) {
    return (
      <div className={`space-y-3 ${className}`}>
        {editLinks.map((link, idx) => {
          const config = SOCIAL_ICONS[link.type] || SOCIAL_ICONS.custom
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
                {typeof config.icon === 'string' ? (
                  <span className="text-lg">{config.icon}</span>
                ) : (
                  config.icon
                )}
              </div>
              <input
                type="text"
                value={link.value}
                onChange={(e) => handleChange(idx, e.target.value)}
                placeholder={config.placeholder}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="h-10 w-10 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20"
              >
                ✕
              </button>
            </div>
          )
        })}

        <div className="flex flex-wrap gap-2">
          {Object.keys(SOCIAL_ICONS).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAdd(type as SocialLink['type'])}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500"
            >
              + {type}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditLinks(normalizedLinks)
              setEditing(false)
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500"
          >
            Сохранить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {normalizedLinks.length === 0 ? (
        editable && !readOnly ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300"
          >
            + Добавить соцсети
          </button>
        ) : (
          <div className="text-sm text-slate-500">Не указаны</div>
        )
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {normalizedLinks.map((link, idx) => {
            const config = SOCIAL_ICONS[link.type] || SOCIAL_ICONS.custom
            return (
              <a
                key={idx}
                href={link.type === 'custom' ? link.value : `#${link.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm hover:border-slate-500 transition-colors ${config.color}`}
                title={link.label || link.value}
              >
                {typeof config.icon === 'string' ? (
                  <span>{config.icon}</span>
                ) : (
                  config.icon
                )}
                <span className="max-w-[120px] truncate">{link.value}</span>
              </a>
            )
          })}
          {editable && !readOnly && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
            >
              ✏️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
