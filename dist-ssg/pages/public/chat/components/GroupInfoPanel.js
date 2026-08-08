import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../../../../shared/api/http.js';
import { endpoints } from '../../../../shared/api/endpoints.js';
import { CloseIcon, PenSquareIcon } from '../icons.js';
import { Avatar } from './Avatar.js';
import { MediaViewerModal } from './messageTypes/MediaViewerModal.js';
const GROUP_INFO_TABS = [
    { id: 'members', label: 'Members' },
    { id: 'media', label: 'Media' },
    { id: 'links', label: 'Links' },
];
const LINK_META_CACHE = new Map();
const LINK_META_INFLIGHT = new Map();
const URL_IN_TEXT_PATTERN = /(?:(?:https?:\/\/)|(?:www\.))\S+/gi;
const MAX_AVATAR_DATA_URL_LENGTH = 65500;
const MEDIA_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long' });
const MEDIA_MONTH_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
});
async function fileToAvatarDataUrl(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Unable to read image'));
            img.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas is not available');
        }
        const maxSourceSide = Math.max(image.width, image.height, 1);
        const targetSides = [320, 256, 220, 192, 160];
        const qualities = [0.9, 0.82, 0.74, 0.66, 0.58];
        for (const targetSide of targetSides) {
            const scale = Math.min(1, targetSide / maxSourceSide);
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            for (const quality of qualities) {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) {
                    return dataUrl;
                }
            }
        }
        throw new Error('Avatar image is too large');
    }
    finally {
        URL.revokeObjectURL(objectUrl);
    }
}
function normalizePreviewText(text, fallback = 'Message with link') {
    const withoutUrls = text.replace(URL_IN_TEXT_PATTERN, ' ');
    const compact = withoutUrls.replace(/\s+/g, ' ').trim();
    return compact || fallback;
}
function buildOEmbedEndpoints(href) {
    let parsed;
    try {
        parsed = new URL(href);
    }
    catch {
        return [];
    }
    const encodedUrl = encodeURIComponent(parsed.toString());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const endpoints = [];
    if (host.includes('youtube.com') || host === 'youtu.be') {
        endpoints.push(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
    }
    else if (host.includes('vimeo.com')) {
        endpoints.push(`https://vimeo.com/api/oembed.json?url=${encodedUrl}`);
    }
    else if (host.includes('dailymotion.com') || host === 'dai.ly') {
        endpoints.push(`https://www.dailymotion.com/services/oembed?url=${encodedUrl}`);
    }
    else if (host.includes('rutube.ru')) {
        endpoints.push(`https://rutube.ru/api/oembed/?url=${encodedUrl}`);
    }
    else if (host.includes('spotify.com')) {
        endpoints.push(`https://open.spotify.com/oembed?url=${encodedUrl}`);
    }
    endpoints.push(`https://noembed.com/embed?url=${encodedUrl}`);
    return endpoints;
}
async function fetchLinkPreviewMeta(href) {
    try {
        const response = await http.get(endpoints.chatLinkPreview(href));
        const payload = response.data;
        if (payload && typeof payload === 'object') {
            const backendMeta = {
                sourceLabel: payload.providerName?.trim() || undefined,
                title: payload.title?.trim() || undefined,
                description: payload.description?.trim() || undefined,
                thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
            };
            if (backendMeta.sourceLabel ||
                backendMeta.title ||
                backendMeta.description ||
                backendMeta.thumbnailUrl) {
                return backendMeta;
            }
        }
    }
    catch {
        // fall through to direct oEmbed/noembed as a secondary fallback.
    }
    const oembedEndpoints = buildOEmbedEndpoints(href);
    if (oembedEndpoints.length === 0) {
        return null;
    }
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
            return {
                sourceLabel: payload.provider_name?.trim() || undefined,
                title: payload.title?.trim() || undefined,
                description: payload.description?.trim() ||
                    (payload.author_name?.trim() ? `by ${payload.author_name.trim()}` : undefined),
                thumbnailUrl: payload.thumbnail_url?.trim() || undefined,
            };
        }
        catch {
            continue;
        }
    }
    return null;
}
function LinkIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M10 14 8.2 15.8a3.5 3.5 0 0 1-5-5L6 8a3.5 3.5 0 0 1 5 0M14 10l1.8-1.8a3.5 3.5 0 1 1 5 5L18 16a3.5 3.5 0 0 1-5 0", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "m8.8 12.6 6.4-1.2", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function BellIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M15 18H5.8a1.8 1.8 0 0 1-1.6-2.6l1.2-2.3V9.8a5.6 5.6 0 1 1 11.2 0v3.3l1.2 2.3A1.8 1.8 0 0 1 16.2 18H15Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M9 18a2 2 0 0 0 4 0", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function UserPlusIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 18.5c0-2.4 2.7-4.5 6-4.5s6 2.1 6 4.5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }), _jsx("path", { d: "M19.5 7v5M17 9.5h5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })] }));
}
const DEFAULT_RESTRICTION_MEDIA_DRAFT = {
    sendPhotos: true,
    sendVideos: true,
    sendStickersAndGifs: true,
    sendMusic: true,
    sendVideoMessages: true,
    embedLinks: true,
    sendPolls: true,
};
const RESTRICTION_MEDIA_ITEMS = [
    { key: 'sendPhotos', label: 'Send Photos' },
    { key: 'sendVideos', label: 'Send Videos' },
    { key: 'sendStickersAndGifs', label: 'Send Stickers and GIFs' },
    { key: 'sendMusic', label: 'Send Music' },
    { key: 'sendVideoMessages', label: 'Send Video Messages' },
    { key: 'embedLinks', label: 'Embed Links' },
    { key: 'sendPolls', label: 'Send Polls' },
];
const DURATION_OPTIONS = [
    { id: 'FOREVER', label: 'Forever' },
    { id: 'DAY', label: '1 day', ms: 24 * 60 * 60 * 1000 },
    { id: 'WEEK', label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
    { id: 'MONTH', label: '1 month', ms: 30 * 24 * 60 * 60 * 1000 },
    { id: 'CUSTOM', label: 'Custom' },
];
const buildDefaultAdminRightsDraft = (forPromote) => ({
    canManageGroup: true,
    canDeleteMessages: forPromote,
    canBanUsers: forPromote,
    canManageInviteLinks: forPromote,
    canPinMessages: true,
    canManageTopics: forPromote,
    isAnonymous: false,
    canManageMembers: false,
    customTitle: forPromote ? 'admin' : '',
});
const mapAdminRightsToDraft = (rights, forPromote) => {
    if (!rights) {
        return buildDefaultAdminRightsDraft(forPromote);
    }
    return {
        canManageGroup: !!rights.canManageGroup,
        canDeleteMessages: !!rights.canDeleteMessages,
        canBanUsers: !!rights.canBanUsers,
        canManageInviteLinks: !!rights.canManageInviteLinks,
        canPinMessages: !!rights.canPinMessages,
        canManageTopics: !!rights.canManageTopics,
        isAnonymous: !!rights.isAnonymous,
        canManageMembers: !!rights.canManageMembers,
        customTitle: rights.customTitle?.trim() || '',
    };
};
const areAdminRightsEqual = (left, right) => {
    if (!left || !right)
        return false;
    return (left.canManageGroup === right.canManageGroup &&
        left.canDeleteMessages === right.canDeleteMessages &&
        left.canBanUsers === right.canBanUsers &&
        left.canManageInviteLinks === right.canManageInviteLinks &&
        left.canPinMessages === right.canPinMessages &&
        left.canManageTopics === right.canManageTopics &&
        left.isAnonymous === right.isAnonymous &&
        left.canManageMembers === right.canManageMembers &&
        left.customTitle.trim() === right.customTitle.trim());
};
const countEnabledMediaPermissions = (media) => RESTRICTION_MEDIA_ITEMS.reduce((total, item) => total + (media[item.key] ? 1 : 0), 0);
const parseRestrictionDuration = (mutedUntil) => {
    if (!mutedUntil) {
        return { durationId: 'FOREVER', customUntilIso: null };
    }
    const parsed = Date.parse(mutedUntil);
    if (!Number.isFinite(parsed)) {
        return { durationId: 'FOREVER', customUntilIso: null };
    }
    const diff = Math.max(0, parsed - Date.now());
    const oneHour = 60 * 60 * 1000;
    for (const option of DURATION_OPTIONS) {
        if (!option.ms)
            continue;
        if (Math.abs(diff - option.ms) <= oneHour) {
            return { durationId: option.id, customUntilIso: null };
        }
    }
    return { durationId: 'CUSTOM', customUntilIso: new Date(parsed).toISOString() };
};
const mapRestrictionsToDraft = (restrictions) => {
    const mediaEnabled = restrictions?.canSendMedia ?? true;
    const media = {
        sendPhotos: restrictions?.canSendPhotos ?? mediaEnabled,
        sendVideos: restrictions?.canSendVideos ?? mediaEnabled,
        sendStickersAndGifs: restrictions?.canSendStickersAndGifs ?? mediaEnabled,
        sendMusic: restrictions?.canSendMusic ?? mediaEnabled,
        sendVideoMessages: restrictions?.canSendVideoMessages ?? mediaEnabled,
        embedLinks: restrictions?.canEmbedLinks ?? mediaEnabled,
        sendPolls: restrictions?.canSendPolls ?? true,
    };
    const count = countEnabledMediaPermissions(media);
    const duration = parseRestrictionDuration(restrictions?.mutedUntil);
    return {
        canSendMessages: restrictions?.canSendMessages ?? true,
        canSendMedia: restrictions?.canSendMedia ?? count > 0,
        canAddUsers: restrictions?.canInviteUsers ?? true,
        canPinMessages: restrictions?.canPinMessages ?? true,
        canChangeChatInfo: restrictions?.canChangeInfo ?? true,
        media,
        durationId: duration.durationId,
        customUntilIso: duration.customUntilIso,
    };
};
const areRestrictionDraftsEqual = (left, right) => {
    if (!left || !right)
        return false;
    return (left.canSendMessages === right.canSendMessages &&
        left.canSendMedia === right.canSendMedia &&
        left.canAddUsers === right.canAddUsers &&
        left.canPinMessages === right.canPinMessages &&
        left.canChangeChatInfo === right.canChangeChatInfo &&
        left.media.sendPhotos === right.media.sendPhotos &&
        left.media.sendVideos === right.media.sendVideos &&
        left.media.sendStickersAndGifs === right.media.sendStickersAndGifs &&
        left.media.sendMusic === right.media.sendMusic &&
        left.media.sendVideoMessages === right.media.sendVideoMessages &&
        left.media.embedLinks === right.media.embedLinks &&
        left.media.sendPolls === right.media.sendPolls &&
        left.durationId === right.durationId &&
        (left.customUntilIso || '') === (right.customUntilIso || ''));
};
const buildDurationUntilIso = (durationId, customUntilIso) => {
    const now = Date.now();
    if (durationId === 'CUSTOM') {
        if (!customUntilIso)
            return null;
        const parsed = Date.parse(customUntilIso);
        if (!Number.isFinite(parsed) || parsed <= now)
            return null;
        return new Date(parsed).toISOString();
    }
    const selected = DURATION_OPTIONS.find((item) => item.id === durationId);
    if (!selected?.ms) {
        return null;
    }
    return new Date(now + selected.ms).toISOString();
};
function BackArrowIcon({ size = 28 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m14.5 5.5-7 6.5 7 6.5", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function CheckIcon({ size = 24 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m5.5 12.5 4.1 4 8.9-9.5", stroke: "currentColor", strokeWidth: "2.3", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ChevronDownIcon({ size = 22 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6 9 6 6 6-6", stroke: "currentColor", strokeWidth: "2.1", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ChevronUpIcon({ size = 22 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6 15 6-6 6 6", stroke: "currentColor", strokeWidth: "2.1", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ContextMessageIcon({ size = 30 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M5.8 18.2 4 20V7.2A2.2 2.2 0 0 1 6.2 5h11.6A2.2 2.2 0 0 1 20 7.2v7.6a2.2 2.2 0 0 1-2.2 2.2H5.8Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ContextShieldIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 3.5 18.7 6v5.9c0 4.2-2.7 6.9-6.7 8.6-4-1.7-6.7-4.4-6.7-8.6V6L12 3.5Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M9.2 12h5.6", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function ContextPromoteIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 3.5 18.7 6v5.9c0 4.2-2.7 6.9-6.7 8.6-4-1.7-6.7-4.4-6.7-8.6V6L12 3.5Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M12 8v6M9 11h6", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function ContextOwnerIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "m4.8 18.7 1.1-8.4 4.2 3.4L12 7.1l1.9 6.6 4.2-3.4 1.1 8.4H4.8Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8.4 18.7h7.2", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function ContextTrashIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M4.5 7h15", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" }), _jsx("path", { d: "M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" }), _jsx("path", { d: "M7 7.4v9.8A2 2 0 0 0 9 19.2h6a2 2 0 0 0 2-2V7.4", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function DismissAdminIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M16 15.5a3.5 3.5 0 1 0-3.5-3.5", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" }), _jsx("path", { d: "M5 20v-.7c0-2.1 2.4-3.8 5.5-3.8h1.4", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" }), _jsx("path", { d: "m17.5 18.5 3-3M17.5 15.5l3 3", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function GroupEditLockIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "6.5", y: "10.5", width: "11", height: "9", rx: "2.2", stroke: "currentColor", strokeWidth: "1.9" }), _jsx("path", { d: "M9 10.5V8.7a3 3 0 0 1 6 0v1.8", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function GroupEditHeartIcon({ size = 30 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M12 19.3S4.8 14.8 4.8 9.7A3.8 3.8 0 0 1 12 8.3a3.8 3.8 0 0 1 7.2 1.4c0 5.1-7.2 9.6-7.2 9.6Z", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function GroupEditPermissionsIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "5.2", y: "6.2", width: "9.2", height: "9.2", rx: "1.8", stroke: "currentColor", strokeWidth: "1.9" }), _jsx("rect", { x: "9.6", y: "10.6", width: "9.2", height: "9.2", rx: "1.8", stroke: "currentColor", strokeWidth: "1.9" })] }));
}
function GroupEditRecentIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "6.2", y: "4.5", width: "11.6", height: "15", rx: "2", stroke: "currentColor", strokeWidth: "1.9" }), _jsx("path", { d: "M9.2 8.8h5.6M9.2 12h5.6M9.2 15.2h5.6", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" })] }));
}
function GroupEditTopicsIcon({ size = 30 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M7 7.6h10M7 12h10M7 16.4h10", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" }), _jsx("circle", { cx: "4.7", cy: "7.6", r: "0.9", fill: "currentColor" }), _jsx("circle", { cx: "4.7", cy: "12", r: "0.9", fill: "currentColor" }), _jsx("circle", { cx: "4.7", cy: "16.4", r: "0.9", fill: "currentColor" })] }));
}
function GroupEditHistoryIcon({ size = 30 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("rect", { x: "5.8", y: "5.8", width: "12.4", height: "12.4", rx: "3", stroke: "currentColor", strokeWidth: "1.9" }) }));
}
function TelegramSwitch({ checked, onChange, disabled = false, dangerWhenOff = true, }) {
    return (_jsx("button", { type: "button", onClick: () => {
            if (disabled)
                return;
            onChange(!checked);
        }, disabled: disabled, className: `relative inline-flex h-[20px] w-[40px] items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked
            ? 'border-[#8e75f8] bg-[#8e75f8]'
            : dangerWhenOff
                ? 'border-[#ff5b67] bg-[#ff5b67]'
                : 'border-white/18 bg-white/14'}`, "aria-pressed": checked, children: _jsx("span", { className: `absolute h-[16px] w-[16px] rounded-full border border-[#1d1e26] bg-[#1a1b22] transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}` }) }));
}
function TelegramCheckbox({ checked, onToggle, }) {
    return (_jsx("button", { type: "button", onClick: onToggle, className: `grid h-[20px] w-[20px] place-items-center rounded-[6px] border transition-colors ${checked ? 'border-[#8e75f8] bg-[#8e75f8]' : 'border-white/18 bg-transparent'}`, "aria-pressed": checked, children: checked ? (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6.5 12.5 3.6 3.5 7.4-8", stroke: "white", strokeWidth: "2.6", strokeLinecap: "round", strokeLinejoin: "round" }) })) : null }));
}
function GroupInfoLinkRow({ item }) {
    const [meta, setMeta] = useState(null);
    useEffect(() => {
        let disposed = false;
        const cached = LINK_META_CACHE.get(item.href);
        if (cached !== undefined) {
            setMeta(cached);
            return () => {
                disposed = true;
            };
        }
        void (async () => {
            const pending = LINK_META_INFLIGHT.get(item.href) ??
                fetchLinkPreviewMeta(item.href).finally(() => {
                    LINK_META_INFLIGHT.delete(item.href);
                });
            LINK_META_INFLIGHT.set(item.href, pending);
            const loadedMeta = await pending;
            LINK_META_CACHE.set(item.href, loadedMeta);
            if (!disposed) {
                setMeta(loadedMeta);
            }
        })();
        return () => {
            disposed = true;
        };
    }, [item.href]);
    const resolvedSource = meta?.sourceLabel || item.sourceLabel;
    const resolvedTitle = meta?.title || item.title;
    const resolvedPreview = useMemo(() => normalizePreviewText(meta?.description || item.previewText, 'Message with link'), [meta?.description, item.previewText]);
    const resolvedThumbnail = meta?.thumbnailUrl || item.thumbnailUrl;
    return (_jsxs("a", { href: item.href, target: "_blank", rel: "noopener noreferrer", className: "flex items-start gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]", children: [_jsx("div", { className: "mt-0.5 h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[10px] bg-[#2a2b34]", children: resolvedThumbnail ? (_jsx("img", { src: resolvedThumbnail, alt: resolvedSource, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "grid h-full w-full place-items-center text-white/48", children: _jsx(LinkIcon, { size: 22 }) })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { className: "truncate text-[16px] font-[600] leading-tight text-white/95", children: resolvedTitle }), _jsx("div", { className: "shrink-0 text-[13px] text-white/48", children: item.dateLabel })] }), _jsx("div", { className: "mt-1 truncate text-[14px] text-white/62", children: resolvedPreview }), _jsx("div", { className: "mt-[6px] truncate text-[14px] text-[#9f88ff] underline underline-offset-2", children: item.displayUrl })] })] }));
}
function GroupMediaGridThumb({ item, onClick, }) {
    const fullPreviewUrl = item.thumbnailUrl ||
        (item.isImage ? item.attachmentUrl || `/media/${item.attachmentPath}` : undefined);
    const placeholderUrl = item.strippedThumbnailUrl ||
        item.thumbnailUrl ||
        (item.isImage ? item.attachmentUrl || `/media/${item.attachmentPath}` : undefined);
    const [isFullVisible, setIsFullVisible] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    useEffect(() => {
        setIsFullVisible(false);
        setLoadFailed(false);
    }, [fullPreviewUrl]);
    return (_jsxs("button", { type: "button", onClick: onClick, className: "relative block aspect-square overflow-hidden bg-[#272832] transition-opacity hover:opacity-95", children: [_jsx("span", { "aria-hidden": "true", className: `pointer-events-none absolute inset-0 transition-opacity duration-300 ${isFullVisible ? 'opacity-0' : 'opacity-100'}`, children: placeholderUrl ? (_jsx("span", { className: "absolute inset-0", style: {
                        backgroundImage: `url(${placeholderUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(12px)',
                        transform: 'scale(1.06)',
                    } })) : (_jsx("span", { className: "absolute inset-0 bg-[#1f2129]" })) }), fullPreviewUrl && !loadFailed ? (_jsx("img", { src: fullPreviewUrl, alt: item.fileName || item.attachmentPath, className: `h-full w-full object-cover transition-opacity duration-300 ${isFullVisible ? 'opacity-100' : 'opacity-0'}`, loading: "lazy", decoding: "async", onLoad: () => setIsFullVisible(true), onError: () => {
                    setLoadFailed(true);
                    setIsFullVisible(true);
                } })) : null, loadFailed || (!fullPreviewUrl && !placeholderUrl) ? (_jsx("div", { className: "grid h-full w-full place-items-center text-[11px] font-[700] text-white/60", children: "FILE" })) : null] }));
}
export function GroupInfoPanel({ chat, isOpen = false, memberCount, members, links, linksLoading, linksHasMore, onLinksLoadMore, activeTab, onTabChange, notificationsEnabled, onNotificationsEnabledChange, canEditGroup = false, canAddMembers = true, isOwner = false, onUpdateGroup, onTransferOwnership, onPromoteMember, onDemoteMember, onRemoveMember, onLeaveGroup, onDeleteGroup, onAddMembersClick, groupSettings, groupPermissions, inviteLinks = [], joinRequests = [], topics = [], activeTopicId, adminLogItems = [], adminLogLoading = false, adminLogHasMore = false, onAdminLogLoadMore, mediaItems = [], mediaLoading = false, mediaHasMore = false, onMediaLoadMore, onUpdateGroupSettings, onUpdateGroupPermissions, onCreateInviteLink, onUpdateInviteLink, onRevokeInviteLink, onApproveJoinRequest, onDeclineJoinRequest, onCreateTopic, onToggleTopicClosed, onDeleteTopic, onOpenTopic, onPinMessage, onUnpinMessage, onMuteMember, onUnmuteMember, onBanMember, onUnbanMember, onOpenPrivateChat, onLoadMemberRestrictions, onSaveMemberRestrictions, onLoadMemberAdminRights, onSaveMemberAdminRights, onCreatePoll, onClose, }) {
    const inviteLink = `t.me/+group${chat.chatId.toString(36)}`;
    const hasCover = !!chat.avatarUrl;
    const panelRef = useRef(null);
    const scrollRef = useRef(null);
    const [isGroupEditOpen, setIsGroupEditOpen] = useState(false);
    const [showUnsavedGroupEditDialog, setShowUnsavedGroupEditDialog] = useState(false);
    const [editTitle, setEditTitle] = useState(chat.name);
    const [editAvatarPath, setEditAvatarPath] = useState(chat.avatarUrl || '');
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const [memberActionPendingId, setMemberActionPendingId] = useState(null);
    const [groupActionPending, setGroupActionPending] = useState(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [isInvitePending, setIsInvitePending] = useState(false);
    const [inviteNameDraft, setInviteNameDraft] = useState('');
    const [inviteNeedsApproval, setInviteNeedsApproval] = useState(false);
    const [topicTitleDraft, setTopicTitleDraft] = useState('');
    const [topicEmojiDraft, setTopicEmojiDraft] = useState('');
    const [pinMessageIdDraft, setPinMessageIdDraft] = useState('');
    const [pollQuestionDraft, setPollQuestionDraft] = useState('');
    const [pollOptionsDraft, setPollOptionsDraft] = useState('Yes\nNo');
    const [pollAllowsMultipleDraft, setPollAllowsMultipleDraft] = useState(false);
    const [pollQuizDraft, setPollQuizDraft] = useState(false);
    const [pollCorrectOptionDraft, setPollCorrectOptionDraft] = useState('');
    const [pollExplanationDraft, setPollExplanationDraft] = useState('');
    const [pollAnonymousVotesDraft, setPollAnonymousVotesDraft] = useState(true);
    const [settingsDraft, setSettingsDraft] = useState({
        description: '',
        isPublic: false,
        publicUsername: '',
        historyVisibleToNewMembers: true,
        slowModeSeconds: 0,
        topicsEnabled: false,
        reactionsEnabled: true,
        reactionMode: 'ALL',
        allowedReactionsText: '',
        pollsEnabled: true,
    });
    const [permissionsDraft, setPermissionsDraft] = useState({
        canSendMessages: true,
        canSendMedia: true,
        canSendPolls: true,
        canAddWebPagePreviews: true,
        canChangeInfo: false,
        canInviteUsers: false,
        canPinMessages: false,
    });
    const contextMenuRef = useRef(null);
    const durationMenuRef = useRef(null);
    const groupEditAvatarInputRef = useRef(null);
    const [memberContextMenu, setMemberContextMenu] = useState(null);
    const [memberEditor, setMemberEditor] = useState(null);
    const [isLoadingMemberEditor, setIsLoadingMemberEditor] = useState(false);
    const [isSavingMemberEditor, setIsSavingMemberEditor] = useState(false);
    const [adminRightsDraft, setAdminRightsDraft] = useState(null);
    const [initialAdminRightsDraft, setInitialAdminRightsDraft] = useState(null);
    const [restrictionDraft, setRestrictionDraft] = useState(null);
    const [initialRestrictionDraft, setInitialRestrictionDraft] = useState(null);
    const [isMediaSectionExpanded, setIsMediaSectionExpanded] = useState(false);
    const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);
    const [showUnsavedMemberDialog, setShowUnsavedMemberDialog] = useState(false);
    const [groupMediaViewerIndex, setGroupMediaViewerIndex] = useState(null);
    useEffect(() => {
        setEditTitle(chat.name);
        setEditAvatarPath(chat.avatarUrl || '');
        setIsGroupEditOpen(false);
        setShowUnsavedGroupEditDialog(false);
        setIsSavingGroup(false);
        setMemberActionPendingId(null);
        setGroupActionPending(null);
        setIsSavingSettings(false);
        setIsSavingPermissions(false);
        setIsInvitePending(false);
        setInviteNameDraft('');
        setInviteNeedsApproval(false);
        setTopicTitleDraft('');
        setTopicEmojiDraft('');
        setPinMessageIdDraft('');
        setPollQuestionDraft('');
        setPollOptionsDraft('Yes\nNo');
        setPollAllowsMultipleDraft(false);
        setPollQuizDraft(false);
        setPollCorrectOptionDraft('');
        setPollExplanationDraft('');
        setPollAnonymousVotesDraft(true);
        setMemberContextMenu(null);
        setMemberEditor(null);
        setIsLoadingMemberEditor(false);
        setIsSavingMemberEditor(false);
        setAdminRightsDraft(null);
        setInitialAdminRightsDraft(null);
        setRestrictionDraft(null);
        setInitialRestrictionDraft(null);
        setIsMediaSectionExpanded(false);
        setIsDurationMenuOpen(false);
        setShowUnsavedMemberDialog(false);
        setGroupMediaViewerIndex(null);
    }, [chat.avatarUrl, chat.chatId, chat.name]);
    useEffect(() => {
        setSettingsDraft({
            description: groupSettings?.description || '',
            isPublic: !!groupSettings?.isPublic,
            publicUsername: groupSettings?.publicUsername || '',
            historyVisibleToNewMembers: groupSettings?.historyVisibleToNewMembers ?? true,
            slowModeSeconds: groupSettings?.slowModeSeconds ?? 0,
            topicsEnabled: groupSettings?.topicsEnabled ?? false,
            reactionsEnabled: groupSettings?.reactionsEnabled ?? true,
            reactionMode: groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'),
            allowedReactionsText: (groupSettings?.allowedReactions || []).join(' '),
            pollsEnabled: groupSettings?.pollsEnabled ?? true,
        });
        setPinMessageIdDraft(groupSettings?.pinnedMessageId ? String(groupSettings.pinnedMessageId) : '');
    }, [groupSettings]);
    useEffect(() => {
        setPermissionsDraft({
            canSendMessages: groupPermissions?.canSendMessages ?? true,
            canSendMedia: groupPermissions?.canSendMedia ?? true,
            canSendPolls: groupPermissions?.canSendPolls ?? true,
            canAddWebPagePreviews: groupPermissions?.canAddWebPagePreviews ?? true,
            canChangeInfo: groupPermissions?.canChangeInfo ?? false,
            canInviteUsers: groupPermissions?.canInviteUsers ?? false,
            canPinMessages: groupPermissions?.canPinMessages ?? false,
        });
    }, [groupPermissions]);
    const submitGroupEdit = useCallback(async () => {
        if (!onUpdateGroup || isSavingGroup)
            return true;
        setIsSavingGroup(true);
        try {
            await onUpdateGroup({
                title: editTitle,
                avatarPath: editAvatarPath,
            });
            return true;
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update group');
            return false;
        }
        finally {
            setIsSavingGroup(false);
        }
    }, [editAvatarPath, editTitle, isSavingGroup, onUpdateGroup]);
    const runMemberAction = useCallback(async (userId, action, fallbackError = 'Failed to update member') => {
        if (!action || memberActionPendingId)
            return;
        setMemberActionPendingId(userId);
        try {
            await action(userId);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : fallbackError);
        }
        finally {
            setMemberActionPendingId(null);
        }
    }, [memberActionPendingId]);
    const runGroupAction = useCallback(async (actionType, action, fallbackError = 'Failed to update group') => {
        if (!action || groupActionPending)
            return;
        setGroupActionPending(actionType);
        try {
            await action();
        }
        catch (error) {
            alert(error instanceof Error ? error.message : fallbackError);
        }
        finally {
            setGroupActionPending(null);
        }
    }, [groupActionPending]);
    const selectedMenuMember = useMemo(() => members.find((member) => member.userId === memberContextMenu?.userId) || null, [memberContextMenu?.userId, members]);
    const buildMemberContextActions = useCallback((member) => {
        const actions = [];
        if (!member.isCurrentUser && onOpenPrivateChat) {
            actions.push('send-message');
        }
        if (member.role === 'MEMBER' && onPromoteMember && onSaveMemberAdminRights) {
            actions.push('promote-admin');
        }
        if ((member.role === 'ADMIN' || member.role === 'OWNER') &&
            onSaveMemberAdminRights) {
            actions.push('edit-admin-rights');
        }
        if (member.canTransferOwnership && onTransferOwnership) {
            actions.push('make-owner');
        }
        if (member.role === 'MEMBER' && onSaveMemberRestrictions) {
            actions.push('restrict-user');
        }
        if (member.canRemove && onRemoveMember) {
            actions.push('remove-member');
        }
        return actions;
    }, [
        onOpenPrivateChat,
        onTransferOwnership,
        onPromoteMember,
        onRemoveMember,
        onSaveMemberAdminRights,
        onSaveMemberRestrictions,
    ]);
    const openAdminRightsEditor = useCallback(async (member, mode) => {
        setMemberContextMenu(null);
        setMemberEditor({ mode, member });
        setShowUnsavedMemberDialog(false);
        setIsDurationMenuOpen(false);
        setIsMediaSectionExpanded(false);
        setRestrictionDraft(null);
        setInitialRestrictionDraft(null);
        setIsLoadingMemberEditor(true);
        try {
            const fallbackAsPromoted = mode === 'promote-admin' || member.role === 'OWNER';
            const shouldLoad = mode === 'admin-rights' && !!onLoadMemberAdminRights;
            const rights = shouldLoad ? await onLoadMemberAdminRights(member.userId) : null;
            const nextDraft = mapAdminRightsToDraft(rights, fallbackAsPromoted);
            setAdminRightsDraft(nextDraft);
            setInitialAdminRightsDraft(nextDraft);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to load admin rights');
            const fallback = mapAdminRightsToDraft(null, mode === 'promote-admin' || member.role === 'OWNER');
            setAdminRightsDraft(fallback);
            setInitialAdminRightsDraft(fallback);
        }
        finally {
            setIsLoadingMemberEditor(false);
        }
    }, [onLoadMemberAdminRights]);
    const openRestrictionEditor = useCallback(async (member) => {
        setMemberContextMenu(null);
        setMemberEditor({ mode: 'restrict-user', member });
        setShowUnsavedMemberDialog(false);
        setIsDurationMenuOpen(false);
        setIsMediaSectionExpanded(false);
        setAdminRightsDraft(null);
        setInitialAdminRightsDraft(null);
        setIsLoadingMemberEditor(true);
        try {
            const restrictions = onLoadMemberRestrictions
                ? await onLoadMemberRestrictions(member.userId)
                : null;
            const nextDraft = mapRestrictionsToDraft(restrictions);
            setRestrictionDraft(nextDraft);
            setInitialRestrictionDraft(nextDraft);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to load user permissions');
            const fallback = mapRestrictionsToDraft(null);
            setRestrictionDraft(fallback);
            setInitialRestrictionDraft(fallback);
        }
        finally {
            setIsLoadingMemberEditor(false);
        }
    }, [onLoadMemberRestrictions]);
    const handleMemberContextAction = useCallback(async (action, member) => {
        setMemberContextMenu(null);
        if (action === 'send-message') {
            if (!onOpenPrivateChat)
                return;
            try {
                await onOpenPrivateChat(member.userId);
            }
            catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to open private chat');
            }
            return;
        }
        if (action === 'promote-admin') {
            await openAdminRightsEditor(member, 'promote-admin');
            return;
        }
        if (action === 'edit-admin-rights') {
            await openAdminRightsEditor(member, 'admin-rights');
            return;
        }
        if (action === 'make-owner') {
            if (!confirm(`Transfer ownership to ${member.name}?`))
                return;
            await runMemberAction(member.userId, onTransferOwnership, 'Failed to transfer ownership');
            return;
        }
        if (action === 'restrict-user') {
            await openRestrictionEditor(member);
            return;
        }
        if (action === 'remove-member') {
            await runMemberAction(member.userId, onRemoveMember, 'Failed to remove member');
        }
    }, [
        onOpenPrivateChat,
        onTransferOwnership,
        onRemoveMember,
        openAdminRightsEditor,
        openRestrictionEditor,
        runMemberAction,
    ]);
    const isAdminRightsEditorMode = memberEditor?.mode === 'admin-rights' || memberEditor?.mode === 'promote-admin';
    const isRestrictionEditorMode = memberEditor?.mode === 'restrict-user';
    const isAdminRightsDirty = isAdminRightsEditorMode && !areAdminRightsEqual(adminRightsDraft, initialAdminRightsDraft);
    const isRestrictionDirty = isRestrictionEditorMode && !areRestrictionDraftsEqual(restrictionDraft, initialRestrictionDraft);
    const hasMemberEditorUnsavedChanges = isAdminRightsDirty || isRestrictionDirty;
    const saveAdminRightsEditor = useCallback(async (closeAfterSave = false) => {
        if (!memberEditor || !isAdminRightsEditorMode || !adminRightsDraft) {
            return true;
        }
        if (!onSaveMemberAdminRights || isSavingMemberEditor) {
            return false;
        }
        setIsSavingMemberEditor(true);
        try {
            if (memberEditor.mode === 'promote-admin' && onPromoteMember) {
                await onPromoteMember(memberEditor.member.userId);
            }
            const normalizedTitle = adminRightsDraft.customTitle.trim();
            await onSaveMemberAdminRights(memberEditor.member.userId, {
                canManageGroup: adminRightsDraft.canManageGroup,
                canDeleteMessages: adminRightsDraft.canDeleteMessages,
                canBanUsers: adminRightsDraft.canBanUsers,
                canManageInviteLinks: adminRightsDraft.canManageInviteLinks,
                canPinMessages: adminRightsDraft.canPinMessages,
                canManageTopics: adminRightsDraft.canManageTopics,
                canManageMembers: adminRightsDraft.canManageMembers,
                isAnonymous: adminRightsDraft.isAnonymous,
                canManageReactions: adminRightsDraft.canManageGroup,
                canManagePolls: adminRightsDraft.canManageGroup,
                customTitle: normalizedTitle || null,
            });
            const finalizedDraft = {
                ...adminRightsDraft,
                customTitle: normalizedTitle,
            };
            setAdminRightsDraft(finalizedDraft);
            setInitialAdminRightsDraft(finalizedDraft);
            if (closeAfterSave) {
                setMemberEditor(null);
                setShowUnsavedMemberDialog(false);
            }
            return true;
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to save admin rights');
            return false;
        }
        finally {
            setIsSavingMemberEditor(false);
        }
    }, [
        adminRightsDraft,
        isAdminRightsEditorMode,
        isSavingMemberEditor,
        memberEditor,
        onPromoteMember,
        onSaveMemberAdminRights,
    ]);
    const saveRestrictionEditor = useCallback(async (closeAfterSave = false) => {
        if (!memberEditor || !isRestrictionEditorMode || !restrictionDraft) {
            return true;
        }
        if (!onSaveMemberRestrictions || isSavingMemberEditor) {
            return false;
        }
        setIsSavingMemberEditor(true);
        try {
            const hasMediaPermission = countEnabledMediaPermissions(restrictionDraft.media) > 0;
            const mutedUntil = buildDurationUntilIso(restrictionDraft.durationId, restrictionDraft.customUntilIso);
            await onSaveMemberRestrictions(memberEditor.member.userId, {
                canSendMessages: restrictionDraft.canSendMessages,
                canSendMedia: hasMediaPermission && restrictionDraft.canSendMedia,
                canSendPhotos: restrictionDraft.media.sendPhotos,
                canSendVideos: restrictionDraft.media.sendVideos,
                canSendStickersAndGifs: restrictionDraft.media.sendStickersAndGifs,
                canSendMusic: restrictionDraft.media.sendMusic,
                canSendVideoMessages: restrictionDraft.media.sendVideoMessages,
                canEmbedLinks: restrictionDraft.media.embedLinks,
                canSendPolls: restrictionDraft.media.sendPolls,
                canInviteUsers: restrictionDraft.canAddUsers,
                canPinMessages: restrictionDraft.canPinMessages,
                canChangeInfo: restrictionDraft.canChangeChatInfo,
                mutedUntil: mutedUntil ?? undefined,
                clearMutedUntil: mutedUntil ? undefined : true,
            });
            const finalizedDraft = {
                ...restrictionDraft,
                canSendMedia: hasMediaPermission && restrictionDraft.canSendMedia,
            };
            setRestrictionDraft(finalizedDraft);
            setInitialRestrictionDraft(finalizedDraft);
            if (closeAfterSave) {
                setMemberEditor(null);
                setShowUnsavedMemberDialog(false);
                setIsDurationMenuOpen(false);
            }
            return true;
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to save user permissions');
            return false;
        }
        finally {
            setIsSavingMemberEditor(false);
        }
    }, [isRestrictionEditorMode, isSavingMemberEditor, memberEditor, onSaveMemberRestrictions, restrictionDraft]);
    const saveCurrentMemberEditor = useCallback(async (closeAfterSave = false) => {
        if (isAdminRightsEditorMode) {
            return saveAdminRightsEditor(closeAfterSave);
        }
        if (isRestrictionEditorMode) {
            return saveRestrictionEditor(closeAfterSave);
        }
        return true;
    }, [isAdminRightsEditorMode, isRestrictionEditorMode, saveAdminRightsEditor, saveRestrictionEditor]);
    const closeMemberEditor = useCallback(() => {
        if (isSavingMemberEditor)
            return;
        if (hasMemberEditorUnsavedChanges) {
            setShowUnsavedMemberDialog(true);
            return;
        }
        setMemberEditor(null);
        setShowUnsavedMemberDialog(false);
        setIsDurationMenuOpen(false);
    }, [hasMemberEditorUnsavedChanges, isSavingMemberEditor]);
    const memberContextMenuStyle = useMemo(() => {
        if (!memberContextMenu || !panelRef.current) {
            return null;
        }
        const panelRect = panelRef.current.getBoundingClientRect();
        const width = Math.min(256, Math.max(180, panelRect.width - 58));
        const rowHeight = 40;
        const totalHeight = 14 + memberContextMenu.actions.length * rowHeight;
        const margin = 12;
        const xInPanel = memberContextMenu.x - panelRect.left;
        const yInPanel = memberContextMenu.y - panelRect.top;
        const left = Math.max(margin, Math.min(xInPanel, panelRect.width - width - margin));
        const top = Math.max(margin, Math.min(yInPanel, panelRect.height - totalHeight - margin));
        return { left, top, width };
    }, [memberContextMenu]);
    useEffect(() => {
        if (activeTab !== 'members') {
            setMemberContextMenu(null);
            setMemberEditor(null);
            setShowUnsavedMemberDialog(false);
            setIsDurationMenuOpen(false);
        }
    }, [activeTab]);
    useEffect(() => {
        if (!isOpen) {
            setIsGroupEditOpen(false);
            setShowUnsavedGroupEditDialog(false);
        }
    }, [isOpen]);
    useEffect(() => {
        const handlePointerDown = (event) => {
            const target = event.target;
            if (memberContextMenu && contextMenuRef.current && !contextMenuRef.current.contains(target)) {
                setMemberContextMenu(null);
            }
            if (isDurationMenuOpen && durationMenuRef.current && !durationMenuRef.current.contains(target)) {
                setIsDurationMenuOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key !== 'Escape')
                return;
            if (event.defaultPrevented)
                return;
            if (!isOpen)
                return;
            const hasUnsavedGroupEditChanges = editTitle.trim() !== chat.name.trim() ||
                editAvatarPath.trim() !== (chat.avatarUrl || '').trim() ||
                settingsDraft.description !== (groupSettings?.description || '') ||
                settingsDraft.isPublic !== !!groupSettings?.isPublic ||
                settingsDraft.topicsEnabled !== (groupSettings?.topicsEnabled ?? false) ||
                settingsDraft.historyVisibleToNewMembers !==
                    (groupSettings?.historyVisibleToNewMembers ?? true) ||
                settingsDraft.reactionMode !==
                    (groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'));
            if (showUnsavedGroupEditDialog) {
                event.preventDefault();
                setShowUnsavedGroupEditDialog(false);
                return;
            }
            if (isGroupEditOpen) {
                event.preventDefault();
                if (isSavingGroup || isSavingSettings)
                    return;
                if (hasUnsavedGroupEditChanges) {
                    setShowUnsavedGroupEditDialog(true);
                    return;
                }
                setIsGroupEditOpen(false);
                setShowUnsavedGroupEditDialog(false);
                return;
            }
            if (showUnsavedMemberDialog) {
                event.preventDefault();
                setShowUnsavedMemberDialog(false);
                return;
            }
            if (isDurationMenuOpen) {
                event.preventDefault();
                setIsDurationMenuOpen(false);
                return;
            }
            if (memberEditor) {
                event.preventDefault();
                closeMemberEditor();
                return;
            }
            if (memberContextMenu) {
                event.preventDefault();
                setMemberContextMenu(null);
                return;
            }
            event.preventDefault();
            onClose();
        };
        const handleWindowResize = () => {
            setMemberContextMenu(null);
            setIsDurationMenuOpen(false);
        };
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', handleWindowResize);
        window.addEventListener('scroll', handleWindowResize, true);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', handleWindowResize);
            window.removeEventListener('scroll', handleWindowResize, true);
        };
    }, [
        closeMemberEditor,
        editAvatarPath,
        editTitle,
        chat.avatarUrl,
        chat.name,
        groupSettings?.description,
        groupSettings?.historyVisibleToNewMembers,
        groupSettings?.isPublic,
        groupSettings?.reactionMode,
        groupSettings?.reactionsEnabled,
        groupSettings?.topicsEnabled,
        isGroupEditOpen,
        isSavingGroup,
        isSavingSettings,
        isDurationMenuOpen,
        memberContextMenu,
        memberEditor,
        isOpen,
        onClose,
        settingsDraft.description,
        settingsDraft.historyVisibleToNewMembers,
        settingsDraft.isPublic,
        settingsDraft.reactionMode,
        settingsDraft.topicsEnabled,
        showUnsavedGroupEditDialog,
        showUnsavedMemberDialog,
    ]);
    const saveSettings = useCallback(async () => {
        if (!onUpdateGroupSettings || isSavingSettings)
            return true;
        setIsSavingSettings(true);
        try {
            await onUpdateGroupSettings({
                description: settingsDraft.description,
                isPublic: settingsDraft.isPublic,
                publicUsername: settingsDraft.publicUsername || undefined,
                historyVisibleToNewMembers: settingsDraft.historyVisibleToNewMembers,
                slowModeSeconds: Number.isFinite(settingsDraft.slowModeSeconds)
                    ? Math.max(0, Math.floor(settingsDraft.slowModeSeconds))
                    : 0,
                topicsEnabled: settingsDraft.topicsEnabled,
                reactionsEnabled: settingsDraft.reactionMode === 'NONE' ? false : settingsDraft.reactionsEnabled,
                reactionMode: settingsDraft.reactionMode,
                allowedReactions: settingsDraft.allowedReactionsText
                    .split(/[\s,]+/)
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0),
                pollsEnabled: settingsDraft.pollsEnabled,
            });
            return true;
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update group settings');
            return false;
        }
        finally {
            setIsSavingSettings(false);
        }
    }, [isSavingSettings, onUpdateGroupSettings, settingsDraft]);
    const savePermissions = useCallback(async () => {
        if (!onUpdateGroupPermissions || isSavingPermissions)
            return;
        setIsSavingPermissions(true);
        try {
            await onUpdateGroupPermissions({
                canSendMessages: permissionsDraft.canSendMessages,
                canSendMedia: permissionsDraft.canSendMedia,
                canSendPolls: permissionsDraft.canSendPolls,
                canAddWebPagePreviews: permissionsDraft.canAddWebPagePreviews,
                canChangeInfo: permissionsDraft.canChangeInfo,
                canInviteUsers: permissionsDraft.canInviteUsers,
                canPinMessages: permissionsDraft.canPinMessages,
            });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update permissions');
        }
        finally {
            setIsSavingPermissions(false);
        }
    }, [isSavingPermissions, onUpdateGroupPermissions, permissionsDraft]);
    const createInvite = useCallback(async () => {
        if (!onCreateInviteLink || isInvitePending)
            return;
        setIsInvitePending(true);
        try {
            await onCreateInviteLink({
                name: inviteNameDraft || undefined,
                createsJoinRequest: inviteNeedsApproval,
            });
            setInviteNameDraft('');
            setInviteNeedsApproval(false);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create invite link');
        }
        finally {
            setIsInvitePending(false);
        }
    }, [inviteNameDraft, inviteNeedsApproval, isInvitePending, onCreateInviteLink]);
    const createTopic = useCallback(async () => {
        if (!onCreateTopic)
            return;
        const normalizedTitle = topicTitleDraft.trim();
        if (!normalizedTitle) {
            return;
        }
        try {
            await onCreateTopic({
                title: normalizedTitle,
                iconEmoji: topicEmojiDraft.trim() || undefined,
            });
            setTopicTitleDraft('');
            setTopicEmojiDraft('');
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create topic');
        }
    }, [onCreateTopic, topicEmojiDraft, topicTitleDraft]);
    const createPoll = useCallback(async () => {
        if (!onCreatePoll)
            return;
        const question = pollQuestionDraft.trim();
        if (!question) {
            alert('Poll question is required');
            return;
        }
        const options = pollOptionsDraft
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        if (options.length < 2) {
            alert('Provide at least 2 poll options');
            return;
        }
        if (options.length > 10) {
            alert('Maximum 10 poll options');
            return;
        }
        const quiz = pollQuizDraft;
        const allowsMultiple = quiz ? false : pollAllowsMultipleDraft;
        let correctOptionIndex;
        if (quiz) {
            const parsedIndex = Number.parseInt(pollCorrectOptionDraft.trim(), 10);
            if (!Number.isFinite(parsedIndex)) {
                alert('For quiz poll, provide correct option index (1-based)');
                return;
            }
            const zeroBased = parsedIndex - 1;
            if (zeroBased < 0 || zeroBased >= options.length) {
                alert(`Correct option index must be between 1 and ${options.length}`);
                return;
            }
            correctOptionIndex = zeroBased;
        }
        try {
            await onCreatePoll({
                question,
                allowsMultiple,
                quiz,
                correctOptionIndex,
                explanation: pollExplanationDraft.trim() || undefined,
                anonymousVotes: pollAnonymousVotesDraft,
                options,
            });
            setPollQuestionDraft('');
            setPollOptionsDraft('Yes\nNo');
            setPollAllowsMultipleDraft(false);
            setPollQuizDraft(false);
            setPollCorrectOptionDraft('');
            setPollExplanationDraft('');
            setPollAnonymousVotesDraft(true);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create poll');
        }
    }, [
        onCreatePoll,
        pollAllowsMultipleDraft,
        pollAnonymousVotesDraft,
        pollCorrectOptionDraft,
        pollExplanationDraft,
        pollOptionsDraft,
        pollQuestionDraft,
        pollQuizDraft,
    ]);
    const pinMessage = useCallback(async () => {
        if (!onPinMessage)
            return;
        const parsed = Number(pinMessageIdDraft);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            alert('Enter a valid message id to pin');
            return;
        }
        try {
            await onPinMessage(Math.floor(parsed));
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to pin message');
        }
    }, [onPinMessage, pinMessageIdDraft]);
    const handlePanelScroll = useCallback((event) => {
        if (memberContextMenu) {
            setMemberContextMenu(null);
        }
        if (isDurationMenuOpen) {
            setIsDurationMenuOpen(false);
        }
        const target = event.currentTarget;
        const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (remaining > 240) {
            return;
        }
        if (activeTab === 'links' && !linksLoading && linksHasMore) {
            onLinksLoadMore();
            return;
        }
        if (activeTab === 'media' && !mediaLoading && mediaHasMore && onMediaLoadMore) {
            onMediaLoadMore();
            return;
        }
    }, [
        activeTab,
        linksHasMore,
        linksLoading,
        memberContextMenu,
        mediaHasMore,
        mediaLoading,
        onLinksLoadMore,
        onMediaLoadMore,
        isDurationMenuOpen,
    ]);
    useEffect(() => {
        if (activeTab !== 'links' || linksLoading || !linksHasMore) {
            return;
        }
        const element = scrollRef.current;
        if (!element) {
            return;
        }
        if (element.scrollHeight - element.clientHeight <= 40) {
            onLinksLoadMore();
        }
    }, [activeTab, links.length, linksHasMore, linksLoading, onLinksLoadMore]);
    useEffect(() => {
        if (activeTab !== 'media' || mediaLoading || !mediaHasMore || !onMediaLoadMore) {
            return;
        }
        if (mediaItems.length > 0) {
            return;
        }
        onMediaLoadMore();
    }, [activeTab, mediaHasMore, mediaItems.length, mediaLoading, onMediaLoadMore]);
    const memberEditorTitle = memberEditor?.mode === 'restrict-user' ? 'User Permissions' : memberEditor ? 'Admin Rights' : '';
    const enabledMediaCount = restrictionDraft
        ? countEnabledMediaPermissions(restrictionDraft.media)
        : 0;
    const selectedDurationLabel = useMemo(() => {
        if (!restrictionDraft)
            return 'Forever';
        const selected = DURATION_OPTIONS.find((item) => item.id === restrictionDraft.durationId);
        if (!selected)
            return 'Forever';
        if (restrictionDraft.durationId !== 'CUSTOM') {
            return selected.label;
        }
        if (!restrictionDraft.customUntilIso) {
            return 'Custom';
        }
        const parsed = Date.parse(restrictionDraft.customUntilIso);
        if (!Number.isFinite(parsed)) {
            return 'Custom';
        }
        return new Date(parsed).toLocaleDateString();
    }, [restrictionDraft]);
    const dismissAdminFromEditor = useCallback(async () => {
        if (!memberEditor || !onDemoteMember || memberEditor.member.role !== 'ADMIN') {
            return;
        }
        if (isSavingMemberEditor)
            return;
        setIsSavingMemberEditor(true);
        try {
            await onDemoteMember(memberEditor.member.userId);
            setMemberEditor(null);
            setShowUnsavedMemberDialog(false);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to dismiss admin');
        }
        finally {
            setIsSavingMemberEditor(false);
        }
    }, [isSavingMemberEditor, memberEditor, onDemoteMember]);
    const banAndRemoveFromEditor = useCallback(async () => {
        if (!memberEditor || !onSaveMemberRestrictions)
            return;
        if (isSavingMemberEditor)
            return;
        setIsSavingMemberEditor(true);
        try {
            const untilIso = buildDurationUntilIso(restrictionDraft?.durationId ?? 'FOREVER', restrictionDraft?.customUntilIso ?? null);
            const fallbackForever = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
            await onSaveMemberRestrictions(memberEditor.member.userId, {
                bannedUntil: untilIso || fallbackForever,
            });
            if (onRemoveMember) {
                await onRemoveMember(memberEditor.member.userId);
            }
            setMemberEditor(null);
            setShowUnsavedMemberDialog(false);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to ban and remove member');
        }
        finally {
            setIsSavingMemberEditor(false);
        }
    }, [isSavingMemberEditor, memberEditor, onRemoveMember, onSaveMemberRestrictions, restrictionDraft]);
    const canSaveMemberEditor = isRestrictionEditorMode
        ? !!onSaveMemberRestrictions
        : isAdminRightsEditorMode
            ? !!onSaveMemberAdminRights
            : false;
    const adminsCount = useMemo(() => members.filter((member) => member.role === 'OWNER' || member.role === 'ADMIN').length, [members]);
    const permissionsEnabledCount = useMemo(() => Object.values(permissionsDraft).filter(Boolean).length, [permissionsDraft]);
    const permissionsTotalCount = useMemo(() => Object.keys(permissionsDraft).length, [permissionsDraft]);
    const visibleMediaItems = useMemo(() => mediaItems, [mediaItems]);
    const mediaViewerItems = useMemo(() => {
        const memberById = new Map(members.map((member) => [member.userId, member]));
        return visibleMediaItems.map((item) => {
            const sender = memberById.get(item.senderId);
            return {
                url: item.attachmentUrl || `/media/${item.attachmentPath}`,
                mediaType: item.isImage ? 'image' : 'video',
                contentType: item.contentType,
                fileName: item.fileName,
                sizeBytes: item.sizeBytes,
                senderName: sender ? (sender.isCurrentUser ? 'You' : sender.name) : 'Unknown',
                createdAt: item.createdAt,
            };
        });
    }, [members, visibleMediaItems]);
    const mediaSections = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const sections = [];
        for (const [index, item] of visibleMediaItems.entries()) {
            const timestamp = Date.parse(item.createdAt);
            const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;
            const key = date
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : 'unknown';
            const label = date
                ? date.getFullYear() === currentYear
                    ? MEDIA_MONTH_FORMATTER.format(date)
                    : MEDIA_MONTH_WITH_YEAR_FORMATTER.format(date)
                : 'Unknown';
            const lastSection = sections[sections.length - 1];
            if (!lastSection || lastSection.key !== key) {
                sections.push({ key, label, items: [{ item, index }] });
                continue;
            }
            lastSection.items.push({ item, index });
        }
        return sections;
    }, [visibleMediaItems]);
    useEffect(() => {
        if (groupMediaViewerIndex === null)
            return;
        if (mediaViewerItems.length === 0) {
            setGroupMediaViewerIndex(null);
            return;
        }
        if (groupMediaViewerIndex >= mediaViewerItems.length) {
            setGroupMediaViewerIndex(mediaViewerItems.length - 1);
        }
    }, [groupMediaViewerIndex, mediaViewerItems]);
    const groupTypeLabel = settingsDraft.isPublic ? 'Public' : 'Private';
    const reactionsLabel = settingsDraft.reactionMode === 'ALL'
        ? 'All'
        : settingsDraft.reactionMode === 'SOME'
            ? 'Some'
            : 'None';
    const isGroupEditorSaving = isSavingGroup || isSavingSettings;
    const isGroupEditDirty = editTitle.trim() !== chat.name.trim() ||
        editAvatarPath.trim() !== (chat.avatarUrl || '').trim() ||
        settingsDraft.description !== (groupSettings?.description || '') ||
        settingsDraft.isPublic !== !!groupSettings?.isPublic ||
        settingsDraft.topicsEnabled !== (groupSettings?.topicsEnabled ?? false) ||
        settingsDraft.historyVisibleToNewMembers !==
            (groupSettings?.historyVisibleToNewMembers ?? true) ||
        settingsDraft.reactionMode !==
            (groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'));
    const saveGroupEditPanel = useCallback(async () => {
        if (isGroupEditorSaving)
            return;
        const [groupSaved, settingsSaved] = await Promise.all([
            submitGroupEdit(),
            saveSettings(),
        ]);
        if (!groupSaved || !settingsSaved) {
            return;
        }
        setIsGroupEditOpen(false);
        setShowUnsavedGroupEditDialog(false);
    }, [isGroupEditorSaving, saveSettings, submitGroupEdit]);
    const closeGroupEditPanel = useCallback(() => {
        if (isGroupEditorSaving)
            return;
        if (isGroupEditDirty) {
            setShowUnsavedGroupEditDialog(true);
            return;
        }
        setIsGroupEditOpen(false);
        setShowUnsavedGroupEditDialog(false);
    }, [isGroupEditDirty, isGroupEditorSaving]);
    const handleDeleteAndLeaveGroup = useCallback(() => {
        if (onDeleteGroup) {
            void runGroupAction('delete', onDeleteGroup, 'Failed to delete group');
            return;
        }
        if (onLeaveGroup) {
            void runGroupAction('leave', onLeaveGroup, 'Failed to leave group');
        }
    }, [onDeleteGroup, onLeaveGroup, runGroupAction]);
    const handlePickGroupEditAvatar = useCallback(async (file) => {
        if (!file)
            return;
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            setEditAvatarPath(dataUrl);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to prepare group avatar');
        }
        finally {
            if (groupEditAvatarInputRef.current) {
                groupEditAvatarInputRef.current.value = '';
            }
        }
    }, []);
    return (_jsxs("aside", { ref: panelRef, className: "relative h-full w-full border-l border-white/10 bg-[#14151a] shadow-[-16px_0_38px_rgba(0,0,0,0.4)]", children: [_jsxs("div", { ref: scrollRef, className: "tg-scroll h-full overflow-y-auto", onScroll: handlePanelScroll, children: [_jsxs("div", { className: "relative h-[328px] overflow-hidden", children: [hasCover ? (_jsx("img", { src: chat.avatarUrl, alt: chat.name, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#4a3b73_0%,#23242d_58%,#16171d_100%)]", children: _jsx("span", { className: "text-[120px] font-[800] leading-none text-white/92", children: chat.avatarText }) })), _jsx("div", { className: "absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,15,0.38)_0%,rgba(11,11,15,0.1)_44%,rgba(11,11,15,0.84)_100%)]" }), _jsxs("div", { className: "absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, className: "rounded-full p-1.5 text-white/92 transition-colors hover:bg-black/25", "aria-label": "Close group info", children: _jsx(CloseIcon, { size: 24, strokeWidth: 2.4 }) }), _jsx("div", { className: "text-[18px] font-[700] text-white", children: "Group Info" }), _jsx("button", { type: "button", onClick: () => {
                                            if (!canEditGroup)
                                                return;
                                            setMemberContextMenu(null);
                                            setMemberEditor(null);
                                            setShowUnsavedMemberDialog(false);
                                            setIsDurationMenuOpen(false);
                                            setIsGroupEditOpen(true);
                                        }, disabled: !canEditGroup, className: "rounded-full p-1.5 text-white/92 transition-colors hover:bg-black/25", "aria-label": "Edit group", children: _jsx(PenSquareIcon, { size: 23, strokeWidth: 2.2 }) })] }), _jsxs("div", { className: "absolute inset-x-0 bottom-0 px-4 pb-5", children: [_jsx("div", { className: "truncate text-[33px] font-[700] leading-[1.02] text-white drop-shadow-[0_5px_16px_rgba(0,0,0,0.45)]", children: chat.name }), _jsxs("div", { className: "mt-1 text-[15px] text-white/78", children: [memberCount, " ", memberCount === 1 ? 'member' : 'members'] })] })] }), false ? (_jsxs("div", { className: "space-y-3 border-b border-white/8 bg-[#171820] px-4 py-4", children: [_jsx("div", { className: "text-[13px] font-[600] uppercase tracking-[0.3px] text-white/55", children: "Edit Group" }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[13px] text-white/60", children: "Title" }), _jsx("input", { value: editTitle, onChange: (event) => setEditTitle(event.target.value), maxLength: 255, className: "h-10 w-full rounded-[10px] border border-white/12 bg-[#20222d] px-3 text-[14px] text-white/95 outline-none transition-colors focus:border-[#8f73ff]" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[13px] text-white/60", children: "Avatar URL or data URL" }), _jsx("input", { value: editAvatarPath, onChange: (event) => setEditAvatarPath(event.target.value), className: "h-10 w-full rounded-[10px] border border-white/12 bg-[#20222d] px-3 text-[14px] text-white/95 outline-none transition-colors focus:border-[#8f73ff]" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setIsGroupEditOpen(false), className: "rounded-[10px] border border-white/14 px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:bg-white/8", children: "Cancel" }), _jsx("button", { type: "button", onClick: () => {
                                            void submitGroupEdit();
                                        }, disabled: isSavingGroup, className: "rounded-[10px] bg-[#7d65e8] px-3 py-1.5 text-[13px] font-[600] text-white transition-colors hover:bg-[#8f78ef] disabled:cursor-not-allowed disabled:opacity-70", children: isSavingGroup ? 'Saving...' : 'Save' })] })] })) : null, _jsxs("div", { className: "bg-[#1c1d24]", children: [_jsxs("div", { className: "flex items-center gap-3 px-5 py-4 text-white/78", children: [_jsx(LinkIcon, {}), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[15px] font-[500] text-white/96", children: inviteLink }), _jsx("div", { className: "text-[14px] text-white/58", children: "Link" })] })] }), _jsxs("div", { className: "flex items-center gap-3 px-5 pb-5 pt-3 text-white/78", children: [_jsx(BellIcon, {}), _jsx("div", { className: "min-w-0 flex-1 text-[15px] font-[500] text-white/96", children: "Notifications" }), _jsx("button", { type: "button", onClick: () => onNotificationsEnabledChange(!notificationsEnabled), className: `relative inline-flex h-8 w-[58px] items-center rounded-full border transition-colors ${notificationsEnabled
                                            ? 'border-[#7e65e8] bg-[#7e65e8]'
                                            : 'border-white/18 bg-white/12'}`, "aria-label": "Toggle group notifications", children: _jsx("span", { className: `inline-block h-[26px] w-[26px] rounded-full bg-[#111217] transition-transform ${notificationsEnabled ? 'translate-x-[30px]' : 'translate-x-[2px]'}` }) })] })] }), _jsxs("div", { className: "mt-[14px] bg-[#16171d]", children: [_jsx("div", { className: "flex border-b border-t border-white/8 px-2", children: GROUP_INFO_TABS.map((tab) => {
                                    const isActive = tab.id === activeTab;
                                    return (_jsxs("button", { type: "button", onClick: () => onTabChange(tab.id), className: `relative flex-1 px-2 pb-3 pt-2.5 text-center text-[15px] font-[600] transition-colors ${isActive ? 'text-[#a790ff]' : 'text-white/56 hover:text-white/84'}`, children: [tab.label, isActive ? (_jsx("span", { className: "absolute bottom-0 left-1/2 h-[3px] w-[78%] -translate-x-1/2 rounded-full bg-[#8f73ff]" })) : null] }, tab.id));
                                }) }), activeTab === 'members' ? (_jsxs("div", { children: [members.length === 0 ? (_jsx("div", { className: "px-6 py-8 text-[14px] text-white/52", children: "No members info available." })) : (_jsx("div", { children: members.map((member) => ((() => {
                                            const actions = buildMemberContextActions(member);
                                            const roleLabel = member.memberTag?.trim() ||
                                                (member.role === 'OWNER' ? 'owner' : member.role === 'ADMIN' ? 'admin' : '');
                                            const canOpenMenu = actions.length > 0 && !memberEditor && !isGroupEditOpen;
                                            const openContextMenu = (clientX, clientY) => {
                                                if (!canOpenMenu)
                                                    return;
                                                setMemberContextMenu({
                                                    userId: member.userId,
                                                    x: clientX,
                                                    y: clientY,
                                                    actions,
                                                });
                                            };
                                            return (_jsxs("div", { onContextMenu: (event) => {
                                                    if (!canOpenMenu)
                                                        return;
                                                    event.preventDefault();
                                                    openContextMenu(event.clientX, event.clientY);
                                                }, onMouseDown: (event) => {
                                                    if (event.button !== 2 || !canOpenMenu)
                                                        return;
                                                    event.preventDefault();
                                                    openContextMenu(event.clientX, event.clientY);
                                                }, className: "relative flex items-start gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]", children: [_jsx("div", { className: "pt-[1px]", children: _jsx(Avatar, { size: 55, avatarBg: member.avatarBg, avatarText: member.avatarText, avatarUrl: member.avatarUrl }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[17px] font-[500] leading-tight text-white/95", children: member.name }), _jsx("div", { className: `mt-[1px] truncate text-[14px] ${member.isOnline ? 'text-[#9f88ff]' : 'text-white/52'}`, children: member.statusText })] }), roleLabel ? (_jsx("div", { className: "mt-[2px] shrink-0 text-right text-[13px] font-[600] uppercase tracking-[0.2px] text-white/56", children: roleLabel })) : null] }, member.userId));
                                        })())) })), _jsxs("div", { className: "hidden space-y-4 border-t border-white/8 px-4 py-4", children: [_jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Group Settings" }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Description" }), _jsx("input", { value: settingsDraft.description, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, description: event.target.value })), className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Public username" }), _jsx("input", { value: settingsDraft.publicUsername, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, publicUsername: event.target.value })), className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Slow mode (seconds)" }), _jsx("input", { type: "number", min: 0, max: 3600, value: settingsDraft.slowModeSeconds, onChange: (event) => setSettingsDraft((prev) => ({
                                                                    ...prev,
                                                                    slowModeSeconds: Number(event.target.value) || 0,
                                                                })), className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-[12px] text-white/72", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: settingsDraft.isPublic, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, isPublic: event.target.checked })) }), "Public"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: settingsDraft.historyVisibleToNewMembers, onChange: (event) => setSettingsDraft((prev) => ({
                                                                            ...prev,
                                                                            historyVisibleToNewMembers: event.target.checked,
                                                                        })) }), "History visible"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: settingsDraft.topicsEnabled, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, topicsEnabled: event.target.checked })) }), "Topics"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: settingsDraft.reactionsEnabled, onChange: (event) => setSettingsDraft((prev) => ({
                                                                            ...prev,
                                                                            reactionsEnabled: event.target.checked,
                                                                            reactionMode: event.target.checked
                                                                                ? (prev.reactionMode === 'NONE' ? 'ALL' : prev.reactionMode)
                                                                                : 'NONE',
                                                                        })) }), "Reactions"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: settingsDraft.pollsEnabled, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, pollsEnabled: event.target.checked })) }), "Polls"] })] }), _jsxs("label", { className: "mt-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Reaction mode" }), _jsxs("select", { value: settingsDraft.reactionMode, onChange: (event) => {
                                                                    const nextMode = event.target.value;
                                                                    setSettingsDraft((prev) => ({
                                                                        ...prev,
                                                                        reactionMode: nextMode,
                                                                        reactionsEnabled: nextMode !== 'NONE',
                                                                    }));
                                                                }, className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none", children: [_jsx("option", { value: "ALL", children: "All" }), _jsx("option", { value: "SOME", children: "Some" }), _jsx("option", { value: "NONE", children: "None" })] })] }), _jsxs("label", { className: "mt-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Allowed reactions (space/comma-separated)" }), _jsx("input", { value: settingsDraft.allowedReactionsText, onChange: (event) => setSettingsDraft((prev) => ({
                                                                    ...prev,
                                                                    allowedReactionsText: event.target.value,
                                                                })), placeholder: "\uD83D\uDC4D \u2764\uFE0F \uD83D\uDD25", className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsx("button", { type: "button", onClick: () => {
                                                            void saveSettings();
                                                        }, disabled: isSavingSettings || !onUpdateGroupSettings, className: "mt-3 rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60", children: isSavingSettings ? 'Saving...' : 'Save settings' })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Permissions" }), _jsx("div", { className: "grid grid-cols-2 gap-2 text-[12px] text-white/72", children: [
                                                            ['canSendMessages', 'Send messages'],
                                                            ['canSendMedia', 'Send media'],
                                                            ['canSendPolls', 'Send polls'],
                                                            ['canAddWebPagePreviews', 'Web previews'],
                                                            ['canChangeInfo', 'Change info'],
                                                            ['canInviteUsers', 'Invite users'],
                                                            ['canPinMessages', 'Pin messages'],
                                                        ].map(([key, label]) => (_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: permissionsDraft[key], onChange: (event) => setPermissionsDraft((prev) => ({ ...prev, [key]: event.target.checked })) }), label] }, key))) }), _jsx("button", { type: "button", onClick: () => {
                                                            void savePermissions();
                                                        }, disabled: isSavingPermissions || !onUpdateGroupPermissions, className: "mt-3 rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60", children: isSavingPermissions ? 'Saving...' : 'Save permissions' })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Pin Message" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { value: pinMessageIdDraft, onChange: (event) => setPinMessageIdDraft(event.target.value), placeholder: "Message ID", className: "h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" }), _jsx("button", { type: "button", onClick: () => {
                                                                    void pinMessage();
                                                                }, disabled: !onPinMessage, className: "rounded-[8px] border border-white/14 px-2.5 py-1.5 text-[12px] text-white/80 disabled:opacity-50", children: "Pin" }), _jsx("button", { type: "button", onClick: () => {
                                                                    if (!onUnpinMessage)
                                                                        return;
                                                                    void onUnpinMessage();
                                                                }, disabled: !onUnpinMessage, className: "rounded-[8px] border border-white/14 px-2.5 py-1.5 text-[12px] text-white/80 disabled:opacity-50", children: "Unpin" })] })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Invite Links" }), _jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx("input", { value: inviteNameDraft, onChange: (event) => setInviteNameDraft(event.target.value), placeholder: "Invite name", className: "h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" }), _jsx("button", { type: "button", onClick: () => {
                                                                    void createInvite();
                                                                }, disabled: isInvitePending || !onCreateInviteLink, className: "rounded-[8px] bg-[#7d65e8] px-2.5 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60", children: "Create" })] }), _jsxs("label", { className: "mb-3 flex items-center gap-2 text-[12px] text-white/70", children: [_jsx("input", { type: "checkbox", checked: inviteNeedsApproval, onChange: (event) => setInviteNeedsApproval(event.target.checked) }), "Require approval"] }), _jsx("div", { className: "space-y-2", children: inviteLinks.length === 0 ? (_jsx("div", { className: "text-[12px] text-white/45", children: "No invite links" })) : (inviteLinks.map((invite) => (_jsxs("div", { className: "rounded-[8px] border border-white/8 px-2.5 py-2", children: [_jsx("div", { className: "truncate text-[12px] text-white/85", children: invite.link }), _jsxs("div", { className: "mt-1 text-[11px] text-white/52", children: ["uses: ", invite.usageCount, invite.usageLimit ? `/${invite.usageLimit}` : '', invite.revoked ? ' • revoked' : ''] }), !invite.revoked && onRevokeInviteLink ? (_jsxs("div", { className: "mt-1.5 flex flex-wrap gap-2", children: [onUpdateInviteLink ? (_jsx("button", { type: "button", onClick: () => {
                                                                                const nextName = prompt('Invite name', invite.name && invite.name.trim().length > 0
                                                                                    ? invite.name
                                                                                    : '');
                                                                                if (nextName === null)
                                                                                    return;
                                                                                void onUpdateInviteLink(invite.id, { name: nextName });
                                                                            }, className: "rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/80", children: "Edit" })) : null, _jsx("button", { type: "button", onClick: () => {
                                                                                void onRevokeInviteLink(invite.id);
                                                                            }, className: "rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] font-[600] text-[#ffb3c3]", children: "Revoke" })] })) : null] }, invite.id)))) })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Join Requests" }), joinRequests.length === 0 ? (_jsx("div", { className: "text-[12px] text-white/45", children: "No pending requests" })) : (_jsx("div", { className: "space-y-2", children: joinRequests.map((request) => (_jsxs("div", { className: "rounded-[8px] border border-white/8 px-2.5 py-2", children: [_jsx("div", { className: "text-[12px] text-white/85", children: request.userId }), _jsx("div", { className: "mt-1 text-[11px] text-white/52", children: request.status }), request.status === 'PENDING' ? (_jsxs("div", { className: "mt-1.5 flex gap-2", children: [onApproveJoinRequest ? (_jsx("button", { type: "button", onClick: () => {
                                                                                void onApproveJoinRequest(request.id);
                                                                            }, className: "rounded-[8px] border border-white/14 px-2 py-1 text-[11px] text-white/80", children: "Approve" })) : null, onDeclineJoinRequest ? (_jsx("button", { type: "button", onClick: () => {
                                                                                void onDeclineJoinRequest(request.id);
                                                                            }, className: "rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] text-[#ffb3c3]", children: "Decline" })) : null] })) : null] }, request.id))) }))] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Topics" }), _jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx("input", { value: topicTitleDraft, onChange: (event) => setTopicTitleDraft(event.target.value), placeholder: "Topic title", className: "h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" }), _jsx("input", { value: topicEmojiDraft, onChange: (event) => setTopicEmojiDraft(event.target.value), placeholder: "Emoji", className: "h-9 w-20 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" }), _jsx("button", { type: "button", onClick: () => {
                                                                    void createTopic();
                                                                }, disabled: !onCreateTopic, className: "rounded-[8px] bg-[#7d65e8] px-2.5 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60", children: "Create" })] }), onOpenTopic ? (_jsx("div", { className: "mb-2", children: _jsx("button", { type: "button", onClick: () => {
                                                                void onOpenTopic(undefined);
                                                            }, className: `rounded-[8px] border px-2.5 py-1 text-[11px] font-[600] transition-colors ${!activeTopicId
                                                                ? 'border-[#7d65e8]/70 bg-[#7d65e8]/24 text-white'
                                                                : 'border-white/14 text-white/78 hover:bg-white/10'}`, children: "All Topics" }) })) : null, _jsx("div", { className: "space-y-2", children: topics.length === 0 ? (_jsx("div", { className: "text-[12px] text-white/45", children: "No topics" })) : (topics.map((topic) => (_jsxs("div", { className: "rounded-[8px] border border-white/8 px-2.5 py-2", children: [_jsxs("div", { className: "truncate text-[12px] text-white/88", children: [topic.iconEmoji ? `${topic.iconEmoji} ` : '', topic.title] }), _jsxs("div", { className: "mt-1 text-[11px] text-white/52", children: [topic.closed ? 'closed' : 'open', topic.deleted ? ' • deleted' : '', typeof topic.topMessageId === 'number' ? ` • top #${topic.topMessageId}` : ''] }), _jsxs("div", { className: "mt-1.5 flex flex-wrap gap-2", children: [onOpenTopic && !topic.deleted ? (_jsx("button", { type: "button", onClick: () => {
                                                                                void onOpenTopic(topic.id);
                                                                            }, className: `rounded-[8px] border px-2 py-1 text-[11px] ${activeTopicId === topic.id
                                                                                ? 'border-[#7d65e8]/70 bg-[#7d65e8]/24 text-white'
                                                                                : 'border-white/14 text-white/80'}`, children: "Open" })) : null, onToggleTopicClosed ? (_jsx("button", { type: "button", onClick: () => {
                                                                                void onToggleTopicClosed(topic.id, !topic.closed);
                                                                            }, className: "rounded-[8px] border border-white/14 px-2 py-1 text-[11px] text-white/80", children: topic.closed ? 'Reopen' : 'Close' })) : null, !topic.deleted && onDeleteTopic ? (_jsx("button", { type: "button", onClick: () => {
                                                                                void onDeleteTopic(topic.id);
                                                                            }, className: "rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] text-[#ffb3c3]", children: "Delete" })) : null] })] }, topic.id)))) })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Create Poll" }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Question" }), _jsx("input", { value: pollQuestionDraft, onChange: (event) => setPollQuestionDraft(event.target.value), placeholder: "Poll question", className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Options (one per line)" }), _jsx("textarea", { value: pollOptionsDraft, onChange: (event) => setPollOptionsDraft(event.target.value), className: "min-h-[90px] w-full resize-y rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 py-2 text-[13px] text-white/95 outline-none" })] }), _jsxs("label", { className: "mb-3 flex items-center gap-2 text-[12px] text-white/70", children: [_jsx("input", { type: "checkbox", checked: pollQuizDraft, onChange: (event) => setPollQuizDraft(event.target.checked) }), "Quiz mode"] }), _jsxs("label", { className: "mb-3 flex items-center gap-2 text-[12px] text-white/70", children: [_jsx("input", { type: "checkbox", checked: pollAllowsMultipleDraft, onChange: (event) => setPollAllowsMultipleDraft(event.target.checked), disabled: pollQuizDraft }), "Allow multiple answers"] }), _jsxs("label", { className: "mb-3 flex items-center gap-2 text-[12px] text-white/70", children: [_jsx("input", { type: "checkbox", checked: pollAnonymousVotesDraft, onChange: (event) => setPollAnonymousVotesDraft(event.target.checked) }), "Anonymous votes"] }), pollQuizDraft ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Correct option index (1-based)" }), _jsx("input", { value: pollCorrectOptionDraft, onChange: (event) => setPollCorrectOptionDraft(event.target.value), placeholder: "1", className: "h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none" })] }), _jsxs("label", { className: "mb-2 block", children: [_jsx("span", { className: "mb-1 block text-[12px] text-white/55", children: "Explanation" }), _jsx("textarea", { value: pollExplanationDraft, onChange: (event) => setPollExplanationDraft(event.target.value), className: "min-h-[64px] w-full resize-y rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 py-2 text-[13px] text-white/95 outline-none" })] })] })) : null, _jsx("button", { type: "button", onClick: () => {
                                                            void createPoll();
                                                        }, disabled: !onCreatePoll, className: "rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60", children: "Create poll" })] }), _jsxs("div", { className: "rounded-[12px] border border-white/10 bg-[#1a1c24] p-3", children: [_jsx("div", { className: "mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60", children: "Admin Log" }), adminLogItems.length === 0 ? (_jsx("div", { className: "text-[12px] text-white/45", children: adminLogLoading ? 'Loading admin log...' : 'No admin events' })) : (_jsxs("div", { className: "space-y-2", children: [adminLogItems.map((entry) => (_jsxs("div", { className: "rounded-[8px] border border-white/8 px-2.5 py-2", children: [_jsx("div", { className: "text-[12px] text-white/86", children: entry.eventType }), _jsxs("div", { className: "mt-1 text-[11px] text-white/50", children: ["actor: ", entry.actorUserId || 'unknown'] }), _jsx("div", { className: "text-[11px] text-white/50", children: entry.createdAt })] }, entry.id))), onAdminLogLoadMore ? (_jsx("div", { className: "pt-1", children: adminLogLoading ? (_jsx("div", { className: "text-[11px] text-white/52", children: "Loading more..." })) : adminLogHasMore ? (_jsx("button", { type: "button", onClick: onAdminLogLoadMore, className: "rounded-[8px] border border-white/14 px-2.5 py-1 text-[11px] text-white/76", children: "Load more" })) : (_jsx("div", { className: "text-[11px] text-white/44", children: "All events loaded" })) })) : null] }))] })] })] })) : activeTab === 'links' ? (links.length === 0 ? (_jsx("div", { className: "px-6 py-8 text-[14px] text-white/52", children: linksLoading ? 'Loading links...' : 'No links yet.' })) : (_jsxs("div", { className: "pb-1", children: [links.map((item) => (_jsx(GroupInfoLinkRow, { item: item }, item.id))), linksLoading ? (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/46", children: "Loading more..." })) : linksHasMore ? (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/46", children: "Scroll to load more links" })) : (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/38", children: "All links are loaded" }))] }))) : activeTab === 'media' ? (visibleMediaItems.length === 0 ? (_jsx("div", { className: "px-6 py-8 text-[14px] text-white/52", children: mediaLoading ? 'Loading media...' : 'No media yet.' })) : (_jsxs("div", { className: "pb-1", children: [mediaSections.map((section) => (_jsxs("div", { children: [_jsx("div", { className: "px-4 pb-2 pt-3 text-[12px] font-[700] uppercase tracking-[0.25px] text-white/54", children: section.label }), _jsx("div", { className: "grid grid-cols-3 gap-[1px] bg-black/35", children: section.items.map(({ item, index }) => (_jsx(GroupMediaGridThumb, { item: item, onClick: () => setGroupMediaViewerIndex(index) }, `${item.messageId}-${item.attachmentPath}`))) })] }, `media-section-${section.key}`))), mediaLoading ? (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/46", children: "Loading more..." })) : mediaHasMore ? (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/46", children: "Scroll to load more" })) : (_jsx("div", { className: "px-4 py-3 text-[13px] text-white/38", children: "All media loaded" }))] }))) : (_jsx("div", { className: "px-6 py-8 text-[14px] text-white/52", children: "No data." }))] })] }), !isGroupEditOpen && memberContextMenu && selectedMenuMember && memberContextMenuStyle ? (_jsx("div", { ref: contextMenuRef, className: "absolute z-[120]", style: {
                    left: memberContextMenuStyle.left,
                    top: memberContextMenuStyle.top,
                    width: memberContextMenuStyle.width,
                }, children: _jsx("div", { className: "w-full overflow-hidden rounded-[15px] border border-white/8 bg-[#1b1d24]/98 py-1 shadow-[0_16px_36px_rgba(0,0,0,0.56)] backdrop-blur-[8px]", children: memberContextMenu.actions.map((action) => {
                        const label = action === 'send-message'
                            ? 'Send Message'
                            : action === 'promote-admin'
                                ? 'Promote to admin'
                                : action === 'edit-admin-rights'
                                    ? 'Edit admin rights'
                                    : action === 'make-owner'
                                        ? 'Make owner'
                                        : action === 'restrict-user'
                                            ? 'Restrict user'
                                            : 'Remove from group';
                        return (_jsxs("button", { type: "button", onClick: () => {
                                void handleMemberContextAction(action, selectedMenuMember);
                            }, className: "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-[600] text-white/95 transition-colors hover:bg-white/[0.06]", children: [_jsx("div", { className: "text-white/90", children: action === 'send-message' ? (_jsx(ContextMessageIcon, { size: 21 })) : action === 'promote-admin' ? (_jsx(ContextPromoteIcon, { size: 21 })) : action === 'edit-admin-rights' ? (_jsx(ContextShieldIcon, { size: 21 })) : action === 'make-owner' ? (_jsx(ContextOwnerIcon, { size: 21 })) : action === 'restrict-user' ? (_jsx(ContextShieldIcon, { size: 21 })) : (_jsx(ContextTrashIcon, { size: 21 })) }), _jsx("span", { children: label })] }, action));
                    }) }) })) : null, isGroupEditOpen ? (_jsx("div", { className: "absolute inset-0 z-[112] bg-[#171920]", children: _jsxs("div", { className: "tg-scroll h-full overflow-y-auto border-t border-white/12", children: [_jsxs("div", { className: "sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#171920] px-4 py-4", children: [_jsx("button", { type: "button", onClick: closeGroupEditPanel, disabled: isGroupEditorSaving, className: "rounded-full p-1 text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60", "aria-label": "Back", children: _jsx(BackArrowIcon, {}) }), _jsx("div", { className: "text-[18px] font-[700] text-white", children: "Edit" }), _jsx("button", { type: "button", onClick: () => {
                                        void saveGroupEditPanel();
                                    }, disabled: isGroupEditorSaving || (!onUpdateGroup && !onUpdateGroupSettings), className: "rounded-full p-1 text-[#8e75f8] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60", "aria-label": "Save", children: _jsx(CheckIcon, {}) })] }), _jsxs("div", { className: "px-4 pb-7 pt-6", children: [_jsx("input", { ref: groupEditAvatarInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => {
                                        void handlePickGroupEditAvatar(event.target.files?.[0] || null);
                                    } }), _jsx("div", { className: "mx-auto w-fit", children: _jsxs("button", { type: "button", onClick: () => groupEditAvatarInputRef.current?.click(), className: "relative rounded-full", "aria-label": "Change group avatar", children: [_jsx(Avatar, { size: 184, avatarBg: chat.avatarBg, avatarText: chat.avatarText, avatarUrl: editAvatarPath || chat.avatarUrl }), _jsx("span", { className: "absolute inset-0 grid place-items-center text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]", children: _jsx(PenSquareIcon, { size: 44, strokeWidth: 2.2 }) })] }) }), _jsxs("label", { className: "mt-6 block rounded-[18px] border border-white/10 bg-[#1a1c23] p-3", children: [_jsx("div", { className: "mb-1 text-[14px] text-white/45", children: "Group Name" }), _jsx("input", { value: editTitle, onChange: (event) => setEditTitle(event.target.value), maxLength: 255, className: "h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42" })] }), _jsxs("label", { className: "mt-4 block rounded-[18px] border border-white/10 bg-[#1a1c23] p-3", children: [_jsx("div", { className: "mb-1 text-[14px] text-white/45", children: "Description" }), _jsx("input", { value: settingsDraft.description, onChange: (event) => setSettingsDraft((prev) => ({ ...prev, description: event.target.value })), className: "h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42" })] }), _jsx("div", { className: "mt-3 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58", children: "You can provide an optional description for your group." }), _jsxs("div", { className: "mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]", children: [_jsxs("button", { type: "button", onClick: () => setSettingsDraft((prev) => ({ ...prev, isPublic: !prev.isPublic })), className: "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditLockIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Group Type" }), _jsx("span", { className: "block text-[14px] text-white/52", children: groupTypeLabel })] })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(LinkIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Invite Links" }), _jsx("span", { className: "block text-[14px] text-white/52", children: inviteLinks.length })] })] }), _jsxs("button", { type: "button", onClick: () => setSettingsDraft((prev) => {
                                                const nextMode = prev.reactionMode === 'ALL'
                                                    ? 'SOME'
                                                    : prev.reactionMode === 'SOME'
                                                        ? 'NONE'
                                                        : 'ALL';
                                                return {
                                                    ...prev,
                                                    reactionMode: nextMode,
                                                    reactionsEnabled: nextMode !== 'NONE',
                                                };
                                            }), className: "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditHeartIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Reactions" }), _jsx("span", { className: "block text-[14px] text-white/52", children: reactionsLabel })] })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditPermissionsIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Permissions" }), _jsx("span", { className: "block text-[14px] text-white/52", children: `${permissionsEnabledCount}/${permissionsTotalCount}` })] })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditRecentIcon, { size: 25 }) }), _jsx("span", { className: "min-w-0 flex-1", children: _jsx("span", { className: "block text-[17px] text-white/95", children: "Recent Actions" }) })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditTopicsIcon, { size: 25 }) }), _jsx("span", { className: "min-w-0 flex-1", children: _jsx("span", { className: "block text-[17px] text-white/95", children: "Topics" }) }), _jsx(TelegramSwitch, { checked: settingsDraft.topicsEnabled, onChange: (next) => setSettingsDraft((prev) => ({ ...prev, topicsEnabled: next })), disabled: isGroupEditorSaving, dangerWhenOff: false })] })] }), _jsx("div", { className: "mt-3 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58", children: "The group chat will be divided into topics created by admins or users." }), _jsxs("div", { className: "mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]", children: [_jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(ContextShieldIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Administrators" }), _jsx("span", { className: "block text-[14px] text-white/52", children: adminsCount })] })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(UserPlusIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Members" }), _jsx("span", { className: "block text-[14px] text-white/52", children: memberCount })] })] }), _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(DismissAdminIcon, { size: 25 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-[17px] text-white/95", children: "Removed users" }), _jsx("span", { className: "block text-[14px] text-white/52", children: "No removed users" })] })] })] }), _jsx("div", { className: "mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]", children: _jsxs("div", { className: "flex items-center gap-4 px-4 py-3", children: [_jsx("span", { className: "text-white/62", children: _jsx(GroupEditHistoryIcon, { size: 25 }) }), _jsx("span", { className: "min-w-0 flex-1", children: _jsx("span", { className: "block text-[17px] text-white/95", children: "Chat history for new members" }) }), _jsx(TelegramSwitch, { checked: settingsDraft.historyVisibleToNewMembers, onChange: (next) => setSettingsDraft((prev) => ({ ...prev, historyVisibleToNewMembers: next })), disabled: isGroupEditorSaving, dangerWhenOff: false })] }) }), (onDeleteGroup || onLeaveGroup) ? (_jsxs("button", { type: "button", onClick: handleDeleteAndLeaveGroup, disabled: groupActionPending !== null, className: "mt-3 flex w-full items-center gap-4 border-y border-white/8 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx(ContextTrashIcon, { size: 25 }), _jsx("span", { children: onDeleteGroup ? 'Delete and Leave Group' : 'Leave Group' })] })) : null] })] }) })) : null, memberEditor ? (_jsx("div", { className: "absolute inset-0 z-[110] bg-[#171920]", children: _jsxs("div", { className: "tg-scroll h-full overflow-y-auto border-t border-white/12", children: [_jsxs("div", { className: "sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#171920] px-4 py-4", children: [_jsx("button", { type: "button", onClick: closeMemberEditor, disabled: isSavingMemberEditor, className: "rounded-full p-1 text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60", "aria-label": "Back", children: _jsx(BackArrowIcon, {}) }), _jsx("div", { className: "text-[18px] font-[700] text-white", children: memberEditorTitle }), _jsx("button", { type: "button", onClick: () => {
                                        void saveCurrentMemberEditor(true);
                                    }, disabled: isSavingMemberEditor || isLoadingMemberEditor || !canSaveMemberEditor, className: "rounded-full p-1 text-[#8e75f8] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60", "aria-label": "Save", children: _jsx(CheckIcon, {}) })] }), _jsxs("div", { className: "px-4 pb-7 pt-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { size: 76, avatarBg: memberEditor.member.avatarBg, avatarText: memberEditor.member.avatarText, avatarUrl: memberEditor.member.avatarUrl }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[17px] font-[500] text-white/95", children: memberEditor.member.name }), _jsx("div", { className: "mt-0.5 truncate text-[15px] text-white/52", children: memberEditor.member.statusText })] })] }), isLoadingMemberEditor ? (_jsx("div", { className: "px-2 py-10 text-[15px] text-white/52", children: "Loading\u2026" })) : isAdminRightsEditorMode && adminRightsDraft ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-7 text-[14px] font-[600] text-[#8f74f8]", children: "What can this admin do?" }), _jsx("div", { className: "mt-5 space-y-5", children: [
                                                ['canManageGroup', 'Change Group Info'],
                                                ['canDeleteMessages', 'Delete Messages'],
                                                ['canBanUsers', 'Ban Users'],
                                                ['canManageInviteLinks', 'Invite Users via Link'],
                                                ['canPinMessages', 'Pin Messages'],
                                                ['canManageTopics', 'Manage Video Chats'],
                                                ['isAnonymous', 'Remain Anonymous'],
                                                ['canManageMembers', 'Add New Admins'],
                                            ].map(([key, label]) => (_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "text-[16px] text-white/94", children: label }), _jsx(TelegramSwitch, { checked: !!adminRightsDraft[key], onChange: (next) => setAdminRightsDraft((prev) => (prev ? { ...prev, [key]: next } : prev)), disabled: isSavingMemberEditor })] }, key))) }), !adminRightsDraft.canManageMembers ? (_jsx("div", { className: "mt-5 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58", children: "This admin will not be able to add new admins." })) : null, _jsxs("div", { className: "mt-7", children: [_jsx("div", { className: "mb-3 text-[14px] font-[600] text-[#8f74f8]", children: "Member tag" }), _jsxs("label", { className: "block rounded-[16px] border border-white/10 bg-[#1a1c23] p-3", children: [_jsx("div", { className: "mb-1 text-[14px] text-white/45", children: "Title" }), _jsx("input", { value: adminRightsDraft.customTitle, onChange: (event) => setAdminRightsDraft((prev) => prev ? { ...prev, customTitle: event.target.value } : prev), placeholder: "admin", maxLength: 24, className: "h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42" })] }), _jsx("div", { className: "mt-2 text-[14px] text-white/48", children: "A title that members will see instead of 'admin'." })] }), memberEditor.member.role === 'ADMIN' && memberEditor.member.canDemote && onDemoteMember ? (_jsxs("button", { type: "button", onClick: () => {
                                                void dismissAdminFromEditor();
                                            }, disabled: isSavingMemberEditor, className: "mt-7 flex w-full items-center gap-4 border-y border-white/7 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx(DismissAdminIcon, {}), _jsx("span", { children: "Dismiss Admin" })] })) : null] })) : isRestrictionEditorMode && restrictionDraft ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-7 text-[14px] font-[600] text-[#8f74f8]", children: "What can this user do?" }), _jsxs("div", { className: "mt-5 space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "text-[16px] text-white/94", children: "Send Messages" }), _jsx(TelegramSwitch, { checked: restrictionDraft.canSendMessages, onChange: (next) => setRestrictionDraft((prev) => (prev ? { ...prev, canSendMessages: next } : prev)), disabled: isSavingMemberEditor })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("button", { type: "button", onClick: () => setIsMediaSectionExpanded((prev) => !prev), className: "flex items-center gap-1 text-[16px] text-white/94", children: [_jsx("span", { children: `Send Media ${enabledMediaCount}/9` }), isMediaSectionExpanded ? _jsx(ChevronUpIcon, {}) : _jsx(ChevronDownIcon, {})] }), _jsx(TelegramSwitch, { checked: restrictionDraft.canSendMedia, onChange: (next) => setRestrictionDraft((prev) => {
                                                                        if (!prev)
                                                                            return prev;
                                                                        const media = {
                                                                            sendPhotos: next,
                                                                            sendVideos: next,
                                                                            sendStickersAndGifs: next,
                                                                            sendMusic: next,
                                                                            sendVideoMessages: next,
                                                                            embedLinks: next,
                                                                            sendPolls: next,
                                                                        };
                                                                        return {
                                                                            ...prev,
                                                                            canSendMedia: next,
                                                                            media,
                                                                        };
                                                                    }), disabled: isSavingMemberEditor })] }), isMediaSectionExpanded ? (_jsx("div", { className: "mt-4 space-y-4", children: RESTRICTION_MEDIA_ITEMS.map((item) => (_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(TelegramCheckbox, { checked: restrictionDraft.media[item.key], onToggle: () => setRestrictionDraft((prev) => {
                                                                            if (!prev)
                                                                                return prev;
                                                                            const nextMedia = {
                                                                                ...prev.media,
                                                                                [item.key]: !prev.media[item.key],
                                                                            };
                                                                            const count = countEnabledMediaPermissions(nextMedia);
                                                                            return {
                                                                                ...prev,
                                                                                media: nextMedia,
                                                                                canSendMedia: count > 0,
                                                                            };
                                                                        }) }), _jsx("div", { className: "text-[16px] text-white/94", children: item.label })] }, item.key))) })) : null] }), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "text-[16px] text-white/94", children: "Add Users" }), _jsx(TelegramSwitch, { checked: restrictionDraft.canAddUsers, onChange: (next) => setRestrictionDraft((prev) => (prev ? { ...prev, canAddUsers: next } : prev)), disabled: isSavingMemberEditor })] }), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "text-[16px] text-white/94", children: "Pin Messages" }), _jsx(TelegramSwitch, { checked: restrictionDraft.canPinMessages, onChange: (next) => setRestrictionDraft((prev) => (prev ? { ...prev, canPinMessages: next } : prev)), disabled: isSavingMemberEditor })] }), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "text-[16px] text-white/94", children: "Change Chat Info" }), _jsx(TelegramSwitch, { checked: restrictionDraft.canChangeChatInfo, onChange: (next) => setRestrictionDraft((prev) => prev ? { ...prev, canChangeChatInfo: next } : prev), disabled: isSavingMemberEditor })] })] }), _jsx("div", { className: "mt-6 border-t border-white/8 pt-4", children: _jsxs("div", { className: "relative", ref: durationMenuRef, children: [_jsxs("button", { type: "button", onClick: () => setIsDurationMenuOpen((prev) => !prev), className: "flex w-full items-center justify-between rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[16px] text-white/94", children: "Duration" }), _jsx("div", { className: "mt-0.5 text-[15px] text-white/55", children: selectedDurationLabel })] }), _jsx(ChevronDownIcon, {})] }), isDurationMenuOpen ? (_jsx("div", { className: "absolute right-0 top-[calc(100%+8px)] z-30 w-[210px] rounded-[18px] border border-white/8 bg-[#1b1d24] p-2 shadow-[0_14px_34px_rgba(0,0,0,0.45)]", children: DURATION_OPTIONS.map((option) => (_jsx("button", { type: "button", onClick: () => {
                                                                if (option.id === 'CUSTOM') {
                                                                    const customDays = prompt('Custom duration in days', '2');
                                                                    if (customDays === null)
                                                                        return;
                                                                    const parsedDays = Number.parseFloat(customDays);
                                                                    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
                                                                        alert('Enter a valid number of days');
                                                                        return;
                                                                    }
                                                                    const customUntilIso = new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000).toISOString();
                                                                    setRestrictionDraft((prev) => prev
                                                                        ? {
                                                                            ...prev,
                                                                            durationId: 'CUSTOM',
                                                                            customUntilIso,
                                                                        }
                                                                        : prev);
                                                                    setIsDurationMenuOpen(false);
                                                                    return;
                                                                }
                                                                setRestrictionDraft((prev) => prev
                                                                    ? {
                                                                        ...prev,
                                                                        durationId: option.id,
                                                                        customUntilIso: null,
                                                                    }
                                                                    : prev);
                                                                setIsDurationMenuOpen(false);
                                                            }, className: "w-full rounded-[10px] px-3 py-2 text-left text-[16px] font-[600] text-white/95 transition-colors hover:bg-white/8", children: option.label }, option.id))) })) : null] }) }), onSaveMemberRestrictions && onRemoveMember ? (_jsxs("button", { type: "button", onClick: () => {
                                                void banAndRemoveFromEditor();
                                            }, disabled: isSavingMemberEditor, className: "mt-6 flex w-full items-center gap-4 border-y border-white/8 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx(DismissAdminIcon, {}), _jsx("span", { children: "Ban and remove from group" })] })) : null] })) : null] })] }) })) : null, showUnsavedGroupEditDialog ? (_jsx("div", { className: "fixed inset-0 z-[131] grid place-items-center bg-black/56 px-4", children: _jsxs("div", { className: "w-full max-w-[640px] rounded-[24px] bg-[#1f2026] p-6 shadow-[0_18px_56px_rgba(0,0,0,0.6)]", children: [_jsx("div", { className: "text-[18px] font-[700] text-white/95", children: "Unsaved Changes" }), _jsx("div", { className: "mt-5 text-[17px] leading-[1.35] text-white/90", children: "Are you sure you want to discard all changes?" }), _jsxs("div", { className: "mt-7 flex justify-end gap-12", children: [_jsx("button", { type: "button", onClick: () => {
                                        setShowUnsavedGroupEditDialog(false);
                                        setIsGroupEditOpen(false);
                                    }, className: "text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85", children: "DISCARD" }), _jsx("button", { type: "button", onClick: () => {
                                        void saveGroupEditPanel();
                                    }, disabled: isGroupEditorSaving, className: "text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85 disabled:opacity-60", children: "SAVE" })] })] }) })) : null, showUnsavedMemberDialog ? (_jsx("div", { className: "fixed inset-0 z-[130] grid place-items-center bg-black/56 px-4", children: _jsxs("div", { className: "w-full max-w-[640px] rounded-[24px] bg-[#1f2026] p-6 shadow-[0_18px_56px_rgba(0,0,0,0.6)]", children: [_jsx("div", { className: "text-[18px] font-[700] text-white/95", children: "Unsaved Changes" }), _jsx("div", { className: "mt-5 text-[17px] leading-[1.35] text-white/90", children: "Are you sure you want to discard all changes?" }), _jsxs("div", { className: "mt-7 flex justify-end gap-12", children: [_jsx("button", { type: "button", onClick: () => {
                                        setShowUnsavedMemberDialog(false);
                                        setMemberEditor(null);
                                        setIsDurationMenuOpen(false);
                                    }, className: "text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85", children: "DISCARD" }), _jsx("button", { type: "button", onClick: () => {
                                        void saveCurrentMemberEditor(true);
                                    }, disabled: isSavingMemberEditor, className: "text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85 disabled:opacity-60", children: "SAVE" })] })] }) })) : null, groupMediaViewerIndex !== null && mediaViewerItems.length > 0 ? (_jsx(MediaViewerModal, { items: mediaViewerItems, activeIndex: groupMediaViewerIndex, onClose: () => setGroupMediaViewerIndex(null), onChangeIndex: (nextIndex) => setGroupMediaViewerIndex(nextIndex) })) : null, activeTab === 'members' && !memberEditor && !isGroupEditOpen && !canEditGroup && (onLeaveGroup || (isOwner && onDeleteGroup)) ? (_jsxs("div", { className: "absolute bottom-6 left-5 flex items-center gap-2", children: [onLeaveGroup ? (_jsx("button", { type: "button", onClick: () => {
                            if (!confirm('Leave this group?'))
                                return;
                            void runGroupAction('leave', onLeaveGroup, 'Failed to leave group');
                        }, disabled: groupActionPending !== null, className: "rounded-[10px] border border-white/16 bg-[#1e1f26] px-3 py-2 text-[13px] font-[600] text-white/78 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60", children: groupActionPending === 'leave' ? 'Leaving...' : 'Leave' })) : null, isOwner && onDeleteGroup ? (_jsx("button", { type: "button", onClick: () => {
                            if (!confirm('Delete this group for all members?'))
                                return;
                            void runGroupAction('delete', onDeleteGroup, 'Failed to delete group');
                        }, disabled: groupActionPending !== null, className: "rounded-[10px] border border-[#9f3f54]/45 bg-[#25181e] px-3 py-2 text-[13px] font-[600] text-[#ffb6c5] transition-colors hover:bg-[#9f3f54]/20 disabled:cursor-not-allowed disabled:opacity-60", children: groupActionPending === 'delete' ? 'Deleting...' : 'Delete' })) : null] })) : null, activeTab === 'members' && !memberEditor && !isGroupEditOpen && canAddMembers && !!onAddMembersClick ? (_jsx("button", { type: "button", onClick: onAddMembersClick, className: "absolute bottom-6 right-5 grid h-[66px] w-[66px] place-items-center rounded-full bg-[#7d65e8] text-white shadow-[0_14px_26px_rgba(126,102,235,0.45)] transition-colors hover:bg-[#927cff]", "aria-label": "Add member", children: _jsx(UserPlusIcon, { size: 31 }) })) : null] }));
}
