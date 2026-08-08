import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const LINK_WRAP_SEPARATOR_PATTERN = /([/?#&=._-])/g;
const MAX_ENTITIES = 128;
const AUTOLINK_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s<]*)?/gi;
const MARKERS = [
    { marker: '```', type: 'PRE' },
    { marker: '**', type: 'BOLD' },
    { marker: '__', type: 'UNDERLINE' },
    { marker: '~~', type: 'STRIKETHROUGH' },
    { marker: '||', type: 'SPOILER' },
    { marker: '`', type: 'CODE' },
    { marker: '_', type: 'ITALIC' }
];
const MARKERS_BY_LENGTH = [...MARKERS].sort((left, right) => right.marker.length - left.marker.length);
export function buildMessageTextAndEntities(input) {
    if (!input) {
        return { content: '', entities: [] };
    }
    let cursor = 0;
    let plainText = '';
    const openByMarker = new Map();
    for (const marker of MARKERS) {
        openByMarker.set(marker.marker, []);
    }
    const entities = [];
    while (cursor < input.length) {
        const marker = MARKERS_BY_LENGTH.find((item) => input.startsWith(item.marker, cursor));
        if (!marker) {
            plainText += input[cursor];
            cursor += 1;
            continue;
        }
        const preStack = openByMarker.get('```') ?? [];
        const codeStack = openByMarker.get('`') ?? [];
        const activeCodeMarker = preStack.length > 0 ? '```' : codeStack.length > 0 ? '`' : null;
        if (activeCodeMarker && marker.marker !== activeCodeMarker) {
            plainText += input[cursor];
            cursor += 1;
            continue;
        }
        const markerStack = openByMarker.get(marker.marker);
        if (markerStack.length > 0) {
            const opened = markerStack.pop();
            const length = plainText.length - opened.offset;
            if (length > 0) {
                entities.push({
                    offset: opened.offset,
                    length,
                    type: marker.type
                });
            }
        }
        else {
            markerStack.push({
                offset: plainText.length
            });
        }
        cursor += marker.marker.length;
    }
    const hasUnclosedMarkers = [...openByMarker.values()].some((stack) => stack.length > 0);
    if (hasUnclosedMarkers) {
        return { content: input, entities: [] };
    }
    entities.push(...detectAutoLinkEntities(plainText, entities));
    const normalized = entities
        .sort((left, right) => {
        if (left.offset !== right.offset)
            return left.offset - right.offset;
        if (left.length !== right.length)
            return right.length - left.length;
        return left.type.localeCompare(right.type);
    })
        .filter((entity, index, list) => {
        if (index === 0)
            return true;
        const previous = list[index - 1];
        return !(previous.offset === entity.offset &&
            previous.length === entity.length &&
            previous.type === entity.type &&
            previous.url === entity.url &&
            previous.language === entity.language);
    })
        .slice(0, MAX_ENTITIES);
    return {
        content: plainText,
        entities: normalized
    };
}
export function renderMessageContent(content, entities) {
    const validEntities = buildEntitiesWithAutoLinks(content, entities);
    if (!validEntities.length) {
        return _jsx("span", { className: "whitespace-pre-wrap break-words", children: content });
    }
    const boundaries = new Set([0, content.length]);
    for (const entity of validEntities) {
        boundaries.add(entity.offset);
        boundaries.add(entity.offset + entity.length);
    }
    const ordered = [...boundaries].sort((left, right) => left - right);
    const nodes = [];
    for (let i = 0; i < ordered.length - 1; i++) {
        const from = ordered[i];
        const to = ordered[i + 1];
        if (to <= from)
            continue;
        const textPart = content.slice(from, to);
        if (!textPart)
            continue;
        const active = validEntities
            .filter((entity) => entity.offset <= from && entity.offset + entity.length >= to)
            .sort((left, right) => {
            if (left.length !== right.length)
                return right.length - left.length;
            return left.type.localeCompare(right.type);
        });
        const node = active.reduceRight((child, entity, idx) => wrapEntityNode(child, entity, `${from}-${to}-${idx}`), textPart);
        nodes.push(_jsx("span", { children: node }, `${from}-${to}`));
    }
    return _jsx("span", { className: "whitespace-pre-wrap break-words", children: nodes });
}
export function extractMessageLinks(content, entities) {
    const resolved = buildEntitiesWithAutoLinks(content, entities)
        .filter((entity) => entity.type === 'LINK' && !!entity.url)
        .sort((left, right) => left.offset - right.offset);
    const unique = new Set();
    const output = [];
    for (const entity of resolved) {
        const href = entity.url;
        if (!href || unique.has(href))
            continue;
        unique.add(href);
        output.push({
            text: content.slice(entity.offset, entity.offset + entity.length),
            href,
            offset: entity.offset,
            length: entity.length
        });
    }
    return output;
}
function buildEntitiesWithAutoLinks(content, entities) {
    const baseEntities = normalizeEntitiesForRender(content, entities);
    return normalizeEntitiesForRender(content, [
        ...baseEntities,
        ...detectAutoLinkEntities(content, baseEntities)
    ]);
}
function normalizeEntitiesForRender(content, entities) {
    if (!entities || entities.length === 0)
        return [];
    const totalLength = content.length;
    return entities
        .filter((entity) => {
        if (!entity)
            return false;
        if (!Number.isInteger(entity.offset) || !Number.isInteger(entity.length))
            return false;
        if (entity.offset < 0 || entity.length <= 0)
            return false;
        if (entity.offset + entity.length > totalLength)
            return false;
        return true;
    })
        .slice(0, MAX_ENTITIES);
}
function wrapEntityNode(node, entity, key) {
    switch (entity.type) {
        case 'BOLD':
            return (_jsx("strong", { className: "font-semibold", children: node }, key));
        case 'ITALIC':
            return (_jsx("em", { className: "italic", children: node }, key));
        case 'UNDERLINE':
            return (_jsx("span", { className: "underline underline-offset-2", children: node }, key));
        case 'STRIKETHROUGH':
            return (_jsx("span", { className: "line-through", children: node }, key));
        case 'SPOILER':
            return (_jsx("span", { className: "rounded px-1 bg-slate-700 text-slate-700 hover:text-slate-100 transition-colors", children: node }, key));
        case 'CODE':
            return (_jsx("code", { className: "rounded bg-slate-800/80 px-1 py-0.5 font-mono text-[0.92em]", children: node }, key));
        case 'PRE':
            return (_jsx("code", { className: "block rounded bg-slate-800/80 px-2 py-1 font-mono text-[0.92em] whitespace-pre-wrap", children: node }, key));
        case 'LINK': {
            const href = entity.url;
            if (!href)
                return _jsx(_Fragment, { children: node });
            const renderedLinkNode = typeof node === 'string' ? renderLinkTextWithSoftWrap(node, key) : node;
            return (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", className: "inline max-w-full whitespace-normal underline decoration-1 underline-offset-2 text-indigo-300 hover:text-indigo-200 break-normal [overflow-wrap:normal]", children: renderedLinkNode }, key));
        }
        default:
            return node;
    }
}
function renderLinkTextWithSoftWrap(text, keyPrefix) {
    const parts = text.split(LINK_WRAP_SEPARATOR_PATTERN);
    if (parts.length <= 1) {
        return [text];
    }
    return parts.map((part, index) => {
        if (!part)
            return null;
        const isSeparator = part.length === 1 && '/?#&=._-'.includes(part);
        return (_jsxs("span", { children: [part, isSeparator ? _jsx("wbr", {}) : null] }, `${keyPrefix}-${index}`));
    });
}
function detectAutoLinkEntities(content, entities) {
    if (!content)
        return [];
    const output = [];
    const matcher = new RegExp(AUTOLINK_PATTERN.source, AUTOLINK_PATTERN.flags);
    let match = null;
    while ((match = matcher.exec(content))) {
        const raw = match[0];
        const start = match.index;
        if (!raw || start == null)
            continue;
        if (start > 0 && content[start - 1] === '@')
            continue;
        const trimmedRaw = trimLinkEnding(raw);
        if (!trimmedRaw)
            continue;
        const end = start + trimmedRaw.length;
        const blocked = entities.some((entity) => {
            const entityStart = entity.offset;
            const entityEnd = entity.offset + entity.length;
            const overlaps = start < entityEnd && end > entityStart;
            if (!overlaps)
                return false;
            return entity.type === 'LINK' || entity.type === 'CODE' || entity.type === 'PRE';
        });
        if (blocked)
            continue;
        output.push({
            offset: start,
            length: trimmedRaw.length,
            type: 'LINK',
            url: toAbsoluteLink(trimmedRaw)
        });
        if (output.length >= MAX_ENTITIES)
            break;
    }
    return output;
}
function trimLinkEnding(value) {
    let next = value;
    while (next.length > 0) {
        const last = next[next.length - 1];
        if ('.!,?:;'.includes(last)) {
            next = next.slice(0, -1);
            continue;
        }
        if (last === ')' && hasMoreClosing(next, '(', ')')) {
            next = next.slice(0, -1);
            continue;
        }
        if (last === ']' && hasMoreClosing(next, '[', ']')) {
            next = next.slice(0, -1);
            continue;
        }
        if (last === '}' && hasMoreClosing(next, '{', '}')) {
            next = next.slice(0, -1);
            continue;
        }
        break;
    }
    return next;
}
function hasMoreClosing(value, open, close) {
    const opens = [...value].filter((char) => char === open).length;
    const closes = [...value].filter((char) => char === close).length;
    return closes > opens;
}
function toAbsoluteLink(value) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    return `https://${value}`;
}
