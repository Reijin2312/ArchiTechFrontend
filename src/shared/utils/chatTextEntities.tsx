import type { ReactNode } from 'react'
import type { ChatMessageEntity, ChatMessageEntityType } from '@/shared/api/types'

type MarkerDefinition = {
  marker: string
  type: ChatMessageEntityType
}

type OpenMarker = {
  offset: number
}

const MAX_ENTITIES = 128

const MARKERS: MarkerDefinition[] = [
  { marker: '```', type: 'PRE' },
  { marker: '**', type: 'BOLD' },
  { marker: '__', type: 'UNDERLINE' },
  { marker: '~~', type: 'STRIKETHROUGH' },
  { marker: '||', type: 'SPOILER' },
  { marker: '`', type: 'CODE' },
  { marker: '_', type: 'ITALIC' }
]

const MARKERS_BY_LENGTH = [...MARKERS].sort((left, right) => right.marker.length - left.marker.length)

export function buildMessageTextAndEntities(input: string): {
  content: string
  entities: ChatMessageEntity[]
} {
  if (!input) {
    return { content: '', entities: [] }
  }

  let cursor = 0
  let plainText = ''
  const openByMarker = new Map<string, OpenMarker[]>()
  for (const marker of MARKERS) {
    openByMarker.set(marker.marker, [])
  }
  const entities: ChatMessageEntity[] = []

  while (cursor < input.length) {
    const marker = MARKERS_BY_LENGTH.find((item) => input.startsWith(item.marker, cursor))

    if (!marker) {
      plainText += input[cursor]
      cursor += 1
      continue
    }

    const preStack = openByMarker.get('```') ?? []
    const codeStack = openByMarker.get('`') ?? []
    const activeCodeMarker = preStack.length > 0 ? '```' : codeStack.length > 0 ? '`' : null

    if (activeCodeMarker && marker.marker !== activeCodeMarker) {
      plainText += input[cursor]
      cursor += 1
      continue
    }

    const markerStack = openByMarker.get(marker.marker)!
    if (markerStack.length > 0) {
      const opened = markerStack.pop()!
      const length = plainText.length - opened.offset
      if (length > 0) {
        entities.push({
          offset: opened.offset,
          length,
          type: marker.type
        })
      }
    } else {
      markerStack.push({
        offset: plainText.length
      })
    }

    cursor += marker.marker.length
  }

  const hasUnclosedMarkers = [...openByMarker.values()].some((stack) => stack.length > 0)
  if (hasUnclosedMarkers) {
    return { content: input, entities: [] }
  }

  const normalized = entities
    .sort((left, right) => {
      if (left.offset !== right.offset) return left.offset - right.offset
      if (left.length !== right.length) return right.length - left.length
      return left.type.localeCompare(right.type)
    })
    .filter((entity, index, list) => {
      if (index === 0) return true
      const previous = list[index - 1]
      return !(
        previous.offset === entity.offset &&
        previous.length === entity.length &&
        previous.type === entity.type &&
        previous.url === entity.url &&
        previous.language === entity.language
      )
    })
    .slice(0, MAX_ENTITIES)

  return {
    content: plainText,
    entities: normalized
  }
}

export function renderMessageContent(
  content: string,
  entities?: ChatMessageEntity[] | null
): ReactNode {
  const validEntities = normalizeEntitiesForRender(content, entities)
  if (!validEntities.length) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>
  }

  const boundaries = new Set<number>([0, content.length])
  for (const entity of validEntities) {
    boundaries.add(entity.offset)
    boundaries.add(entity.offset + entity.length)
  }

  const ordered = [...boundaries].sort((left, right) => left - right)
  const nodes: ReactNode[] = []

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i]
    const to = ordered[i + 1]
    if (to <= from) continue

    const textPart = content.slice(from, to)
    if (!textPart) continue

    const active = validEntities
      .filter((entity) => entity.offset <= from && entity.offset + entity.length >= to)
      .sort((left, right) => {
        if (left.length !== right.length) return right.length - left.length
        return left.type.localeCompare(right.type)
      })

    const node = active.reduceRight<ReactNode>(
      (child, entity, idx) => wrapEntityNode(child, entity, `${from}-${to}-${idx}`),
      textPart
    )

    nodes.push(<span key={`${from}-${to}`}>{node}</span>)
  }

  return <span className="whitespace-pre-wrap break-words">{nodes}</span>
}

function normalizeEntitiesForRender(
  content: string,
  entities?: ChatMessageEntity[] | null
): ChatMessageEntity[] {
  if (!entities || entities.length === 0) return []
  const totalLength = content.length
  return entities
    .filter((entity) => {
      if (!entity) return false
      if (!Number.isInteger(entity.offset) || !Number.isInteger(entity.length)) return false
      if (entity.offset < 0 || entity.length <= 0) return false
      if (entity.offset + entity.length > totalLength) return false
      return true
    })
    .slice(0, MAX_ENTITIES)
}

function wrapEntityNode(node: ReactNode, entity: ChatMessageEntity, key: string): ReactNode {
  switch (entity.type) {
    case 'BOLD':
      return (
        <strong key={key} className="font-semibold">
          {node}
        </strong>
      )
    case 'ITALIC':
      return (
        <em key={key} className="italic">
          {node}
        </em>
      )
    case 'UNDERLINE':
      return (
        <span key={key} className="underline underline-offset-2">
          {node}
        </span>
      )
    case 'STRIKETHROUGH':
      return (
        <span key={key} className="line-through">
          {node}
        </span>
      )
    case 'SPOILER':
      return (
        <span
          key={key}
          className="rounded px-1 bg-slate-700 text-slate-700 hover:text-slate-100 transition-colors"
        >
          {node}
        </span>
      )
    case 'CODE':
      return (
        <code key={key} className="rounded bg-slate-800/80 px-1 py-0.5 font-mono text-[0.92em]">
          {node}
        </code>
      )
    case 'PRE':
      return (
        <code
          key={key}
          className="block rounded bg-slate-800/80 px-2 py-1 font-mono text-[0.92em] whitespace-pre-wrap"
        >
          {node}
        </code>
      )
    case 'LINK': {
      const href = entity.url
      if (!href) return <>{node}</>
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-indigo-300 hover:text-indigo-200"
        >
          {node}
        </a>
      )
    }
    default:
      return node
  }
}
