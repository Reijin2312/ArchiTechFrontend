import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../../../../shared/api/http.js';
import { endpoints } from '../../../../shared/api/endpoints.js';
import { buildMessageTextAndEntities, extractMessageLinks, renderMessageContent, } from '../../../../shared/utils/chatTextEntities.js';
import { CheckCheckIcon, PlayIcon } from '../icons.js';
import { MultiImageBubble, ReplyPreviewBlock, SingleImageBubble, } from './messageTypes/ImageMessageBubbles.js';
import { MediaViewerModal } from './messageTypes/MediaViewerModal.js';
import { formatDivider, formatDuration, formatMessageTime, getMessageAttachments, hashColor, initialOf, isMessageRead, isVideoContentType, messagePreviewText, resolveAttachmentUrl, resolveMediaUrl, } from '../utils.js';
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:$|[?#])/i;
const BUBBLE_CHAIN_WINDOW_MS = 5 * 60 * 1000;
const MESSAGE_ROW_BASE_GAP_PX = 4;
const MESSAGE_ROW_EXPANDED_GAP_PX = MESSAGE_ROW_BASE_GAP_PX * 2;
function toGroupServiceMessageType(value) {
    switch ((value || '').toLowerCase()) {
        case 'group_created':
            return 'group_created';
        case 'group_title_updated':
            return 'group_title_updated';
        case 'group_avatar_updated':
            return 'group_avatar_updated';
        case 'group_member_added':
        case 'group_members_added':
        case 'group_participants_added':
            return 'group_members_added';
        case 'group_member_removed':
        case 'group_members_removed':
            return 'group_members_removed';
        case 'group_member_left':
            return 'group_member_left';
        case 'group_admin_promoted':
            return 'group_admin_promoted';
        case 'group_admin_demoted':
            return 'group_admin_demoted';
        case 'group_owner_transferred':
            return 'group_owner_transferred';
        case 'group_description_updated':
            return 'group_description_updated';
        case 'group_public_username_updated':
            return 'group_public_username_updated';
        case 'group_slow_mode_updated':
            return 'group_slow_mode_updated';
        case 'group_history_visibility_updated':
            return 'group_history_visibility_updated';
        case 'group_permissions_updated':
            return 'group_permissions_updated';
        case 'group_admin_rights_updated':
            return 'group_admin_rights_updated';
        case 'group_member_muted':
            return 'group_member_muted';
        case 'group_member_unmuted':
            return 'group_member_unmuted';
        case 'group_member_banned':
            return 'group_member_banned';
        case 'group_member_unbanned':
            return 'group_member_unbanned';
        case 'group_message_pinned':
            return 'group_message_pinned';
        case 'group_message_unpinned':
            return 'group_message_unpinned';
        case 'group_invite_link_created':
            return 'group_invite_link_created';
        case 'group_invite_link_revoked':
            return 'group_invite_link_revoked';
        case 'group_join_request_created':
            return 'group_join_request_created';
        case 'group_join_request_approved':
            return 'group_join_request_approved';
        case 'group_join_request_declined':
            return 'group_join_request_declined';
        case 'group_topic_created':
            return 'group_topic_created';
        case 'group_topic_closed':
            return 'group_topic_closed';
        case 'group_topic_reopened':
            return 'group_topic_reopened';
        case 'group_topic_deleted':
            return 'group_topic_deleted';
        case 'reaction':
            return 'reaction';
        case 'poll_closed':
            return 'poll_closed';
        default:
            return null;
    }
}
function parseSystemPayload(content) {
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return {};
    }
    try {
        const parsed = JSON.parse(trimmed);
        const title = typeof parsed.title === 'string' && parsed.title.trim().length > 0
            ? parsed.title.trim()
            : typeof parsed.groupTitle === 'string' && parsed.groupTitle.trim().length > 0
                ? parsed.groupTitle.trim()
                : undefined;
        const avatarUrl = typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0
            ? parsed.avatarUrl.trim()
            : typeof parsed.avatarPath === 'string' && parsed.avatarPath.trim().length > 0
                ? parsed.avatarPath.trim()
                : undefined;
        return { title, avatarUrl };
    }
    catch {
        return {};
    }
}
function parseAddedMembers(content) {
    const trimmed = content.trim();
    if (!trimmed) {
        return [];
    }
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        const lowered = trimmed.toLowerCase();
        if (lowered.includes('РґРѕР±Р°РІ') || lowered.includes('added')) {
            return [];
        }
        return trimmed
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
    }
    try {
        const parsed = JSON.parse(trimmed);
        const candidates = [
            parsed.addedUsers,
            parsed.members,
            parsed.usernames,
            parsed.addedUserNames,
            parsed.addedDisplayNames,
        ];
        for (const candidate of candidates) {
            if (!Array.isArray(candidate))
                continue;
            const normalized = candidate
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value) => value.length > 0);
            if (normalized.length > 0) {
                return normalized;
            }
        }
    }
    catch {
        return [];
    }
    return [];
}
const QUICK_REACTION_EMOJIS = ['рџ‘Ќ', 'вќ¤пёЏ', 'рџ”Ґ', 'рџ‚', 'рџ®', 'рџ‘Џ'];
function parsePollMessageContent(rawContent) {
    const trimmed = rawContent.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return null;
    }
    try {
        const parsed = JSON.parse(trimmed);
        const question = typeof parsed.question === 'string' && parsed.question.trim().length > 0
            ? parsed.question.trim()
            : '';
        const options = Array.isArray(parsed.options)
            ? parsed.options
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value) => value.length > 0)
            : [];
        const allowsMultiple = parsed.allowsMultiple === true;
        const quiz = parsed.quiz === true;
        const correctOptionIndex = typeof parsed.correctOptionIndex === 'number' && Number.isFinite(parsed.correctOptionIndex)
            ? Math.floor(parsed.correctOptionIndex)
            : null;
        const explanation = typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0
            ? parsed.explanation.trim()
            : null;
        const anonymousVotes = parsed.anonymousVotes !== false;
        if (!question || options.length < 2) {
            return null;
        }
        return {
            question,
            allowsMultiple,
            quiz,
            correctOptionIndex,
            explanation,
            anonymousVotes,
            options,
        };
    }
    catch {
        return null;
    }
}
function buildReactionSummary(response, currentUserId) {
    if (!response || !Array.isArray(response.items) || response.items.length === 0) {
        return [];
    }
    const byEmoji = new Map();
    for (const item of response.items) {
        const emoji = (item.emoji || '').trim();
        if (!emoji)
            continue;
        const existing = byEmoji.get(emoji);
        if (existing) {
            existing.count += 1;
            if (item.userId === currentUserId) {
                existing.reactedByMe = true;
            }
            continue;
        }
        byEmoji.set(emoji, {
            emoji,
            count: 1,
            reactedByMe: item.userId === currentUserId,
        });
    }
    return Array.from(byEmoji.values()).sort((left, right) => {
        if (right.count !== left.count) {
            return right.count - left.count;
        }
        return left.emoji.localeCompare(right.emoji);
    });
}
const normalizeOptionIndexes = (values) => {
    const unique = new Set();
    for (const value of values) {
        if (!Number.isFinite(value) || value < 0)
            continue;
        unique.add(value);
    }
    return Array.from(unique).sort((a, b) => a - b);
};
const arraysEqual = (left, right) => {
    if (left.length !== right.length)
        return false;
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index])
            return false;
    }
    return true;
};
function resolveGroupServiceAvatarUrl(message, attachments) {
    for (const attachment of attachments) {
        const url = resolveAttachmentUrl(attachment);
        if (!url)
            continue;
        const contentType = (attachment.contentType || '').toLowerCase();
        const isImageAttachment = attachment.isImage || contentType.startsWith('image/');
        if (isImageAttachment || IMAGE_FILE_PATTERN.test(url)) {
            return url;
        }
    }
    const payload = parseSystemPayload(message.content || '');
    const payloadUrl = payload.avatarUrl?.trim();
    if (payloadUrl) {
        if (payloadUrl.startsWith('/media/')) {
            return payloadUrl;
        }
        if (payloadUrl.startsWith('http://') ||
            payloadUrl.startsWith('https://') ||
            payloadUrl.startsWith('data:') ||
            payloadUrl.startsWith('blob:')) {
            return payloadUrl;
        }
    }
    const rawContent = (message.content || '').trim();
    if (!rawContent)
        return undefined;
    if (rawContent.startsWith('/media/') ||
        rawContent.startsWith('http://') ||
        rawContent.startsWith('https://') ||
        rawContent.startsWith('data:') ||
        rawContent.startsWith('blob:')) {
        return rawContent;
    }
    return undefined;
}
function GroupServiceMessageBubble({ message, messageType, actorName, attachments, }) {
    const payload = parseSystemPayload(message.content || '');
    const contentTitle = (payload.title || message.content || '').trim();
    const safeTitle = contentTitle || 'Untitled';
    let text = `${actorName} updated group`;
    if (messageType === 'group_created') {
        text = `${actorName} created group "${safeTitle}"`;
    }
    else if (messageType === 'group_title_updated') {
        text = `${actorName} changed group title to "${safeTitle}"`;
    }
    else if (messageType === 'group_avatar_updated') {
        text = `${actorName} updated group photo`;
    }
    else if (messageType === 'group_members_added') {
        const addedMembers = parseAddedMembers(message.content || '');
        if (addedMembers.length === 1) {
            text = `${actorName} added ${addedMembers[0]}`;
        }
        else if (addedMembers.length > 1) {
            text = `${actorName} added ${addedMembers.join(', ')}`;
        }
        else {
            const content = (message.content || '').trim();
            text = content || `${actorName} added members`;
        }
    }
    else if (messageType === 'group_members_removed') {
        const removedMembers = parseAddedMembers(message.content || '');
        if (removedMembers.length === 1) {
            text = `${actorName} removed ${removedMembers[0]}`;
        }
        else if (removedMembers.length > 1) {
            text = `${actorName} removed ${removedMembers.join(', ')}`;
        }
        else {
            const content = (message.content || '').trim();
            text = content || `${actorName} removed members`;
        }
    }
    else if (messageType === 'group_member_left') {
        text = `${actorName} left the group`;
    }
    else if (messageType === 'group_admin_promoted') {
        const members = parseAddedMembers(message.content || '');
        text = members.length > 0
            ? `${actorName} promoted ${members.join(', ')} to admin`
            : `${actorName} promoted a new admin`;
    }
    else if (messageType === 'group_admin_demoted') {
        const members = parseAddedMembers(message.content || '');
        text = members.length > 0
            ? `${actorName} demoted ${members.join(', ')}`
            : `${actorName} changed admin rights`;
    }
    else if (messageType === 'group_owner_transferred') {
        const members = parseAddedMembers(message.content || '');
        text = members.length > 0
            ? `${actorName} transferred ownership to ${members.join(', ')}`
            : `${actorName} transferred ownership`;
    }
    else if (messageType === 'group_description_updated') {
        text = `${actorName} updated group description`;
    }
    else if (messageType === 'group_public_username_updated') {
        text = `${actorName} updated public username`;
    }
    else if (messageType === 'group_slow_mode_updated') {
        text = `${actorName} updated slow mode`;
    }
    else if (messageType === 'group_history_visibility_updated') {
        text = `${actorName} updated history visibility`;
    }
    else if (messageType === 'group_permissions_updated') {
        text = `${actorName} updated group permissions`;
    }
    else if (messageType === 'group_admin_rights_updated') {
        text = `${actorName} updated admin rights`;
    }
    else if (messageType === 'group_member_muted') {
        text = `${actorName} muted a member`;
    }
    else if (messageType === 'group_member_unmuted') {
        text = `${actorName} unmuted a member`;
    }
    else if (messageType === 'group_member_banned') {
        text = `${actorName} banned a member`;
    }
    else if (messageType === 'group_member_unbanned') {
        text = `${actorName} unbanned a member`;
    }
    else if (messageType === 'group_message_pinned') {
        text = `${actorName} pinned a message`;
    }
    else if (messageType === 'group_message_unpinned') {
        text = `${actorName} unpinned a message`;
    }
    else if (messageType === 'group_invite_link_created') {
        text = `${actorName} created an invite link`;
    }
    else if (messageType === 'group_invite_link_revoked') {
        text = `${actorName} revoked an invite link`;
    }
    else if (messageType === 'group_join_request_created') {
        text = `${actorName} requested to join`;
    }
    else if (messageType === 'group_join_request_approved') {
        text = `${actorName} approved a join request`;
    }
    else if (messageType === 'group_join_request_declined') {
        text = `${actorName} declined a join request`;
    }
    else if (messageType === 'group_topic_created') {
        text = `${actorName} created topic "${safeTitle}"`;
    }
    else if (messageType === 'group_topic_closed') {
        text = `${actorName} closed topic "${safeTitle}"`;
    }
    else if (messageType === 'group_topic_reopened') {
        text = `${actorName} reopened topic "${safeTitle}"`;
    }
    else if (messageType === 'group_topic_deleted') {
        text = `${actorName} deleted topic "${safeTitle}"`;
    }
    else if (messageType === 'reaction') {
        text = `${actorName} reacted ${safeTitle}`;
    }
    else if (messageType === 'poll_closed') {
        text = `${actorName} closed a poll`;
    }
    const avatarUrl = messageType === 'group_avatar_updated'
        ? resolveGroupServiceAvatarUrl(message, attachments)
        : undefined;
    return (_jsxs("div", { className: "my-[7px] flex flex-col items-center gap-[8px]", children: [_jsx("div", { className: "max-w-[90%] rounded-[14px] bg-[#4c285c]/86 px-[10px] py-[5px] text-center text-[15px] font-[600] leading-[1.15] text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm", children: text }), avatarUrl ? (_jsx("div", { className: "h-[128px] w-[128px] overflow-hidden rounded-full shadow-[0_16px_34px_rgba(0,0,0,0.34)]", children: _jsx("img", { src: avatarUrl, alt: "Group avatar updated", className: "h-full w-full object-cover" }) })) : null] }));
}
function DateDivider({ label }) {
    return (_jsx("div", { className: "my-[7px] flex justify-center", children: _jsx("div", { className: "rounded-[14px] bg-[#4c285c]/86 px-[10px] py-[5px] text-[15px] font-[600] leading-none text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm", children: label }) }));
}
const toMessageDomId = (messageId) => `chat-message-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
const isTailBubbleMessage = (message) => toGroupServiceMessageType(message.messageType) === null &&
    message.messageType !== 'poll';
const normalizeGroupingKey = (value) => {
    if (typeof value !== 'string')
        return '';
    return value.trim();
};
const isAlbumGroupingCandidate = (message) => {
    const groupingKey = normalizeGroupingKey(message.groupingKey);
    if (!groupingKey)
        return false;
    if (message.messageType !== 'image' && message.messageType !== 'images') {
        return false;
    }
    return getMessageAttachments(message).length > 0;
};
const messageTimestamp = (value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
};
const areBubblesGrouped = (left, right) => {
    if (!left || !right)
        return false;
    if (!isTailBubbleMessage(left) || !isTailBubbleMessage(right))
        return false;
    if (left.senderId !== right.senderId)
        return false;
    const leftTimestamp = messageTimestamp(left.createdAt);
    const rightTimestamp = messageTimestamp(right.createdAt);
    if (leftTimestamp == null || rightTimestamp == null)
        return false;
    const diffMs = rightTimestamp - leftTimestamp;
    return diffMs >= 0 && diffMs <= BUBBLE_CHAIN_WINDOW_MS;
};
const getMessageRowBottomGapPx = (current, next) => {
    if (!next)
        return MESSAGE_ROW_BASE_GAP_PX;
    if (current.senderId !== next.senderId)
        return MESSAGE_ROW_EXPANDED_GAP_PX;
    const currentTimestamp = messageTimestamp(current.createdAt);
    const nextTimestamp = messageTimestamp(next.createdAt);
    if (currentTimestamp == null || nextTimestamp == null) {
        return MESSAGE_ROW_BASE_GAP_PX;
    }
    const diffMs = nextTimestamp - currentTimestamp;
    if (diffMs > BUBBLE_CHAIN_WINDOW_MS) {
        return MESSAGE_ROW_EXPANDED_GAP_PX;
    }
    return MESSAGE_ROW_BASE_GAP_PX;
};
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8)(?:$|[?#])/i;
const VIDEO_HINT_PATTERN = /(\/(watch|video|videos|clip|clips|reel|reels|short|shorts|player|embed|stream|live)\b|[?&](v|video|vid|id)=)/i;
const VIDEO_META_CACHE = new Map();
const VIDEO_META_CACHE_VERSION = '2';
const DEFAULT_MESSAGE_BUBBLE_MAX_WIDTH_PX = 760;
const resolveAttachmentPreviewUrl = (value) => {
    const normalized = resolveMediaUrl(value);
    if (!normalized)
        return '';
    if (normalized.startsWith('http://') ||
        normalized.startsWith('https://') ||
        normalized.startsWith('blob:') ||
        normalized.startsWith('data:') ||
        normalized.startsWith('/')) {
        return normalized;
    }
    return resolveMediaUrl(`/media/${normalized}`);
};
const resolveAttachmentAspectRatio = (attachment) => {
    const width = typeof attachment.width === 'number' && Number.isFinite(attachment.width) && attachment.width > 0
        ? attachment.width
        : undefined;
    const height = typeof attachment.height === 'number' &&
        Number.isFinite(attachment.height) &&
        attachment.height > 0
        ? attachment.height
        : undefined;
    if (!width || !height) {
        return undefined;
    }
    return width / height;
};
const toVisualMediaAttachmentItems = (messageType, attachments, resolvePendingUploadUrl) => {
    return attachments.flatMap((attachment, attachmentIndex) => {
        const pendingUploadUrl = resolvePendingUploadUrl?.(attachmentIndex) || '';
        const previewUrl = typeof attachment.thumbnailUrl === 'string'
            ? resolveAttachmentPreviewUrl(attachment.thumbnailUrl)
            : '';
        const strippedPreviewUrl = typeof attachment.strippedThumbnailUrl === 'string'
            ? resolveAttachmentPreviewUrl(attachment.strippedThumbnailUrl)
            : '';
        const resolvedUrl = resolveAttachmentUrl(attachment) || pendingUploadUrl || previewUrl || strippedPreviewUrl || '';
        if (!resolvedUrl) {
            return [];
        }
        const contentType = (attachment.contentType || '').toLowerCase();
        const isVideo = isVideoContentType(contentType) ||
            (!attachment.isImage && VIDEO_FILE_PATTERN.test(resolvedUrl));
        const isImage = attachment.isImage === true ||
            contentType.startsWith('image/') ||
            IMAGE_FILE_PATTERN.test(resolvedUrl);
        if (!isImage && !isVideo) {
            return [];
        }
        const effectivePreviewUrl = previewUrl || (isImage ? pendingUploadUrl : undefined);
        const effectiveStrippedPreviewUrl = strippedPreviewUrl || undefined;
        const aspectRatio = resolveAttachmentAspectRatio(attachment);
        const mediaItem = {
            url: resolvedUrl,
            strippedPreviewUrl: effectiveStrippedPreviewUrl,
            previewUrl: effectivePreviewUrl,
            mediaType: isVideo ? 'video' : 'image',
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            aspectRatio,
        };
        return [
            {
                attachment,
                attachmentIndex,
                resolvedUrl,
                mediaItem,
            },
        ];
    });
};
const toMediaViewerAnchorId = (messageId, attachmentIndex) => `${String(messageId)}::${attachmentIndex}`;
function toPositiveNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return undefined;
}
function extractIframeSrc(html) {
    if (!html)
        return undefined;
    const match = html.match(/<iframe[^>]*\s+src=['"]([^'"]+)['"]/i);
    const src = match?.[1]?.trim();
    return src || undefined;
}
function toHighResSpotifyThumbnail(url) {
    if (!url)
        return undefined;
    return url.replace(/(ab67616d|ab676563)[0-9a-f]{8}/i, '$10000b273');
}
function getVideoMetaCacheKey(url) {
    return `${VIDEO_META_CACHE_VERSION}:${url}`;
}
function getSpotifyEntityKindFromUrl(url) {
    if (!url)
        return undefined;
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return undefined;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('spotify.com'))
        return undefined;
    const parts = parsed.pathname.split('/').filter(Boolean).map((part) => part.toLowerCase());
    const knownKinds = new Set(['track', 'episode', 'album', 'playlist', 'show', 'artist']);
    if (parts[0] === 'embed' && parts[1] && knownKinds.has(parts[1])) {
        return parts[1];
    }
    if (parts[0] && knownKinds.has(parts[0])) {
        return parts[0];
    }
    const uri = parsed.searchParams.get('uri');
    if (uri) {
        const uriParts = uri.split(':');
        if (uriParts.length >= 2) {
            const kind = uriParts[1]?.toLowerCase();
            if (kind && knownKinds.has(kind)) {
                return kind;
            }
        }
    }
    return 'unknown';
}
function getSpotifyInlineEmbedAspectRatio(kind) {
    if (kind === 'track' || kind === 'episode') {
        return 456 / 397;
    }
    return 456 / 352;
}
function buildOEmbedEndpoints(preview) {
    const encodedUrl = encodeURIComponent(preview.url);
    const normalizedSource = preview.sourceLabel.toLowerCase();
    const endpoints = [];
    if (normalizedSource === 'youtube') {
        endpoints.push(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
    }
    else if (normalizedSource === 'vimeo') {
        endpoints.push(`https://vimeo.com/api/oembed.json?url=${encodedUrl}`);
    }
    else if (normalizedSource === 'dailymotion') {
        endpoints.push(`https://www.dailymotion.com/services/oembed?url=${encodedUrl}`);
    }
    else if (normalizedSource === 'rutube') {
        endpoints.push(`https://rutube.ru/api/oembed/?url=${encodedUrl}`);
    }
    else if (normalizedSource === 'spotify') {
        endpoints.push(`https://open.spotify.com/oembed?url=${encodedUrl}`);
    }
    endpoints.push(`https://noembed.com/embed?url=${encodedUrl}`);
    return endpoints;
}
async function fetchBackendVideoPreviewMeta(previewUrl) {
    try {
        const response = await http.get(endpoints.chatLinkPreview(previewUrl));
        const payload = response.data;
        if (!payload || typeof payload !== 'object') {
            return null;
        }
        const durationLabel = typeof payload.durationSeconds === 'number' && payload.durationSeconds > 0
            ? formatDuration(payload.durationSeconds)
            : undefined;
        const meta = {
            providerName: payload.providerName?.trim() || undefined,
            title: payload.title?.trim() || undefined,
            description: payload.description?.trim() || undefined,
            thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
            embedUrl: payload.embedUrl?.trim() || undefined,
            durationLabel,
            embedWidth: toPositiveNumber(payload.embedWidth),
            embedHeight: toPositiveNumber(payload.embedHeight),
        };
        if (!meta.providerName &&
            !meta.title &&
            !meta.description &&
            !meta.thumbnailUrl &&
            !meta.embedUrl &&
            !meta.durationLabel) {
            return null;
        }
        return meta;
    }
    catch {
        return null;
    }
}
async function fetchVideoPreviewMeta(preview) {
    const backendMeta = await fetchBackendVideoPreviewMeta(preview.url);
    const backendHasEmbedDimensions = !!backendMeta &&
        typeof backendMeta.embedWidth === 'number' &&
        backendMeta.embedWidth > 0 &&
        typeof backendMeta.embedHeight === 'number' &&
        backendMeta.embedHeight > 0;
    if (backendMeta && backendHasEmbedDimensions) {
        return backendMeta;
    }
    const oembedEndpoints = buildOEmbedEndpoints(preview);
    for (const endpoint of oembedEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok)
                continue;
            const payload = (await response.json());
            if (!payload)
                continue;
            const durationLabel = typeof payload.duration === 'number' && payload.duration > 0
                ? formatDuration(payload.duration)
                : undefined;
            const description = payload.description?.trim() ||
                (payload.author_name ? `by ${payload.author_name}` : undefined);
            const embedUrl = payload.iframe_url?.trim() || extractIframeSrc(payload.html);
            const meta = {
                providerName: payload.provider_name?.trim(),
                title: payload.title?.trim(),
                description,
                authorName: payload.author_name?.trim(),
                thumbnailUrl: payload.thumbnail_url?.trim(),
                durationLabel,
                embedUrl,
                embedWidth: toPositiveNumber(payload.width),
                embedHeight: toPositiveNumber(payload.height),
            };
            if (!backendMeta) {
                return meta;
            }
            return {
                ...backendMeta,
                ...meta,
                providerName: backendMeta.providerName || meta.providerName,
                title: backendMeta.title || meta.title,
                description: backendMeta.description || meta.description,
                thumbnailUrl: backendMeta.thumbnailUrl || meta.thumbnailUrl,
                // Keep embed URL and dimensions from the same source to avoid iframe viewport mismatch.
                embedUrl: meta.embedUrl || backendMeta.embedUrl,
                durationLabel: backendMeta.durationLabel || meta.durationLabel,
                embedWidth: backendMeta.embedWidth || meta.embedWidth,
                embedHeight: backendMeta.embedHeight || meta.embedHeight,
            };
        }
        catch {
            continue;
        }
    }
    return backendMeta;
}
function getPrimaryVideoPreview(content, entities) {
    const links = extractMessageLinks(content, entities);
    for (const link of links) {
        const preview = toVideoLinkPreview(link);
        if (preview)
            return preview;
    }
    return null;
}
function toVideoLinkPreview(link) {
    let parsed;
    try {
        parsed = new URL(link.href);
    }
    catch {
        return null;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const readableHost = host.replace(/^m\./, '');
    const youtubeId = getYouTubeVideoId(parsed, host);
    if (youtubeId) {
        const youtubePathParts = parsed.pathname.split('/').filter(Boolean);
        const youtubeTail = youtubePathParts.length > 0 ? youtubePathParts[youtubePathParts.length - 1] : '';
        return {
            sourceLabel: 'YouTube',
            title: decodeLinkTitle(youtubeTail || youtubeId),
            description: 'Watch on YouTube',
            url: parsed.toString(),
            posterUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`,
        };
    }
    const vimeoId = getVimeoVideoId(parsed, host);
    if (vimeoId) {
        return {
            sourceLabel: 'Vimeo',
            title: decodeLinkTitle(vimeoId),
            description: 'Watch on Vimeo',
            url: parsed.toString(),
            embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
        };
    }
    const dailymotionId = getDailymotionVideoId(parsed, host);
    if (dailymotionId) {
        return {
            sourceLabel: 'Dailymotion',
            title: decodeLinkTitle(dailymotionId),
            description: 'Watch on Dailymotion',
            url: parsed.toString(),
            embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=1`,
        };
    }
    const spotifyEntity = getSpotifyEntity(parsed, host);
    if (spotifyEntity) {
        return {
            sourceLabel: 'Spotify',
            title: decodeLinkTitle(spotifyEntity.id),
            description: 'Listen on Spotify',
            url: parsed.toString(),
            embedUrl: `https://open.spotify.com/embed/${spotifyEntity.kind}/${spotifyEntity.id}?utm_source=chat_preview`,
        };
    }
    const rutubeId = getRutubeVideoId(parsed, host);
    if (rutubeId) {
        return {
            sourceLabel: 'Rutube',
            title: decodeLinkTitle(rutubeId),
            description: 'Watch on Rutube',
            url: parsed.toString(),
            embedUrl: `https://rutube.ru/play/embed/${rutubeId}/?autoplay=1`,
        };
    }
    const normalizedHref = parsed.toString();
    if (VIDEO_FILE_PATTERN.test(normalizedHref)) {
        return {
            sourceLabel: readableHost,
            title: decodeLinkTitle(parsed.pathname.split('/').pop() || 'video'),
            description: 'Direct video file',
            url: normalizedHref,
            directVideoUrl: normalizedHref,
        };
    }
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    const likelyVideo = VIDEO_HINT_PATTERN.test(pathAndQuery);
    if (!likelyVideo) {
        return null;
    }
    const genericPathParts = parsed.pathname.split('/').filter(Boolean);
    const genericTail = genericPathParts.length > 0 ? genericPathParts[genericPathParts.length - 1] : '';
    return {
        sourceLabel: readableHost,
        title: decodeLinkTitle(genericTail || parsed.hostname),
        description: 'Video link preview',
        url: normalizedHref,
    };
}
function getYouTubeVideoId(url, host) {
    if (host === 'youtu.be') {
        const shortId = url.pathname.split('/').filter(Boolean)[0];
        return shortId || null;
    }
    if (!host.includes('youtube.com'))
        return null;
    if (url.pathname === '/watch') {
        return url.searchParams.get('v');
    }
    if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2] || null;
    }
    if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2] || null;
    }
    return null;
}
function getVimeoVideoId(url, host) {
    if (!host.includes('vimeo.com'))
        return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const numeric = parts.find((part) => /^\d+$/.test(part));
    return numeric || null;
}
function getDailymotionVideoId(url, host) {
    if (host === 'dai.ly') {
        return url.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (!host.includes('dailymotion.com'))
        return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('video');
    if (idx >= 0 && parts[idx + 1]) {
        return parts[idx + 1];
    }
    return null;
}
function getSpotifyEntity(url, host) {
    if (!host.includes('spotify.com'))
        return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2)
        return null;
    const kindRaw = parts[0]?.toLowerCase();
    const id = parts[1];
    if (!id)
        return null;
    const supportedKinds = new Set(['track', 'album', 'playlist', 'episode', 'show']);
    if (!kindRaw || !supportedKinds.has(kindRaw))
        return null;
    return {
        kind: kindRaw,
        id,
    };
}
function isRutubeVideoId(value) {
    if (!value)
        return false;
    return /^[0-9a-f]{32}$/i.test(value);
}
function getRutubeVideoId(url, host) {
    if (!host.includes('rutube.ru'))
        return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('video');
    if (idx >= 0) {
        const next = parts[idx + 1];
        if (next?.toLowerCase() === 'private' && isRutubeVideoId(parts[idx + 2])) {
            return parts[idx + 2];
        }
        if (isRutubeVideoId(next)) {
            return next;
        }
    }
    const embedIdx = parts.indexOf('embed');
    if (embedIdx > 0 && parts[embedIdx - 1] === 'play' && isRutubeVideoId(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
    }
    for (let i = parts.length - 1; i >= 0; i -= 1) {
        if (isRutubeVideoId(parts[i])) {
            return parts[i];
        }
    }
    return null;
}
function decodeLinkTitle(value) {
    const normalized = value.replace(/[-_]+/g, ' ').trim();
    if (!normalized)
        return 'Video';
    try {
        return decodeURIComponent(normalized);
    }
    catch {
        return normalized;
    }
}
function VideoLinkPreviewCard({ preview, isOwn, maxWidthPx, }) {
    const [isPlayingInline, setIsPlayingInline] = useState(false);
    const [meta, setMeta] = useState(null);
    const resolvedEmbedUrl = meta?.embedUrl || preview.embedUrl;
    const canInlinePlay = !!preview.directVideoUrl || !!resolvedEmbedUrl;
    const resolvedSource = meta?.providerName || preview.sourceLabel;
    const isSpotifyCard = resolvedSource.trim().toLowerCase() === 'spotify';
    const resolvedTitle = meta?.title || preview.title;
    const resolvedDescription = meta?.description || preview.description;
    const resolvedPosterUrlRaw = meta?.thumbnailUrl || preview.posterUrl;
    const resolvedPosterUrl = isSpotifyCard
        ? toHighResSpotifyThumbnail(resolvedPosterUrlRaw)
        : resolvedPosterUrlRaw;
    const resolvedDuration = preview.durationLabel || meta?.durationLabel;
    const resolvedEmbedWidth = meta?.embedWidth;
    const resolvedEmbedHeight = meta?.embedHeight;
    const spotifyEntityKind = getSpotifyEntityKindFromUrl(resolvedEmbedUrl) ||
        getSpotifyEntityKindFromUrl(preview.embedUrl) ||
        getSpotifyEntityKindFromUrl(preview.url);
    const spotifyInlineAspectRatio = getSpotifyInlineEmbedAspectRatio(spotifyEntityKind);
    const embedAspectRatio = typeof resolvedEmbedWidth === 'number' &&
        resolvedEmbedWidth > 0 &&
        typeof resolvedEmbedHeight === 'number' &&
        resolvedEmbedHeight > 0
        ? resolvedEmbedWidth / resolvedEmbedHeight
        : undefined;
    const mediaAspectRatio = isPlayingInline
        ? (isSpotifyCard ? spotifyInlineAspectRatio : embedAspectRatio || 16 / 9)
        : (isSpotifyCard ? 1 : 16 / 9);
    const mediaPaddingTop = `${100 / mediaAspectRatio}%`;
    useEffect(() => {
        let disposed = false;
        const cacheKey = getVideoMetaCacheKey(preview.url);
        const cached = VIDEO_META_CACHE.get(cacheKey);
        if (cached !== undefined) {
            setMeta(cached);
            return () => {
                disposed = true;
            };
        }
        void (async () => {
            const loadedMeta = await fetchVideoPreviewMeta(preview);
            VIDEO_META_CACHE.set(cacheKey, loadedMeta);
            if (!disposed) {
                setMeta(loadedMeta);
            }
        })();
        return () => {
            disposed = true;
        };
    }, [preview.url, preview.sourceLabel, preview.embedUrl, preview.directVideoUrl]);
    const handlePlay = () => {
        if (canInlinePlay) {
            setIsPlayingInline(true);
            return;
        }
        window.open(preview.url, '_blank', 'noopener,noreferrer');
    };
    return (_jsxs("div", { className: `mt-[9px] overflow-hidden rounded-[13px] border ${isOwn ? 'border-white/26 bg-white/10' : 'border-white/12 bg-black/16'}`, style: { width: '100%', maxWidth: maxWidthPx }, children: [_jsxs("div", { className: `border-l-[4px] px-3 py-2.5 ${isOwn ? 'border-white/70 bg-white/8' : 'border-[#af93ff] bg-white/[0.03]'}`, children: [_jsx("div", { className: `text-[13px] font-[700] ${isOwn ? 'text-white/88' : 'text-[#d2c2ff]'}`, children: resolvedSource }), _jsx("div", { className: "mt-[2px] line-clamp-1 text-[17px] font-[700] leading-tight text-white", children: resolvedTitle }), _jsx("div", { className: `mt-[3px] line-clamp-2 text-[14px] leading-[1.24] ${isOwn ? 'text-white/84' : 'text-white/72'}`, children: resolvedDescription }), resolvedDuration ? (_jsx("div", { className: "mt-2 inline-flex rounded-full bg-black/33 px-2 py-[1px] text-[12px] font-[600] text-white/92", children: resolvedDuration })) : null] }), _jsx("div", { className: "relative w-full overflow-hidden bg-[#6557b7]/66 transition-[padding] duration-150 ease-out", style: { paddingTop: mediaPaddingTop }, children: isPlayingInline && preview.directVideoUrl ? (_jsx("video", { src: preview.directVideoUrl, controls: true, autoPlay: true, playsInline: true, className: "absolute inset-0 h-full w-full object-cover" })) : isPlayingInline && resolvedEmbedUrl ? (_jsx("iframe", { src: resolvedEmbedUrl, title: resolvedTitle, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true, className: "absolute inset-0 h-full w-full border-0" })) : (_jsxs("button", { type: "button", onClick: handlePlay, className: "group absolute inset-0 h-full w-full", "aria-label": `Play video from ${resolvedSource}`, children: [resolvedPosterUrl ? (_jsx("img", { src: resolvedPosterUrl, alt: resolvedTitle, className: "h-full w-full object-cover" })) : null, _jsx("div", { className: "absolute inset-0 bg-[linear-gradient(180deg,rgba(38,28,84,0.36)_0%,rgba(38,28,84,0.58)_100%)]" }), _jsx("span", { className: "absolute left-1/2 top-1/2 grid h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#4f438f]/88 text-white shadow-[0_14px_28px_rgba(0,0,0,0.38)] transition-transform duration-200 group-hover:scale-105", children: _jsx(PlayIcon, { size: 21 }) })] })) })] }));
}
function MessageTextBubble({ content, entities, videoPreview, bubbleMaxWidthPx, time, isOwn, isRead, status, isEdited, replyPreview, hideTail = false, }) {
    const bubbleWidthStyle = videoPreview
        ? { width: `min(100%, ${bubbleMaxWidthPx}px)` }
        : undefined;
    const textPaddingClass = videoPreview
        ? ''
        : isEdited
            ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
            : (isOwn ? 'pr-[56px]' : 'pr-[48px]');
    const statusLine = (_jsxs(_Fragment, { children: [isEdited ? (_jsx("span", { className: `italic ${isOwn ? 'text-white/62' : 'text-white/40'}`, children: "edited" })) : null, _jsx("span", { children: time }), isOwn ? (_jsx("span", { className: "ml-[4px] inline-flex h-[12px] w-[12px] items-center justify-center", children: status === 'pending' ? (_jsx("span", { className: "h-3 w-3 animate-pulse rounded-full border border-white/88" })) : status === 'failed' ? (_jsx("span", { className: "text-[14px] leading-none text-[#ffb0ba]", children: "!" })) : (_jsx(CheckCheckIcon, { size: 15, strokeWidth: 2.25, className: `origin-center scale-[1.85] ${isRead ? 'text-[#d8fff0]' : ''}` })) })) : null] }));
    return (_jsxs("div", { className: `tg-bubble relative ${isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'} ${hideTail ? 'tg-tail-none' : ''}`, style: bubbleWidthStyle, children: [replyPreview ? _jsx(ReplyPreviewBlock, { replyPreview: replyPreview, isOwn: isOwn }) : null, _jsx("div", { className: `whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${textPaddingClass}`, children: renderMessageContent(content, entities) }), videoPreview ? (_jsx(VideoLinkPreviewCard, { preview: videoPreview, isOwn: isOwn, maxWidthPx: bubbleMaxWidthPx })) : null, videoPreview ? (_jsx("div", { className: `mt-[6px] flex items-center justify-end gap-[2px] pr-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`, children: statusLine })) : (_jsx("div", { className: `absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`, children: statusLine }))] }));
}
function toManagedDownloadPhase(phase, manual) {
    if (phase === 'ready')
        return 'ready';
    if (phase === 'error')
        return 'error';
    if (phase === 'paused')
        return manual ? 'manual' : 'canceled';
    if (phase === 'canceled')
        return 'canceled';
    return 'loading';
}
function InlineDownloadControl({ loading, manual, retryable, progress, indeterminate, idleIcon, }) {
    const safeProgress = Math.max(0, Math.min(100, progress));
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (safeProgress / 100) * circumference;
    return (_jsxs("span", { className: "relative grid h-full w-full place-items-center", children: [loading || retryable ? (_jsxs("svg", { className: `pointer-events-none absolute inset-0 h-full w-full -rotate-90 ${loading && indeterminate ? 'animate-spin' : ''}`, viewBox: "0 0 42 42", "aria-hidden": "true", children: [_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.28)", strokeWidth: "2.2" }), loading ? (indeterminate ? (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: `${circumference * 0.3} ${circumference}` })) : (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: dashOffset }))) : (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: `${circumference * 0.24} ${circumference}` }))] })) : null, loading ? (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-current" }), _jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-current" })] })) : manual ? (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-[1px] h-[8px] w-[2px] -translate-x-1/2 rounded-full bg-current" }), _jsx("span", { className: "absolute left-1/2 top-[7px] h-[6px] w-[6px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-current" }), _jsx("span", { className: "absolute left-1/2 bottom-[-1px] h-[2px] w-[8px] -translate-x-1/2 rounded-full bg-current" })] })) : retryable ? (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-[1px] h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-current" }), _jsx("span", { className: "absolute left-1/2 top-[5px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-current" })] })) : (idleIcon)] }));
}
function PollMessageBubble({ question, options, allowsMultiple, quiz, correctOptionIndex, explanation, anonymousVotes, votedByMe, myAnswerCorrect, closed, totalVotes, isOwn, isRead, status, isEdited, hideTail, time, loading, voting, canClose, closing, canOpenVoters, onOpenVoters, onVote, onClose, }) {
    const [selectedForMultiple, setSelectedForMultiple] = useState([]);
    const votedIndexes = useMemo(() => normalizeOptionIndexes(options.filter((option) => option.votedByMe).map((option) => option.optionIndex)), [options]);
    useEffect(() => {
        setSelectedForMultiple(votedIndexes);
    }, [votedIndexes]);
    const hasOptions = options.length > 0;
    const normalizedSelected = normalizeOptionIndexes(selectedForMultiple);
    const canSubmitMultiple = allowsMultiple &&
        !closed &&
        !loading &&
        !voting &&
        hasOptions &&
        normalizedSelected.length > 0 &&
        !arraysEqual(normalizedSelected, votedIndexes);
    const safeTotalVotes = Math.max(totalVotes, options.reduce((sum, option) => sum + option.votes, 0));
    const bubbleClass = isOwn
        ? hideTail
            ? 'rounded-[22px_22px_8px_22px]'
            : 'rounded-[22px_22px_8px_8px]'
        : hideTail
            ? 'rounded-[22px_22px_22px_8px]'
            : 'rounded-[22px_22px_8px_8px]';
    const selectOption = (optionIndex) => {
        if (!onVote || closed || loading || voting)
            return;
        if (!allowsMultiple) {
            onVote([optionIndex]);
            return;
        }
        setSelectedForMultiple((prev) => {
            const current = new Set(prev);
            if (current.has(optionIndex)) {
                current.delete(optionIndex);
            }
            else {
                current.add(optionIndex);
            }
            return normalizeOptionIndexes(Array.from(current));
        });
    };
    return (_jsxs("div", { className: `relative overflow-hidden px-[14px] pb-[22px] pt-[12px] text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] ${bubbleClass} ${isOwn
            ? 'bg-gradient-to-br from-[#8875f6] via-[#7b66ef] to-[#6d56e1]'
            : 'bg-gradient-to-br from-[#2a2832] via-[#26242d] to-[#23212a]'}`, style: { minWidth: 260, maxWidth: 420 }, children: [_jsx("div", { className: "text-[15px] font-[700] leading-[1.3] text-white/96", children: question }), !hasOptions ? (_jsx("div", { className: "mt-2 text-[13px] text-white/64", children: loading ? 'Loading poll...' : 'No poll options' })) : (_jsx("div", { className: "mt-2.5 space-y-2", children: options.map((option) => {
                    const selectionForMultiple = allowsMultiple && normalizedSelected.includes(option.optionIndex);
                    const isSelected = allowsMultiple ? selectionForMultiple : option.votedByMe;
                    const isCorrect = option.correct === true;
                    const isWrongSelected = option.correct === false && option.votedByMe;
                    const denominator = safeTotalVotes > 0 ? safeTotalVotes : 1;
                    const percent = Math.min(100, Math.max(0, Math.round((option.votes / denominator) * 100)));
                    return (_jsxs("button", { type: "button", onClick: () => selectOption(option.optionIndex), disabled: closed || loading || voting || !onVote, className: `relative w-full overflow-hidden rounded-[11px] border px-3 py-2 text-left transition-colors ${isCorrect
                            ? 'border-[#8bd89b] bg-[#8bd89b1c]'
                            : isWrongSelected
                                ? 'border-[#f78c9a] bg-[#f78c9a1a]'
                                : isSelected
                                    ? 'border-[#b8a9ff] bg-[#ffffff14]'
                                    : 'border-white/14 bg-black/10 hover:bg-white/10'} ${closed || loading || voting || !onVote ? 'cursor-default' : 'cursor-pointer'}`, children: [_jsx("div", { className: `absolute inset-y-0 left-0 transition-[width] duration-300 ${isCorrect
                                    ? 'bg-[#7ed7912e]'
                                    : isWrongSelected
                                        ? 'bg-[#ff9aaa29]'
                                        : isSelected
                                            ? 'bg-[#c1b4ff33]'
                                            : 'bg-[#ffffff12]'}`, style: { width: `${percent}%` } }), _jsxs("div", { className: "relative z-[1] flex items-center justify-between gap-3", children: [_jsx("span", { className: "truncate text-[13px] font-[600] text-white/92", children: option.optionText }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsx("div", { className: "text-[12px] text-white/72", children: safeTotalVotes > 0 ? `${percent}%` : '0%' }), canOpenVoters ? (_jsxs("span", { role: "button", tabIndex: 0, onClick: (event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onOpenVoters?.(option.optionIndex);
                                                }, onKeyDown: (event) => {
                                                    if (event.key !== 'Enter' && event.key !== ' ') {
                                                        return;
                                                    }
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onOpenVoters?.(option.optionIndex);
                                                }, className: "mt-[2px] text-[11px] text-white/70 underline decoration-dotted underline-offset-2 hover:text-white/90", children: [option.votes, " voters"] })) : null] })] })] }, option.optionIndex));
                }) })), _jsxs("div", { className: "mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-white/62", children: [_jsxs("span", { children: [safeTotalVotes, " votes"] }), closed ? _jsx("span", { children: "closed" }) : null, allowsMultiple && !closed ? _jsx("span", { children: "multiple answers" }) : null, quiz ? _jsx("span", { children: "quiz" }) : null, anonymousVotes ? _jsx("span", { children: "anonymous" }) : _jsx("span", { children: "public voters" })] }), quiz && votedByMe && typeof myAnswerCorrect === 'boolean' ? (_jsxs("div", { className: `mt-2 rounded-[10px] border px-2.5 py-2 text-[12px] ${myAnswerCorrect
                    ? 'border-[#7cd49566] bg-[#7cd4951c] text-[#d7ffe6]'
                    : 'border-[#ff9fb466] bg-[#ff9fb41a] text-[#ffd8e1]'}`, children: [myAnswerCorrect ? 'Correct answer' : 'Wrong answer', typeof correctOptionIndex === 'number' ? ` вЂў correct option #${correctOptionIndex + 1}` : ''] })) : null, quiz && explanation ? (_jsx("div", { className: "mt-2 rounded-[10px] border border-white/14 bg-black/12 px-2.5 py-2 text-[12px] text-white/86", children: explanation })) : null, _jsxs("div", { className: "mt-2.5 flex flex-wrap items-center gap-2", children: [allowsMultiple && !closed && onVote ? (_jsx("button", { type: "button", onClick: () => {
                            if (!canSubmitMultiple)
                                return;
                            onVote(normalizedSelected);
                        }, disabled: !canSubmitMultiple, className: `rounded-[10px] px-2.5 py-[5px] text-[11px] font-[700] ${canSubmitMultiple
                            ? 'bg-white/22 text-white hover:bg-white/28'
                            : 'bg-white/12 text-white/55'}`, children: voting ? 'Voting...' : 'Vote' })) : null, canClose && !closed && onClose ? (_jsx("button", { type: "button", onClick: () => {
                            if (closing)
                                return;
                            onClose();
                        }, disabled: closing, className: "rounded-[10px] border border-[#ffbacf66] px-2.5 py-[5px] text-[11px] font-[700] text-[#ffd0dd] hover:bg-[#ff87ad1a] disabled:opacity-60", children: closing ? 'Closing...' : 'Close poll' })) : null] }), _jsxs("div", { className: `pointer-events-none absolute bottom-[6px] right-[10px] inline-flex items-center gap-[3px] text-[11px] ${isOwn ? 'text-white/78' : 'text-white/60'}`, children: [isEdited ? _jsx("span", { className: "italic text-white/58", children: "edited" }) : null, _jsx("span", { children: time }), isOwn ? (_jsx("span", { className: "ml-[2px] inline-flex", children: status === 'pending' ? (_jsx("span", { className: "h-[10px] w-[10px] animate-pulse rounded-full border border-white/78" })) : status === 'failed' ? (_jsx("span", { className: "text-[12px] leading-none text-[#ffb0ba]", children: "!" })) : (_jsx(CheckCheckIcon, { size: 11, strokeWidth: 2.1, className: `${isRead ? 'text-[#e3fff5]' : 'text-white/74'}` })) })) : null] })] }));
}
function MessageReactionsBar({ reactions, reactionsLoading, reactionsEnabled, toggleLoading, onToggleReaction, }) {
    const [quickPickerOpen, setQuickPickerOpen] = useState(false);
    const canToggle = reactionsEnabled && !!onToggleReaction;
    if (!canToggle && reactions.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5 px-1", children: [reactions.map((reaction) => (_jsxs("button", { type: "button", onClick: () => onToggleReaction?.(reaction.emoji), disabled: !canToggle || toggleLoading, className: `inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[12px] transition-colors ${reaction.reactedByMe
                    ? 'border-[#8f79ff] bg-[#6d56d933] text-white'
                    : 'border-white/15 bg-white/8 text-white/86 hover:bg-white/14'} ${!canToggle || toggleLoading ? 'cursor-default' : ''}`, children: [_jsx("span", { children: reaction.emoji }), _jsx("span", { className: "text-[11px]", children: reaction.count })] }, `reaction-${reaction.emoji}`))), canToggle ? (quickPickerOpen ? (_jsxs(_Fragment, { children: [QUICK_REACTION_EMOJIS.map((emoji) => (_jsx("button", { type: "button", onClick: () => {
                            onToggleReaction?.(emoji);
                            setQuickPickerOpen(false);
                        }, disabled: toggleLoading, className: "rounded-full border border-white/16 bg-white/8 px-2 py-[3px] text-[12px] text-white/92 hover:bg-white/14 disabled:opacity-60", children: emoji }, `quick-${emoji}`))), _jsx("button", { type: "button", onClick: () => setQuickPickerOpen(false), className: "rounded-full border border-white/16 bg-transparent px-2 py-[3px] text-[11px] text-white/70 hover:bg-white/10", children: "Close" })] })) : (_jsx("button", { type: "button", onClick: () => setQuickPickerOpen(true), disabled: toggleLoading || reactionsLoading, className: "rounded-full border border-white/16 bg-white/8 px-2 py-[3px] text-[12px] text-white/82 hover:bg-white/14 disabled:opacity-60", children: reactionsLoading ? '...' : '+' }))) : null] }));
}
function ChatMessageRow({ message, chatId, isGroupChat, reactionsEnabled, pollsEnabled, canManagePolls, userId, bubbleMaxWidthPx, uploadingImages, resolvePendingUploadPreviewUrl, resolveUserName, resolveUserAvatar, onCancelPendingUpload, isSearchMatch, isSearchActive, hideTail, showEdgeAvatar, rowBottomGapPx, messageReactions, reactionsLoading, reactionToggleLoading, onToggleReaction, pollData, pollLoading, pollVoting, pollClosing, pollVoters, pollVotersLoading, onOpenPollVoters, onVotePoll, onClosePoll, onOpenMediaViewer, }) {
    const isOwn = message.senderId === userId;
    const isEdited = !!message.edited;
    const time = formatMessageTime(message.createdAt);
    const isRead = isMessageRead(message);
    const attachments = getMessageAttachments(message);
    const messageLocalId = message.localId || (typeof message.messageId === 'string' ? message.messageId : undefined);
    const resolvePendingUploadUrlByAttachmentIndex = (attachmentIndex) => {
        if (!resolvePendingUploadPreviewUrl ||
            !messageLocalId ||
            attachmentIndex < 0) {
            return '';
        }
        const uploadState = uploadingImages?.get(`${messageLocalId}-${attachmentIndex}`);
        return resolvePendingUploadPreviewUrl(messageLocalId, attachmentIndex, uploadState?.file);
    };
    const textContent = message.content || '';
    const hasTextContent = textContent.trim().length > 0;
    const fallbackParsed = buildMessageTextAndEntities(textContent);
    const renderContent = message.entities && message.entities.length > 0 ? textContent : fallbackParsed.content;
    const renderEntities = message.entities && message.entities.length > 0 ? message.entities : fallbackParsed.entities;
    const videoPreview = hasTextContent ? getPrimaryVideoPreview(renderContent, renderEntities) : null;
    const mediaAttachmentItems = toVisualMediaAttachmentItems(message.messageType, attachments, resolvePendingUploadUrlByAttachmentIndex);
    const groupServiceMessageType = toGroupServiceMessageType(message.messageType);
    const numericMessageId = typeof message.messageId === 'number' ? message.messageId : null;
    const edgeAvatarName = message.senderDisplayName?.trim() ||
        message.senderUsername?.trim() ||
        resolveUserName(message.senderId) ||
        message.senderId.slice(0, 8);
    const edgeAvatarUrl = resolveUserAvatar?.(message.senderId);
    const edgeAvatarText = initialOf(edgeAvatarName);
    const edgeAvatarStyle = edgeAvatarUrl ? undefined : { background: hashColor(message.senderId) };
    const serviceActorName = message.senderDisplayName?.trim() ||
        message.senderUsername?.trim() ||
        resolveUserName(message.senderId) ||
        message.senderId.slice(0, 8);
    const rowHighlightClass = `rounded-[22px] transition-shadow ${isSearchActive
        ? 'shadow-[0_0_0_2px_rgba(179,156,255,0.95),0_8px_24px_rgba(108,78,204,0.35)]'
        : isSearchMatch
            ? 'shadow-[0_0_0_1px_rgba(179,156,255,0.5)]'
            : ''}`;
    const parsedPoll = message.messageType === 'poll' ? parsePollMessageContent(textContent) : null;
    const fallbackPollOptions = parsedPoll?.options.map((optionText, optionIndex) => ({
        optionIndex,
        optionText,
        votes: 0,
        votedByMe: false,
    })) || [];
    const effectivePollOptions = pollData && pollData.options.length > 0 ? pollData.options : fallbackPollOptions;
    const pollQuestion = (pollData?.question || parsedPoll?.question || '').trim() || 'Poll';
    const pollAllowsMultiple = pollData?.allowsMultiple ?? parsedPoll?.allowsMultiple ?? false;
    const pollQuiz = pollData?.quiz ?? parsedPoll?.quiz ?? false;
    const pollCorrectOptionIndex = typeof pollData?.correctOptionIndex === 'number'
        ? pollData.correctOptionIndex
        : (parsedPoll?.correctOptionIndex ?? null);
    const pollExplanation = pollData?.explanation ?? parsedPoll?.explanation ?? null;
    const pollAnonymousVotes = pollData?.anonymousVotes ?? parsedPoll?.anonymousVotes ?? true;
    const pollClosed = pollData?.closed ?? false;
    const pollTotalVotes = pollData?.totalVotes ?? 0;
    const pollVotedByMe = pollData?.votedByMe ?? effectivePollOptions.some((option) => option.votedByMe);
    const pollMyAnswerCorrect = pollData?.myAnswerCorrect;
    const hasPollVotersData = !!pollVoters && pollVoters.items.length > 0;
    const canClosePoll = message.messageType === 'poll' &&
        !pollClosed &&
        !!pollData &&
        !!(canManagePolls || (pollData.createdBy && pollData.createdBy === userId) || message.senderId === userId);
    const canOpenPollVoters = message.messageType === 'poll' &&
        !!pollData &&
        !pollAnonymousVotes &&
        !!onOpenPollVoters &&
        (!pollVotersLoading || hasPollVotersData);
    const reactionSummary = buildReactionSummary(messageReactions, userId);
    const canRenderReactions = !!isGroupChat &&
        !!reactionsEnabled &&
        groupServiceMessageType === null &&
        message.messageType !== 'poll_closed' &&
        message.messageType !== 'poll' &&
        numericMessageId !== null;
    const mediaItems = mediaAttachmentItems.map((item) => item.mediaItem);
    const imageUploadStates = mediaAttachmentItems.map((item) => {
        if (!messageLocalId || !uploadingImages) {
            return undefined;
        }
        return uploadingImages.get(`${messageLocalId}-${item.attachmentIndex}`);
    });
    const replyPreview = message.replyToMessage
        ? {
            author: message.replyToMessage.senderId === userId
                ? 'You'
                : resolveUserName(message.replyToMessage.senderId),
            text: messagePreviewText(message.replyToMessage),
        }
        : undefined;
    if (groupServiceMessageType) {
        return (_jsx("div", { className: "mb-[2px] flex justify-center", children: _jsx("div", { className: rowHighlightClass, style: { maxWidth: bubbleMaxWidthPx }, children: _jsx(GroupServiceMessageBubble, { message: message, messageType: groupServiceMessageType, actorName: serviceActorName, attachments: attachments }) }) }));
    }
    return (_jsx("div", { className: `flex ${isOwn ? 'justify-end' : 'justify-start'}`, style: { marginBottom: rowBottomGapPx }, children: _jsxs("div", { className: `${rowHighlightClass} relative`, style: { maxWidth: bubbleMaxWidthPx }, children: [message.messageType === 'poll' ? (_jsx(PollMessageBubble, { question: pollQuestion, options: effectivePollOptions, allowsMultiple: pollAllowsMultiple, quiz: pollQuiz, correctOptionIndex: pollCorrectOptionIndex, explanation: pollExplanation, anonymousVotes: pollAnonymousVotes, votedByMe: pollVotedByMe, myAnswerCorrect: pollMyAnswerCorrect, closed: pollClosed, totalVotes: pollTotalVotes, isOwn: isOwn, isRead: isRead, status: message.status, isEdited: isEdited, hideTail: hideTail, time: time, loading: !!pollLoading, voting: !!pollVoting, canClose: canClosePoll, closing: !!pollClosing, canOpenVoters: canOpenPollVoters, onOpenVoters: onOpenPollVoters && chatId && numericMessageId !== null && pollData
                        ? (optionIndex) => onOpenPollVoters(numericMessageId, pollData.pollId, optionIndex)
                        : undefined, onVote: pollsEnabled !== false &&
                        onVotePoll &&
                        chatId &&
                        numericMessageId !== null &&
                        pollData
                        ? (optionIndexes) => onVotePoll(numericMessageId, pollData.pollId, optionIndexes)
                        : undefined, onClose: onClosePoll && chatId && numericMessageId !== null && pollData
                        ? () => onClosePoll(numericMessageId, pollData.pollId)
                        : undefined })) : mediaItems.length > 1 ? (_jsx(MultiImageBubble, { mediaItems: mediaItems, caption: hasTextContent ? renderContent : '', captionEntities: hasTextContent ? renderEntities : undefined, bubbleMaxWidthPx: bubbleMaxWidthPx, time: time, isOwn: isOwn, isRead: isRead, status: message.status, isEdited: isEdited, replyPreview: replyPreview, hideTail: hideTail, uploadStates: imageUploadStates, onCancelUploadAt: (visibleIndex) => {
                        if (!onCancelPendingUpload || !messageLocalId)
                            return;
                        const attachmentItem = mediaAttachmentItems[visibleIndex];
                        if (!attachmentItem)
                            return;
                        onCancelPendingUpload(messageLocalId, attachmentItem.attachmentIndex);
                    }, onOpenMediaAt: (visibleIndex) => {
                        if (!onOpenMediaViewer)
                            return;
                        const selected = mediaAttachmentItems[visibleIndex];
                        if (!selected)
                            return;
                        onOpenMediaViewer({
                            messageId: String(message.messageId),
                            attachmentIndex: selected.attachmentIndex,
                        });
                    } })) : mediaItems.length === 1 ? (_jsx(SingleImageBubble, { mediaItem: mediaItems[0], caption: hasTextContent ? renderContent : '', captionEntities: hasTextContent ? renderEntities : undefined, bubbleMaxWidthPx: bubbleMaxWidthPx, time: time, isOwn: isOwn, isRead: isRead, status: message.status, isEdited: isEdited, replyPreview: replyPreview, hideTail: hideTail, uploadState: imageUploadStates[0], onCancelUpload: () => {
                        if (!onCancelPendingUpload || !messageLocalId)
                            return;
                        const firstItem = mediaAttachmentItems[0];
                        if (!firstItem)
                            return;
                        onCancelPendingUpload(messageLocalId, firstItem.attachmentIndex);
                    }, onOpenMedia: () => {
                        if (!onOpenMediaViewer)
                            return;
                        onOpenMediaViewer({
                            messageId: String(message.messageId),
                            attachmentIndex: mediaAttachmentItems[0].attachmentIndex,
                        });
                    } })) : (_jsx(MessageTextBubble, { content: hasTextContent ? renderContent : messagePreviewText(message), entities: hasTextContent ? renderEntities : undefined, videoPreview: videoPreview, bubbleMaxWidthPx: bubbleMaxWidthPx, time: time, isOwn: isOwn, isRead: isRead, status: message.status, isEdited: isEdited, replyPreview: replyPreview, hideTail: hideTail })), mediaItems.length > 0 && hasTextContent ? (_jsxs("div", { className: `mt-1 px-2 text-[15px] leading-[1.2] ${isOwn ? 'text-white/88 text-right' : 'text-white/75 text-left'}`, children: [renderMessageContent(renderContent, renderEntities), videoPreview ? (_jsx(VideoLinkPreviewCard, { preview: videoPreview, isOwn: isOwn, maxWidthPx: bubbleMaxWidthPx })) : null] })) : null, canRenderReactions || reactionSummary.length > 0 ? (_jsx(MessageReactionsBar, { reactions: reactionSummary, reactionsLoading: !!reactionsLoading, reactionsEnabled: canRenderReactions, toggleLoading: !!reactionToggleLoading, onToggleReaction: canRenderReactions && onToggleReaction && numericMessageId !== null
                        ? (emoji) => onToggleReaction(numericMessageId, emoji)
                        : undefined })) : null, showEdgeAvatar ? (_jsx("span", { className: `pointer-events-none absolute bottom-[-2px] z-10 grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-black/35 text-[11px] font-[700] text-white shadow-[0_6px_12px_rgba(0,0,0,0.4)] ${isOwn ? '-right-[50px]' : '-left-[50px]'}`, style: edgeAvatarStyle, children: edgeAvatarUrl ? (_jsx("img", { src: edgeAvatarUrl, alt: edgeAvatarName, className: "h-full w-full object-cover" })) : (edgeAvatarText) })) : null] }) }));
}
function ChatAlbumRow({ cluster, userId, bubbleMaxWidthPx, uploadingImages, resolvePendingUploadPreviewUrl, resolveUserName, resolveUserAvatar, onCancelPendingUpload, isSearchMatch, isSearchActive, hideTail, showEdgeAvatar, rowBottomGapPx, onOpenMediaViewer, }) {
    const { messages: albumMessages } = cluster;
    const lastMessage = albumMessages[albumMessages.length - 1];
    const captionSource = albumMessages.find((message) => (message.content || '').trim().length > 0);
    const replySource = albumMessages.find((message) => !!message.replyToMessage);
    const captionText = captionSource?.content || '';
    const hasCaptionText = captionText.trim().length > 0;
    const captionParsed = buildMessageTextAndEntities(captionText);
    const captionContent = captionSource?.entities && captionSource.entities.length > 0 ? captionText : captionParsed.content;
    const captionEntities = captionSource?.entities && captionSource.entities.length > 0
        ? captionSource.entities
        : captionParsed.entities;
    const isOwn = lastMessage.senderId === userId;
    const isRead = isMessageRead(lastMessage);
    const isEdited = albumMessages.some((message) => !!message.edited);
    const albumStatus = albumMessages.some((message) => message.status === 'failed')
        ? 'failed'
        : albumMessages.some((message) => message.status === 'pending')
            ? 'pending'
            : lastMessage.status;
    const time = formatMessageTime(lastMessage.createdAt);
    const edgeAvatarName = lastMessage.senderDisplayName?.trim() ||
        lastMessage.senderUsername?.trim() ||
        resolveUserName(lastMessage.senderId) ||
        lastMessage.senderId.slice(0, 8);
    const edgeAvatarUrl = resolveUserAvatar?.(lastMessage.senderId);
    const edgeAvatarText = initialOf(edgeAvatarName);
    const edgeAvatarStyle = edgeAvatarUrl ? undefined : { background: hashColor(lastMessage.senderId) };
    const rowHighlightClass = `rounded-[22px] transition-shadow ${isSearchActive
        ? 'shadow-[0_0_0_2px_rgba(179,156,255,0.95),0_8px_24px_rgba(108,78,204,0.35)]'
        : isSearchMatch
            ? 'shadow-[0_0_0_1px_rgba(179,156,255,0.5)]'
            : ''}`;
    const albumMediaReferences = albumMessages.flatMap((message) => {
        const attachments = getMessageAttachments(message);
        const messageLocalId = message.localId || (typeof message.messageId === 'string' ? message.messageId : undefined);
        const resolvePendingUploadUrlByAttachmentIndex = (attachmentIndex) => {
            if (!resolvePendingUploadPreviewUrl ||
                !messageLocalId ||
                attachmentIndex < 0) {
                return '';
            }
            const uploadState = uploadingImages?.get(`${messageLocalId}-${attachmentIndex}`);
            return resolvePendingUploadPreviewUrl(messageLocalId, attachmentIndex, uploadState?.file);
        };
        return toVisualMediaAttachmentItems(message.messageType, attachments, resolvePendingUploadUrlByAttachmentIndex).map((item) => ({
            message,
            attachmentIndex: item.attachmentIndex,
            mediaItem: item.mediaItem,
            uploadState: messageLocalId && uploadingImages
                ? uploadingImages.get(`${messageLocalId}-${item.attachmentIndex}`)
                : undefined,
            localId: messageLocalId,
        }));
    });
    if (albumMediaReferences.length === 0) {
        return null;
    }
    const mediaItems = albumMediaReferences.map((item) => item.mediaItem);
    const uploadStates = albumMediaReferences.map((item) => item.uploadState);
    const replyPreview = replySource?.replyToMessage
        ? {
            author: replySource.replyToMessage.senderId === userId
                ? 'You'
                : resolveUserName(replySource.replyToMessage.senderId),
            text: messagePreviewText(replySource.replyToMessage),
        }
        : undefined;
    return (_jsx("div", { className: `flex ${isOwn ? 'justify-end' : 'justify-start'}`, style: { marginBottom: rowBottomGapPx }, children: _jsxs("div", { className: `${rowHighlightClass} relative`, style: { maxWidth: bubbleMaxWidthPx }, children: [mediaItems.length > 1 ? (_jsx(MultiImageBubble, { mediaItems: mediaItems, caption: hasCaptionText ? captionContent : '', captionEntities: hasCaptionText ? captionEntities : undefined, bubbleMaxWidthPx: bubbleMaxWidthPx, time: time, isOwn: isOwn, isRead: isRead, status: albumStatus, isEdited: isEdited, replyPreview: replyPreview, hideTail: hideTail, uploadStates: uploadStates, onCancelUploadAt: (visibleIndex) => {
                        if (!onCancelPendingUpload)
                            return;
                        const item = albumMediaReferences[visibleIndex];
                        if (!item?.localId)
                            return;
                        onCancelPendingUpload(item.localId, item.attachmentIndex);
                    }, onOpenMediaAt: (visibleIndex) => {
                        if (!onOpenMediaViewer)
                            return;
                        const item = albumMediaReferences[visibleIndex];
                        if (!item)
                            return;
                        onOpenMediaViewer({
                            messageId: String(item.message.messageId),
                            attachmentIndex: item.attachmentIndex,
                        });
                    } })) : (_jsx(SingleImageBubble, { mediaItem: mediaItems[0], caption: hasCaptionText ? captionContent : '', captionEntities: hasCaptionText ? captionEntities : undefined, bubbleMaxWidthPx: bubbleMaxWidthPx, time: time, isOwn: isOwn, isRead: isRead, status: albumStatus, isEdited: isEdited, replyPreview: replyPreview, hideTail: hideTail, uploadState: uploadStates[0], onCancelUpload: () => {
                        if (!onCancelPendingUpload)
                            return;
                        const firstMedia = albumMediaReferences[0];
                        if (!firstMedia?.localId)
                            return;
                        onCancelPendingUpload(firstMedia.localId, firstMedia.attachmentIndex);
                    }, onOpenMedia: () => {
                        if (!onOpenMediaViewer)
                            return;
                        const firstMedia = albumMediaReferences[0];
                        if (!firstMedia)
                            return;
                        onOpenMediaViewer({
                            messageId: String(firstMedia.message.messageId),
                            attachmentIndex: firstMedia.attachmentIndex,
                        });
                    } })), showEdgeAvatar ? (_jsx("span", { className: `pointer-events-none absolute bottom-[-2px] z-10 grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-black/35 text-[11px] font-[700] text-white shadow-[0_6px_12px_rgba(0,0,0,0.4)] ${isOwn ? '-right-[50px]' : '-left-[50px]'}`, style: edgeAvatarStyle, children: edgeAvatarUrl ? (_jsx("img", { src: edgeAvatarUrl, alt: edgeAvatarName, className: "h-full w-full object-cover" })) : (edgeAvatarText) })) : null] }) }));
}
export function ChatMessageList({ messages, chatId = null, isGroupChat = false, reactionsEnabled = true, pollsEnabled = true, canManagePolls = false, userId, hasSelectedChat, messageBubbleMaxWidthPx = DEFAULT_MESSAGE_BUBBLE_MAX_WIDTH_PX, uploadingImages, pendingMediaPreviewUrls, messagesEndRef, matchedMessageIds, activeMatchedMessageId, resolveUserName, resolveUserAvatar, onReplyMessage, onEditMessage, onDeleteMessage, canDeleteMessage, onCopyMessage, onCancelPendingUpload, onRetryMessage, onLoadMessageReactions, onToggleMessageReaction, onLoadPollByMessageId, onLoadPollVoters, onVotePoll, onClosePoll, }) {
    const [contextMenu, setContextMenu] = useState(null);
    const [mediaViewerIndex, setMediaViewerIndex] = useState(null);
    const [reactionsByMessageId, setReactionsByMessageId] = useState({});
    const [reactionLoadingByMessageId, setReactionLoadingByMessageId] = useState({});
    const [reactionToggleLoadingByMessageId, setReactionToggleLoadingByMessageId] = useState({});
    const [pollByMessageId, setPollByMessageId] = useState({});
    const [pollLoadingByMessageId, setPollLoadingByMessageId] = useState({});
    const [pollVoteLoadingByMessageId, setPollVoteLoadingByMessageId] = useState({});
    const [pollCloseLoadingByMessageId, setPollCloseLoadingByMessageId] = useState({});
    const [pollVotersByMessageId, setPollVotersByMessageId] = useState({});
    const [pollVotersLoadingByMessageId, setPollVotersLoadingByMessageId] = useState({});
    const [pollVotersModal, setPollVotersModal] = useState(null);
    const contextMenuRef = useRef(null);
    const hasInitializedMessagesRef = useRef(false);
    const previousMessageIdsRef = useRef(new Set());
    const pendingUploadPreviewUrlsRef = useRef(new Map());
    const [enteringMessageIds, setEnteringMessageIds] = useState(new Set());
    const matchedMessageIdSet = useMemo(() => new Set(matchedMessageIds), [matchedMessageIds]);
    const resolvePendingUploadPreviewUrl = (localId, attachmentIndex, file) => {
        if (typeof URL === 'undefined') {
            return '';
        }
        const key = `${localId}-${attachmentIndex}`;
        const modelPreviewUrl = pendingMediaPreviewUrls?.get(key);
        if (modelPreviewUrl) {
            return modelPreviewUrl;
        }
        const existing = pendingUploadPreviewUrlsRef.current.get(key);
        if (existing) {
            existing.lastTouchedAt = Date.now();
            return existing.objectUrl;
        }
        if (!file) {
            return '';
        }
        const fileType = (file.type || '').toLowerCase();
        const previewableType = fileType.startsWith('image/') ||
            fileType.startsWith('video/') ||
            fileType.startsWith('audio/');
        if (!previewableType) {
            return '';
        }
        const objectUrl = URL.createObjectURL(file);
        pendingUploadPreviewUrlsRef.current.set(key, {
            objectUrl,
            lastTouchedAt: Date.now(),
        });
        return objectUrl;
    };
    useEffect(() => {
        setReactionsByMessageId({});
        setReactionLoadingByMessageId({});
        setReactionToggleLoadingByMessageId({});
        setPollByMessageId({});
        setPollLoadingByMessageId({});
        setPollVoteLoadingByMessageId({});
        setPollCloseLoadingByMessageId({});
        setPollVotersByMessageId({});
        setPollVotersLoadingByMessageId({});
        setPollVotersModal(null);
    }, [chatId]);
    const ensureMessageReactionsLoaded = useCallback(async (messageId) => {
        if (!chatId ||
            !isGroupChat ||
            !onLoadMessageReactions ||
            reactionLoadingByMessageId[messageId] ||
            reactionsByMessageId[messageId]) {
            return;
        }
        setReactionLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            const data = await onLoadMessageReactions(chatId, messageId);
            setReactionsByMessageId((prev) => ({ ...prev, [messageId]: data }));
        }
        catch {
            setReactionsByMessageId((prev) => prev);
        }
        finally {
            setReactionLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, isGroupChat, onLoadMessageReactions, reactionLoadingByMessageId, reactionsByMessageId]);
    const toggleReaction = useCallback(async (messageId, emoji) => {
        if (!chatId || !onToggleMessageReaction || reactionToggleLoadingByMessageId[messageId]) {
            return;
        }
        const normalizedEmoji = emoji.trim();
        if (!normalizedEmoji) {
            return;
        }
        setReactionToggleLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            const data = await onToggleMessageReaction(chatId, messageId, normalizedEmoji);
            setReactionsByMessageId((prev) => ({ ...prev, [messageId]: data }));
        }
        finally {
            setReactionToggleLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, onToggleMessageReaction, reactionToggleLoadingByMessageId]);
    const ensurePollLoaded = useCallback(async (messageId) => {
        if (!chatId ||
            !pollsEnabled ||
            !onLoadPollByMessageId ||
            pollLoadingByMessageId[messageId] ||
            pollByMessageId[messageId]) {
            return;
        }
        setPollLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            const poll = await onLoadPollByMessageId(chatId, messageId);
            if (poll) {
                setPollByMessageId((prev) => ({ ...prev, [messageId]: poll }));
            }
        }
        finally {
            setPollLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, onLoadPollByMessageId, pollByMessageId, pollLoadingByMessageId, pollsEnabled]);
    const votePoll = useCallback(async (messageId, pollId, optionIndexes) => {
        if (!chatId || !onVotePoll || pollVoteLoadingByMessageId[messageId]) {
            return;
        }
        setPollVoteLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            const updatedPoll = await onVotePoll(chatId, pollId, optionIndexes);
            setPollByMessageId((prev) => ({ ...prev, [messageId]: updatedPoll }));
        }
        finally {
            setPollVoteLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, onVotePoll, pollVoteLoadingByMessageId]);
    const closePoll = useCallback(async (messageId, pollId) => {
        if (!chatId || !onClosePoll || pollCloseLoadingByMessageId[messageId]) {
            return;
        }
        setPollCloseLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            await onClosePoll(chatId, pollId);
            setPollByMessageId((prev) => {
                const current = prev[messageId];
                if (!current)
                    return prev;
                return { ...prev, [messageId]: { ...current, closed: true } };
            });
        }
        finally {
            setPollCloseLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, onClosePoll, pollCloseLoadingByMessageId]);
    const ensurePollVotersLoaded = useCallback(async (messageId, pollId) => {
        if (!chatId ||
            !onLoadPollVoters ||
            pollVotersLoadingByMessageId[messageId] ||
            pollVotersByMessageId[messageId]) {
            return;
        }
        setPollVotersLoadingByMessageId((prev) => ({ ...prev, [messageId]: true }));
        try {
            const payload = await onLoadPollVoters(chatId, pollId);
            if (payload) {
                setPollVotersByMessageId((prev) => ({ ...prev, [messageId]: payload }));
            }
        }
        finally {
            setPollVotersLoadingByMessageId((prev) => ({ ...prev, [messageId]: false }));
        }
    }, [chatId, onLoadPollVoters, pollVotersByMessageId, pollVotersLoadingByMessageId]);
    const openPollVotersModal = useCallback((messageId, pollId, optionIndex) => {
        const loaded = pollVotersByMessageId[messageId];
        const fallbackIndex = loaded?.items?.[0]?.optionIndex ?? 0;
        const nextOptionIndex = typeof optionIndex === 'number' && Number.isFinite(optionIndex) ? optionIndex : fallbackIndex;
        setPollVotersModal({ messageId, pollId, optionIndex: nextOptionIndex });
        void ensurePollVotersLoaded(messageId, pollId);
    }, [ensurePollVotersLoaded, pollVotersByMessageId]);
    useEffect(() => {
        if (!chatId || !isGroupChat || !reactionsEnabled || !onLoadMessageReactions) {
            return;
        }
        const targetMessageIds = messages
            .filter((message) => typeof message.messageId === 'number' &&
            toGroupServiceMessageType(message.messageType) === null &&
            message.messageType !== 'poll')
            .slice(-24)
            .map((message) => message.messageId);
        targetMessageIds.forEach((messageId) => {
            if (reactionLoadingByMessageId[messageId] || reactionsByMessageId[messageId]) {
                return;
            }
            void ensureMessageReactionsLoaded(messageId);
        });
    }, [
        chatId,
        ensureMessageReactionsLoaded,
        isGroupChat,
        messages,
        onLoadMessageReactions,
        reactionLoadingByMessageId,
        reactionsByMessageId,
        reactionsEnabled,
    ]);
    useEffect(() => {
        if (!chatId || !pollsEnabled || !onLoadPollByMessageId) {
            return;
        }
        const pollMessageIds = messages
            .filter((message) => message.messageType === 'poll' && typeof message.messageId === 'number')
            .map((message) => message.messageId);
        pollMessageIds.forEach((messageId) => {
            if (pollLoadingByMessageId[messageId] || pollByMessageId[messageId]) {
                return;
            }
            void ensurePollLoaded(messageId);
        });
    }, [
        chatId,
        ensurePollLoaded,
        messages,
        onLoadPollByMessageId,
        pollByMessageId,
        pollLoadingByMessageId,
        pollsEnabled,
    ]);
    useEffect(() => {
        setPollByMessageId((prev) => {
            if (Object.keys(prev).length === 0)
                return prev;
            let changed = false;
            const next = { ...prev };
            for (const message of messages) {
                if (message.messageType !== 'poll_closed')
                    continue;
                const targetId = Number.parseInt((message.content || '').trim(), 10);
                if (!Number.isFinite(targetId))
                    continue;
                const existing = next[targetId];
                if (!existing || existing.closed)
                    continue;
                next[targetId] = { ...existing, closed: true };
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [messages]);
    const rows = useMemo(() => {
        const output = [];
        let lastDateKey = '';
        for (const message of messages) {
            const dateKey = new Date(message.createdAt).toDateString();
            if (dateKey !== lastDateKey) {
                output.push({
                    type: 'divider',
                    key: `divider-${message.messageId}-${dateKey}`,
                    label: formatDivider(message.createdAt),
                });
                lastDateKey = dateKey;
            }
            output.push({
                type: 'message',
                key: `msg-${message.messageId}`,
                message,
            });
        }
        return output;
    }, [messages]);
    const { albumClusterByStartMessageId, hiddenAlbumMessageIds, albumMessageIdsByStartMessageId, albumLastMessageIdByStartMessageId, albumContextMessageByStartMessageId, } = useMemo(() => {
        const clusterByStartMessageId = new Map();
        const hiddenMessageIds = new Set();
        const messageIdsByStartMessageId = new Map();
        const lastMessageIdByStartMessageId = new Map();
        const contextMessageByStartMessageId = new Map();
        for (let index = 0; index < messages.length; index += 1) {
            const current = messages[index];
            const currentId = String(current.messageId);
            if (hiddenMessageIds.has(currentId)) {
                continue;
            }
            if (!isAlbumGroupingCandidate(current)) {
                continue;
            }
            const baseGroupingKey = normalizeGroupingKey(current.groupingKey);
            if (!baseGroupingKey) {
                continue;
            }
            const baseDateKey = new Date(current.createdAt).toDateString();
            const groupedMessages = [current];
            let cursor = index + 1;
            while (cursor < messages.length) {
                const next = messages[cursor];
                if (!isAlbumGroupingCandidate(next)) {
                    break;
                }
                if (next.senderId !== current.senderId) {
                    break;
                }
                if (normalizeGroupingKey(next.groupingKey) !== baseGroupingKey) {
                    break;
                }
                const nextDateKey = new Date(next.createdAt).toDateString();
                if (nextDateKey !== baseDateKey) {
                    break;
                }
                groupedMessages.push(next);
                cursor += 1;
            }
            if (groupedMessages.length < 2) {
                continue;
            }
            const startMessageId = String(groupedMessages[0].messageId);
            const lastMessageId = String(groupedMessages[groupedMessages.length - 1].messageId);
            const hiddenIds = groupedMessages.slice(1).map((message) => String(message.messageId));
            hiddenIds.forEach((id) => hiddenMessageIds.add(id));
            const contextMessage = groupedMessages.find((message) => (message.content || '').trim().length > 0) ??
                groupedMessages[groupedMessages.length - 1];
            const cluster = {
                startMessageId,
                lastMessageId,
                groupingKey: baseGroupingKey,
                messages: groupedMessages,
                hiddenMessageIds: hiddenIds,
                contextMessage,
            };
            clusterByStartMessageId.set(startMessageId, cluster);
            messageIdsByStartMessageId.set(startMessageId, groupedMessages.map((message) => String(message.messageId)));
            lastMessageIdByStartMessageId.set(startMessageId, lastMessageId);
            contextMessageByStartMessageId.set(startMessageId, contextMessage);
        }
        return {
            albumClusterByStartMessageId: clusterByStartMessageId,
            hiddenAlbumMessageIds: hiddenMessageIds,
            albumMessageIdsByStartMessageId: messageIdsByStartMessageId,
            albumLastMessageIdByStartMessageId: lastMessageIdByStartMessageId,
            albumContextMessageByStartMessageId: contextMessageByStartMessageId,
        };
    }, [messages]);
    const bubbleVisualStateByMessageId = useMemo(() => {
        const visualStateById = new Map();
        const bubbleMessages = messages.filter((message) => isTailBubbleMessage(message));
        for (let index = 0; index < bubbleMessages.length; index += 1) {
            const current = bubbleMessages[index];
            const previous = index > 0 ? bubbleMessages[index - 1] : undefined;
            const next = index < bubbleMessages.length - 1 ? bubbleMessages[index + 1] : undefined;
            const groupedWithPrevious = areBubblesGrouped(previous, current);
            const groupedWithNext = areBubblesGrouped(current, next);
            visualStateById.set(String(current.messageId), {
                hideTail: groupedWithNext,
                showEdgeAvatar: !groupedWithNext,
            });
        }
        return visualStateById;
    }, [messages]);
    const messageRowBottomGapByMessageId = useMemo(() => {
        const gapById = new Map();
        for (let index = 0; index < messages.length; index += 1) {
            const current = messages[index];
            const next = index < messages.length - 1 ? messages[index + 1] : undefined;
            gapById.set(String(current.messageId), getMessageRowBottomGapPx(current, next));
        }
        return gapById;
    }, [messages]);
    const mediaViewerTimeline = useMemo(() => {
        const timeline = [];
        for (const message of messages) {
            const attachments = getMessageAttachments(message);
            const visualAttachments = toVisualMediaAttachmentItems(message.messageType, attachments);
            if (visualAttachments.length === 0)
                continue;
            const senderName = message.senderId === userId ? 'You' : resolveUserName(message.senderId);
            visualAttachments.forEach((media) => {
                timeline.push({
                    id: toMediaViewerAnchorId(message.messageId, media.attachmentIndex),
                    item: {
                        url: media.resolvedUrl,
                        mediaType: media.mediaItem.mediaType,
                        contentType: media.attachment.contentType,
                        fileName: media.attachment.fileName,
                        sizeBytes: media.attachment.sizeBytes,
                        senderName,
                        createdAt: message.createdAt,
                    },
                });
            });
        }
        return timeline;
    }, [messages, resolveUserName, userId]);
    useEffect(() => {
        if (!hasSelectedChat) {
            setMediaViewerIndex(null);
        }
    }, [hasSelectedChat]);
    useEffect(() => {
        const activeKeys = new Set();
        if (uploadingImages) {
            for (const [uploadKey] of uploadingImages.entries()) {
                activeKeys.add(uploadKey);
            }
        }
        const now = Date.now();
        const ORPHAN_PREVIEW_TTL_MS = 45_000;
        for (const [uploadKey, entry] of pendingUploadPreviewUrlsRef.current.entries()) {
            if (activeKeys.has(uploadKey)) {
                continue;
            }
            if (now - entry.lastTouchedAt < ORPHAN_PREVIEW_TTL_MS) {
                continue;
            }
            URL.revokeObjectURL(entry.objectUrl);
            pendingUploadPreviewUrlsRef.current.delete(uploadKey);
        }
    }, [uploadingImages, pendingMediaPreviewUrls]);
    useEffect(() => () => {
        for (const entry of pendingUploadPreviewUrlsRef.current.values()) {
            URL.revokeObjectURL(entry.objectUrl);
        }
        pendingUploadPreviewUrlsRef.current.clear();
    }, []);
    useEffect(() => {
        if (mediaViewerIndex === null)
            return;
        if (mediaViewerTimeline.length === 0) {
            setMediaViewerIndex(null);
            return;
        }
        if (mediaViewerIndex >= mediaViewerTimeline.length) {
            setMediaViewerIndex(mediaViewerTimeline.length - 1);
        }
    }, [mediaViewerIndex, mediaViewerTimeline]);
    useEffect(() => {
        if (!activeMatchedMessageId)
            return;
        const element = document.getElementById(toMessageDomId(activeMatchedMessageId));
        if (!element)
            return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeMatchedMessageId]);
    useEffect(() => {
        if (!contextMenu)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (!contextMenuRef.current || !target)
                return;
            if (!contextMenuRef.current.contains(target)) {
                setContextMenu(null);
            }
        };
        const onEscape = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setContextMenu(null);
            }
        };
        window.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onEscape);
        return () => {
            window.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onEscape);
        };
    }, [contextMenu]);
    useEffect(() => {
        const currentMessageIds = new Set(messages.map((message) => String(message.messageId)));
        if (!hasInitializedMessagesRef.current) {
            hasInitializedMessagesRef.current = true;
            previousMessageIdsRef.current = currentMessageIds;
            return;
        }
        const newlyAddedIds = [...currentMessageIds].filter((id) => !previousMessageIdsRef.current.has(id));
        previousMessageIdsRef.current = currentMessageIds;
        if (newlyAddedIds.length === 0) {
            return;
        }
        setEnteringMessageIds((prev) => {
            const next = new Set(prev);
            newlyAddedIds.forEach((id) => next.add(id));
            return next;
        });
        const timerId = window.setTimeout(() => {
            setEnteringMessageIds((prev) => {
                if (prev.size === 0)
                    return prev;
                const next = new Set(prev);
                newlyAddedIds.forEach((id) => next.delete(id));
                return next;
            });
        }, 170);
        return () => {
            window.clearTimeout(timerId);
        };
    }, [messages]);
    const messageById = useMemo(() => {
        const index = new Map();
        for (const message of messages) {
            index.set(String(message.messageId), message);
        }
        return index;
    }, [messages]);
    const contextAlbumMessageIds = contextMenu?.albumMessageIds?.length && contextMenu.albumMessageIds.length > 0
        ? contextMenu.albumMessageIds
        : contextMenu
            ? [contextMenu.message.messageId]
            : [];
    const contextAlbumMessages = contextAlbumMessageIds
        .map((id) => messageById.get(String(id)))
        .filter((message) => !!message);
    const contextHasAlbumGroup = contextAlbumMessageIds.length > 1;
    const safeMenuLeft = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 220) : 0;
    const safeMenuTop = contextMenu ? Math.min(contextMenu.y, window.innerHeight - 232) : 0;
    const canEdit = !!contextMenu &&
        contextMenu.message.senderId === userId &&
        typeof contextMenu.message.messageId === 'number' &&
        contextMenu.message.messageType !== 'poll';
    const canDelete = !!contextMenu &&
        contextAlbumMessages.length > 0 &&
        contextAlbumMessages.every((message) => {
            if (canDeleteMessage) {
                return canDeleteMessage(message);
            }
            return message.senderId === userId;
        });
    const canRetry = !!contextMenu &&
        !contextHasAlbumGroup &&
        contextMenu.message.senderId === userId &&
        contextMenu.message.status === 'failed';
    const contextIsGroupServiceMessage = !!contextMenu && toGroupServiceMessageType(contextMenu.message.messageType) !== null;
    const menuCopyText = contextMenu
        ? (contextMenu.message.content || '').trim() || messagePreviewText(contextMenu.message)
        : '';
    const activePollVoters = pollVotersModal ? pollVotersByMessageId[pollVotersModal.messageId] : undefined;
    const activePollVotersLoading = pollVotersModal
        ? !!pollVotersLoadingByMessageId[pollVotersModal.messageId]
        : false;
    const activePollVoterOption = pollVotersModal && activePollVoters
        ? activePollVoters.items.find((item) => item.optionIndex === pollVotersModal.optionIndex) ||
            activePollVoters.items[0]
        : undefined;
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @keyframes chatMessageEnterQuick {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .chat-message-enter-quick {
          animation: chatMessageEnterQuick 170ms cubic-bezier(0.18, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
      ` }), !hasSelectedChat ? (_jsx("div", { className: "py-10 text-center text-white/50", children: "Select a chat on the left" })) : rows.length === 0 ? (_jsx("div", { className: "py-10 text-center text-white/50", children: "No messages yet" })) : (rows.map((row) => {
                if (row.type === 'divider') {
                    return _jsx(DateDivider, { label: row.label }, row.key);
                }
                const messageId = String(row.message.messageId);
                if (hiddenAlbumMessageIds.has(messageId)) {
                    return null;
                }
                const albumCluster = albumClusterByStartMessageId.get(messageId);
                const visualAnchorMessageId = (albumCluster && albumLastMessageIdByStartMessageId.get(messageId)) || messageId;
                const bubbleVisualState = bubbleVisualStateByMessageId.get(visualAnchorMessageId);
                const clusterMessageIds = albumMessageIdsByStartMessageId.get(messageId) || [messageId];
                const isSearchMatch = clusterMessageIds.some((id) => matchedMessageIdSet.has(id));
                const isSearchActive = !!activeMatchedMessageId && clusterMessageIds.includes(activeMatchedMessageId);
                const isEntering = clusterMessageIds.some((id) => enteringMessageIds.has(id));
                const contextMessage = (albumCluster && albumContextMessageByStartMessageId.get(messageId)) || row.message;
                return (_jsxs("div", { id: toMessageDomId(row.message.messageId), "data-chat-message-row": "true", className: isEntering ? 'chat-message-enter-quick' : undefined, onContextMenu: (event) => {
                        event.preventDefault();
                        setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            message: contextMessage,
                            albumMessageIds: albumCluster
                                ? albumCluster.messages.map((message) => message.messageId)
                                : undefined,
                        });
                    }, children: [albumCluster
                            ? albumCluster.hiddenMessageIds.map((hiddenId) => (_jsx("span", { id: toMessageDomId(hiddenId), className: "block h-0 w-0 overflow-hidden", "aria-hidden": "true" }, `${row.key}-anchor-${hiddenId}`)))
                            : null, albumCluster ? (_jsx(ChatAlbumRow, { cluster: albumCluster, userId: userId, bubbleMaxWidthPx: messageBubbleMaxWidthPx, uploadingImages: uploadingImages, resolvePendingUploadPreviewUrl: resolvePendingUploadPreviewUrl, resolveUserName: resolveUserName, resolveUserAvatar: resolveUserAvatar, onCancelPendingUpload: onCancelPendingUpload, isSearchMatch: isSearchMatch, isSearchActive: isSearchActive, hideTail: bubbleVisualState?.hideTail ?? false, showEdgeAvatar: bubbleVisualState?.showEdgeAvatar ?? false, rowBottomGapPx: messageRowBottomGapByMessageId.get(visualAnchorMessageId) ??
                                MESSAGE_ROW_BASE_GAP_PX, onOpenMediaViewer: (payload) => {
                                const anchorId = toMediaViewerAnchorId(payload.messageId, payload.attachmentIndex);
                                const index = mediaViewerTimeline.findIndex((entry) => entry.id === anchorId);
                                if (index >= 0) {
                                    setMediaViewerIndex(index);
                                }
                            } })) : (_jsx(ChatMessageRow, { message: row.message, chatId: chatId, isGroupChat: isGroupChat, reactionsEnabled: reactionsEnabled, pollsEnabled: pollsEnabled, canManagePolls: canManagePolls, userId: userId, bubbleMaxWidthPx: messageBubbleMaxWidthPx, uploadingImages: uploadingImages, resolvePendingUploadPreviewUrl: resolvePendingUploadPreviewUrl, resolveUserName: resolveUserName, resolveUserAvatar: resolveUserAvatar, onCancelPendingUpload: onCancelPendingUpload, isSearchMatch: isSearchMatch, isSearchActive: isSearchActive, hideTail: bubbleVisualState?.hideTail ?? false, showEdgeAvatar: bubbleVisualState?.showEdgeAvatar ?? false, rowBottomGapPx: messageRowBottomGapByMessageId.get(messageId) ??
                                MESSAGE_ROW_BASE_GAP_PX, messageReactions: typeof row.message.messageId === 'number'
                                ? reactionsByMessageId[row.message.messageId]
                                : undefined, reactionsLoading: typeof row.message.messageId === 'number'
                                ? !!reactionLoadingByMessageId[row.message.messageId]
                                : false, reactionToggleLoading: typeof row.message.messageId === 'number'
                                ? !!reactionToggleLoadingByMessageId[row.message.messageId]
                                : false, onToggleReaction: toggleReaction, pollData: typeof row.message.messageId === 'number'
                                ? pollByMessageId[row.message.messageId]
                                : undefined, pollLoading: typeof row.message.messageId === 'number'
                                ? !!pollLoadingByMessageId[row.message.messageId]
                                : false, pollVoting: typeof row.message.messageId === 'number'
                                ? !!pollVoteLoadingByMessageId[row.message.messageId]
                                : false, pollClosing: typeof row.message.messageId === 'number'
                                ? !!pollCloseLoadingByMessageId[row.message.messageId]
                                : false, pollVoters: typeof row.message.messageId === 'number'
                                ? pollVotersByMessageId[row.message.messageId]
                                : undefined, pollVotersLoading: typeof row.message.messageId === 'number'
                                ? !!pollVotersLoadingByMessageId[row.message.messageId]
                                : false, onOpenPollVoters: openPollVotersModal, onVotePoll: votePoll, onClosePoll: closePoll, onOpenMediaViewer: (payload) => {
                                const anchorId = toMediaViewerAnchorId(payload.messageId, payload.attachmentIndex);
                                const index = mediaViewerTimeline.findIndex((entry) => entry.id === anchorId);
                                if (index >= 0) {
                                    setMediaViewerIndex(index);
                                }
                            } }))] }, row.key));
            })), _jsx("div", { ref: messagesEndRef }), contextMenu ? (_jsxs("div", { ref: contextMenuRef, className: "fixed z-[80] min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#201d28]/98 p-1.5 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-md", style: { left: safeMenuLeft, top: safeMenuTop }, children: [!contextIsGroupServiceMessage ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => {
                                    onReplyMessage(contextMenu.message);
                                    setContextMenu(null);
                                }, className: "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/92 transition-colors hover:bg-white/10", children: "Reply" }), _jsx("button", { type: "button", onClick: () => {
                                    onCopyMessage(menuCopyText);
                                    setContextMenu(null);
                                }, className: "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/92 transition-colors hover:bg-white/10", children: "Copy text" }), onRetryMessage ? (_jsx("button", { type: "button", onClick: () => {
                                    if (!canRetry)
                                        return;
                                    onRetryMessage(contextMenu.message.messageId);
                                    setContextMenu(null);
                                }, disabled: !canRetry, className: `flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${canRetry ? 'text-[#ffd58f] hover:bg-[#c89a4e]/18' : 'cursor-not-allowed text-[#ffd58f]/45'}`, children: "Retry send" })) : null, _jsx("button", { type: "button", onClick: () => {
                                    if (!canEdit)
                                        return;
                                    onEditMessage(contextMenu.message);
                                    setContextMenu(null);
                                }, disabled: !canEdit, className: `flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${canEdit ? 'text-white/92 hover:bg-white/10' : 'cursor-not-allowed text-white/35'}`, children: "Edit" })] })) : null, _jsx("button", { type: "button", onClick: () => {
                            if (!canDelete)
                                return;
                            if (contextHasAlbumGroup && contextAlbumMessageIds.length > 0) {
                                contextAlbumMessageIds.forEach((messageId) => {
                                    onDeleteMessage(messageId);
                                });
                            }
                            else {
                                onDeleteMessage(contextMenu.message.messageId);
                            }
                            setContextMenu(null);
                        }, disabled: !canDelete, className: `flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${canDelete ? 'text-[#ff9fb9] hover:bg-[#ff7da2]/16' : 'cursor-not-allowed text-[#ff9fb9]/45'}`, children: contextHasAlbumGroup ? 'Delete album' : 'Delete' })] })) : null, pollVotersModal ? (_jsxs("div", { className: "fixed inset-0 z-[88] flex items-center justify-center p-4", children: [_jsx("button", { type: "button", "aria-label": "Close poll voters", onClick: () => setPollVotersModal(null), className: "absolute inset-0 bg-black/62" }), _jsxs("div", { className: "relative z-[1] w-full max-w-[540px] rounded-[16px] border border-white/12 bg-[#1f1d27] p-4 shadow-[0_24px_56px_rgba(0,0,0,0.56)]", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("div", { className: "text-[14px] font-[700] text-white/94", children: "Poll voters" }), _jsx("button", { type: "button", onClick: () => setPollVotersModal(null), className: "rounded-[8px] border border-white/14 px-2 py-1 text-[12px] text-white/78 hover:bg-white/10", children: "Close" })] }), activePollVotersLoading ? (_jsx("div", { className: "text-[13px] text-white/66", children: "Loading voters..." })) : !activePollVoters || activePollVoters.items.length === 0 ? (_jsx("div", { className: "text-[13px] text-white/66", children: "No voter data" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-3 flex flex-wrap gap-2", children: activePollVoters.items.map((item) => (_jsxs("button", { type: "button", onClick: () => setPollVotersModal((prev) => prev ? { ...prev, optionIndex: item.optionIndex } : prev), className: `rounded-[8px] border px-2.5 py-1 text-[12px] ${activePollVoterOption?.optionIndex === item.optionIndex
                                                ? 'border-[#8d76ff]/70 bg-[#8d76ff33] text-white'
                                                : 'border-white/14 text-white/78 hover:bg-white/10'}`, children: [item.optionIndex + 1, ". ", item.optionText, " (", item.votes, ")"] }, `poll-voters-opt-${item.optionIndex}`))) }), _jsx("div", { className: "max-h-[320px] overflow-y-auto rounded-[10px] border border-white/10 bg-black/12 p-2", children: activePollVoterOption && activePollVoterOption.voters.length > 0 ? (activePollVoterOption.voters.map((voter) => (_jsxs("div", { className: "flex items-center justify-between rounded-[8px] px-2 py-1.5 text-[13px] text-white/88", children: [_jsx("div", { className: "truncate", children: voter.displayName || voter.username || voter.userId }), _jsx("div", { className: "ml-2 shrink-0 text-[11px] text-white/52", children: voter.votedAt ? formatMessageTime(voter.votedAt) : '' })] }, `poll-voter-${activePollVoterOption.optionIndex}-${voter.userId}-${voter.votedAt || ''}`)))) : (_jsx("div", { className: "px-2 py-2 text-[12px] text-white/62", children: "No votes for this option" })) })] }))] })] })) : null, mediaViewerIndex !== null && mediaViewerTimeline.length > 0 ? (_jsx(MediaViewerModal, { items: mediaViewerTimeline.map((entry) => entry.item), activeIndex: mediaViewerIndex, onClose: () => setMediaViewerIndex(null), onChangeIndex: (nextIndex) => setMediaViewerIndex(nextIndex) })) : null] }));
}
