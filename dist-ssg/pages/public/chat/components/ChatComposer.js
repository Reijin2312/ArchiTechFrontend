import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMessageMediaAttachments } from '../../../../shared/ui/button/social/chat/mediaAttachments.js';
import { buildLocalMediaPreviewMeta } from '../../../../shared/ui/button/social/chat/localMediaPreview.js';
import { CloseIcon, PaperclipIcon, SendIcon, SmilePlusIcon } from '../icons.js';
import { formatFileSize } from '../utils.js';
import { EmojiHoverPanel } from './EmojiHoverPanel.js';
import { buildImageGridRows } from './messageTypes/imageGridPattern.js';
function ReplyArrowIcon() {
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M10 7 4 12l6 5", stroke: "currentColor", strokeWidth: "2.3", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M5 12h8.5A5.5 5.5 0 0 1 19 17.5V18", stroke: "currentColor", strokeWidth: "2.3", strokeLinecap: "round" })] }));
}
function EditIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M4 20h4l10.2-10.2a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0L4 16v4Z", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
const resolveMessagePreview = (message) => {
    const text = (message.content || '').trim();
    if (text)
        return text;
    if (message.messageType === 'image' || message.messageType === 'images')
        return 'Photo';
    if (message.messageType === 'poll')
        return 'Poll';
    return 'Message';
};
export function ChatComposer({ model }) {
    const composerRootRef = useRef(null);
    const messagesRef = useRef(model.messages);
    const pendingPreviewUrlsRef = useRef([]);
    const sendingPreviewUrlsRef = useRef([]);
    const sendingPreviewReleaseTimersRef = useRef(new Set());
    const pendingDraftChatIdRef = useRef(null);
    const emojiHideTimeoutRef = useRef(null);
    const [pendingImageDraft, setPendingImageDraft] = useState(null);
    const [isPendingImageApplying, setIsPendingImageApplying] = useState(false);
    const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
    const [pendingPanelAnchor, setPendingPanelAnchor] = useState(() => ({
        x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
        y: typeof window === 'undefined' ? 0 : window.innerHeight / 2,
    }));
    const hasText = model.messageInput.trim().length > 0;
    const hasAttachments = model.attachedImages.length > 0;
    const canSend = hasText || hasAttachments;
    useEffect(() => {
        messagesRef.current = model.messages;
    }, [model.messages]);
    const handleSend = () => {
        if (model.selectedChat === null)
            return;
        if (!canSend)
            return;
        void model.sendChatMessage();
    };
    const replyingPreview = model.replyingTo ? resolveMessagePreview(model.replyingTo) : '';
    const replyingName = model.replyingTo
        ? model.replyingTo.senderId === model.userId
            ? 'You'
            : model.friends.find((friend) => friend.userId === model.replyingTo.senderId)?.displayName ||
                model.friends.find((friend) => friend.userId === model.replyingTo.senderId)?.username ||
                model.replyingTo.senderId.slice(0, 8)
        : '';
    const editingPreview = model.editingMessage ? resolveMessagePreview(model.editingMessage) : '';
    const hasComposerState = !!model.editingMessage || !!model.replyingTo;
    const revokePreviewUrls = (previewUrls) => {
        previewUrls.forEach((previewUrl) => {
            URL.revokeObjectURL(previewUrl);
        });
    };
    const releasePendingPreviewUrls = () => {
        if (pendingPreviewUrlsRef.current.length === 0)
            return;
        revokePreviewUrls(pendingPreviewUrlsRef.current);
        pendingPreviewUrlsRef.current = [];
    };
    const reservePendingPreviewUrlsForSending = () => {
        if (pendingPreviewUrlsRef.current.length === 0)
            return;
        sendingPreviewUrlsRef.current.push(...pendingPreviewUrlsRef.current);
        pendingPreviewUrlsRef.current = [];
    };
    const isPreviewUrlStillUsed = (previewUrl) => {
        const messages = messagesRef.current;
        return messages.some((message) => {
            const attachments = getMessageMediaAttachments(message);
            return attachments.some((image) => image?.imageUrl === previewUrl);
        });
    };
    const releaseSendingPreviewUrls = (previewUrls) => {
        if (previewUrls.length === 0)
            return [];
        const releasable = previewUrls.filter((previewUrl) => !isPreviewUrlStillUsed(previewUrl));
        if (releasable.length > 0) {
            revokePreviewUrls(releasable);
            const revoked = new Set(releasable);
            sendingPreviewUrlsRef.current = sendingPreviewUrlsRef.current.filter((previewUrl) => !revoked.has(previewUrl));
        }
        return previewUrls.filter((previewUrl) => !releasable.includes(previewUrl));
    };
    const scheduleSendingPreviewUrlsRelease = (previewUrls, delayMs = 45_000) => {
        if (previewUrls.length === 0)
            return;
        const schedule = (remainingUrls, timeoutMs) => {
            if (remainingUrls.length === 0)
                return;
            const timerId = window.setTimeout(() => {
                sendingPreviewReleaseTimersRef.current.delete(timerId);
                const stillUsed = releaseSendingPreviewUrls(remainingUrls);
                if (stillUsed.length > 0) {
                    schedule(stillUsed, 15_000);
                }
            }, timeoutMs);
            sendingPreviewReleaseTimersRef.current.add(timerId);
        };
        schedule(previewUrls, delayMs);
    };
    const openPendingImageDraft = (files) => {
        if (files.length === 0)
            return;
        releasePendingPreviewUrls();
        const items = files.slice(0, 9).map((file, index) => ({
            id: `pending-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            mediaType: ((file.type || '').toLowerCase().startsWith('video/') ? 'video' : 'image'),
        }));
        pendingPreviewUrlsRef.current = items.map((item) => item.previewUrl);
        pendingDraftChatIdRef.current = model.selectedChat;
        setPendingImageDraft({
            items,
            caption: '',
            groupImages: items.length > 1,
        });
    };
    const closePendingImageDraft = (options) => {
        if (options?.preservePreviewsForSending) {
            reservePendingPreviewUrlsForSending();
        }
        else {
            releasePendingPreviewUrls();
        }
        pendingDraftChatIdRef.current = null;
        setPendingImageDraft(null);
        setIsPendingImageApplying(false);
    };
    const clearEmojiHideTimeout = () => {
        if (!emojiHideTimeoutRef.current)
            return;
        clearTimeout(emojiHideTimeoutRef.current);
        emojiHideTimeoutRef.current = null;
    };
    const openEmojiPanel = () => {
        clearEmojiHideTimeout();
        setIsEmojiPanelOpen(true);
    };
    const closeEmojiPanelSoon = () => {
        clearEmojiHideTimeout();
        emojiHideTimeoutRef.current = setTimeout(() => {
            setIsEmojiPanelOpen(false);
            emojiHideTimeoutRef.current = null;
        }, 120);
    };
    const appendEmojiToInput = (emoji) => {
        const next = `${model.messageInput}${emoji}`;
        model.setMessageInput(next);
        if (model.selectedChat !== null) {
            void model.sendTypingState(model.selectedChat, next.trim().length > 0);
        }
    };
    const updatePendingPanelAnchor = () => {
        const fallbackX = typeof window === 'undefined' ? 0 : window.innerWidth / 2;
        const fallbackY = typeof window === 'undefined' ? 0 : window.innerHeight / 2;
        const root = composerRootRef.current;
        if (!root) {
            setPendingPanelAnchor({ x: fallbackX, y: fallbackY });
            return;
        }
        const targetRect = root.getBoundingClientRect();
        const panelWidth = Math.min(440, Math.max(280, window.innerWidth - 28));
        const halfPanelWidth = panelWidth / 2;
        const safeX = Math.max(halfPanelWidth + 14, Math.min(window.innerWidth - halfPanelWidth - 14, targetRect.left + targetRect.width / 2));
        const safeY = Math.max(160, Math.min(window.innerHeight - 160, window.innerHeight / 2));
        setPendingPanelAnchor({
            x: safeX,
            y: safeY,
        });
    };
    const appendCaptionToInput = (caption) => {
        const trimmed = caption.trim();
        if (!trimmed)
            return;
        model.setMessageInput((prev) => {
            const current = prev.trim();
            if (!current)
                return trimmed;
            if (current === trimmed)
                return prev;
            return `${current}\n${trimmed}`;
        });
    };
    const handlePickedFiles = (files) => {
        if (!files || files.length === 0)
            return;
        const mediaFiles = Array.from(files).filter((file) => {
            const contentType = (file.type || '').toLowerCase();
            return contentType.startsWith('image/') || contentType.startsWith('video/');
        });
        if (mediaFiles.length === 0) {
            alert('Only photos and videos are supported.');
            return;
        }
        openPendingImageDraft(mediaFiles);
    };
    const removePendingDraftItem = (itemId) => {
        let removedPreviewUrl = null;
        setPendingImageDraft((prev) => {
            if (!prev)
                return prev;
            const nextItems = prev.items.filter((item) => {
                if (item.id === itemId) {
                    removedPreviewUrl = item.previewUrl;
                    return false;
                }
                return true;
            });
            if (nextItems.length === 0) {
                return null;
            }
            return {
                ...prev,
                items: nextItems,
                groupImages: nextItems.length > 1 ? prev.groupImages : true,
            };
        });
        if (removedPreviewUrl) {
            URL.revokeObjectURL(removedPreviewUrl);
            pendingPreviewUrlsRef.current = pendingPreviewUrlsRef.current.filter((previewUrl) => previewUrl !== removedPreviewUrl);
        }
    };
    const pendingGridRows = useMemo(() => {
        if (!pendingImageDraft || pendingImageDraft.items.length === 0) {
            return [];
        }
        return buildImageGridRows(pendingImageDraft.items);
    }, [pendingImageDraft]);
    const applyPendingImage = (mode) => {
        if (!pendingImageDraft || isPendingImageApplying)
            return;
        void (async () => {
            setIsPendingImageApplying(true);
            try {
                if (mode === 'send') {
                    if (model.selectedChat === null) {
                        throw new Error('No selected chat');
                    }
                    const sendingDraft = pendingImageDraft;
                    const sendPreviewUrls = sendingDraft.items.map((item) => item.previewUrl);
                    const attachments = await Promise.all(sendingDraft.items.map(async (item) => {
                        const contentType = (item.file.type || '').toLowerCase();
                        const mediaType = contentType.startsWith('video/') ? 'video' : 'image';
                        const localPreviewMeta = contentType.startsWith('image/') || contentType.startsWith('video/')
                            ? await buildLocalMediaPreviewMeta(item.file, {
                                preferredPreviewUrl: item.previewUrl,
                                forceMediaType: mediaType,
                            })
                            : null;
                        return {
                            id: item.id,
                            file: item.file,
                            preview: item.previewUrl,
                            thumbnailUrl: localPreviewMeta?.thumbnailUrl,
                            strippedThumbnailUrl: localPreviewMeta?.strippedThumbnailUrl,
                            width: localPreviewMeta?.width,
                            height: localPreviewMeta?.height,
                            aspectRatio: localPreviewMeta?.aspectRatio,
                            isImage: contentType.startsWith('image/'),
                            groupWithOthers: sendingDraft.groupImages,
                            contentType: item.file.type || 'application/octet-stream',
                            sizeBytes: item.file.size,
                            uploading: false,
                        };
                    }));
                    const replyToMessageId = typeof model.replyingTo?.messageId === 'number'
                        ? model.replyingTo.messageId
                        : undefined;
                    closePendingImageDraft({ preservePreviewsForSending: true });
                    try {
                        await model.sendMessagesWithImages(model.selectedChat, sendingDraft.caption, {
                            attachments,
                            clearComposerDraft: true,
                            replyToMessageId,
                            resetReplyTo: true,
                        });
                    }
                    finally {
                        scheduleSendingPreviewUrlsRelease(sendPreviewUrls);
                    }
                    return;
                }
                appendCaptionToInput(pendingImageDraft.caption);
                for (const item of pendingImageDraft.items) {
                    await model.attachImage(item.file, {
                        preview: item.previewUrl,
                        groupWithOthers: pendingImageDraft.groupImages,
                    });
                }
                closePendingImageDraft();
            }
            catch (error) {
                setIsPendingImageApplying(false);
                alert(error instanceof Error ? error.message : 'Failed to attach media');
            }
        })();
    };
    useEffect(() => () => {
        releasePendingPreviewUrls();
        sendingPreviewReleaseTimersRef.current.forEach((timerId) => {
            window.clearTimeout(timerId);
        });
        sendingPreviewReleaseTimersRef.current.clear();
        if (sendingPreviewUrlsRef.current.length > 0) {
            revokePreviewUrls(sendingPreviewUrlsRef.current);
            sendingPreviewUrlsRef.current = [];
        }
    }, []);
    useEffect(() => () => {
        clearEmojiHideTimeout();
    }, []);
    useEffect(() => {
        if (!pendingImageDraft)
            return;
        updatePendingPanelAnchor();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePendingImageDraft();
            }
        };
        const onResize = () => updatePendingPanelAnchor();
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
        };
    }, [pendingImageDraft]);
    useEffect(() => {
        if (!pendingImageDraft)
            return;
        if (pendingDraftChatIdRef.current === model.selectedChat)
            return;
        closePendingImageDraft();
    }, [model.selectedChat, pendingImageDraft]);
    const pendingDraftModal = pendingImageDraft ? (_jsx("div", { className: "pointer-events-none fixed inset-0 z-[90]", children: _jsxs("div", { className: "pointer-events-auto absolute w-[min(440px,calc(100vw-28px))] overflow-hidden rounded-[16px] bg-[#1a1b20]/98 text-white shadow-[0_22px_60px_rgba(0,0,0,.55)] ring-1 ring-[#8e77ef]/28", style: {
                left: `${pendingPanelAnchor.x}px`,
                top: `${pendingPanelAnchor.y}px`,
                transform: 'translate(-50%, -50%)',
            }, children: [_jsxs("div", { className: "flex items-center justify-between px-4 pb-2 pt-3", children: [_jsxs("h3", { className: "text-[16px] font-[600] tracking-tight text-white/96", children: ["Selected ", pendingImageDraft.items.length, ' ', pendingImageDraft.items.length === 1 ? 'item' : 'items'] }), _jsx("button", { type: "button", onClick: () => closePendingImageDraft(), className: "grid h-8 w-8 place-items-center rounded-full text-[#b79cff]/80 transition-colors hover:bg-[#8e77ef]/18 hover:text-white", "aria-label": "Close media preview", disabled: isPendingImageApplying, children: _jsx(CloseIcon, { size: 18, strokeWidth: 2.4 }) })] }), _jsx("div", { className: "px-4 pb-2", children: _jsx("div", { className: "max-h-[min(46vh,420px)] overflow-y-auto", children: _jsx("div", { className: "overflow-hidden rounded-[10px] bg-black/22 p-[2px]", children: _jsx("div", { className: "flex flex-col gap-[2px]", children: pendingGridRows.map((row, rowIndex) => (_jsx("div", { className: "grid gap-[2px]", style: { gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }, children: row.items.map((item) => (_jsxs("div", { className: `group relative overflow-hidden bg-black/35 ${row.columns === 1 ? 'aspect-[16/10]' : 'aspect-square'}`, children: [item.mediaType === 'video' ? (_jsxs(_Fragment, { children: [_jsx("video", { src: item.previewUrl, className: "h-full w-full object-cover", playsInline: true, preload: "metadata", controls: false, muted: true }), _jsx("span", { className: "pointer-events-none absolute left-2 top-2 rounded-full bg-black/48 px-2 py-[3px] text-[11px] font-[600] text-white/95", children: "video" })] })) : (_jsx("img", { src: item.previewUrl, alt: item.file.name, className: "h-full w-full object-cover" })), _jsx("button", { type: "button", onClick: () => removePendingDraftItem(item.id), className: "absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/58 text-white opacity-0 transition-opacity hover:bg-black/72 group-hover:opacity-100", "aria-label": "Remove selected media", disabled: isPendingImageApplying, children: _jsx(CloseIcon, { size: 14, strokeWidth: 2.4 }) })] }, item.id))) }, `pending-row-${rowIndex}`))) }) }) }) }), _jsxs("div", { className: "px-4 pb-2", children: [_jsx("div", { className: "text-[13px] font-[600] text-[#b79cff]", children: "Caption" }), _jsxs("div", { className: "mt-1 flex items-center gap-2 border-b border-[#8e77ef]/50 pb-1.5", children: [_jsx("input", { value: pendingImageDraft.caption, onChange: (event) => {
                                        const value = event.target.value;
                                        setPendingImageDraft((prev) => (prev ? { ...prev, caption: value } : prev));
                                    }, placeholder: "Write a caption", className: "h-8 flex-1 bg-transparent text-[15px] text-white/92 placeholder:text-white/35 focus:outline-none", disabled: isPendingImageApplying }), _jsx(SmilePlusIcon, { size: 18, className: "text-white/35", strokeWidth: 2.05 })] })] }), _jsxs("div", { className: "grid grid-cols-3 border-t border-[#8e77ef]/30 px-2 py-1.5", children: [_jsx("button", { type: "button", onClick: () => applyPendingImage('add'), className: "rounded-xl px-3 py-2 text-center text-[14px] font-[500] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14", disabled: isPendingImageApplying, children: "Add" }), _jsx("button", { type: "button", onClick: () => closePendingImageDraft(), className: "rounded-xl px-3 py-2 text-center text-[14px] font-[500] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14", disabled: isPendingImageApplying, children: "Cancel" }), _jsx("button", { type: "button", onClick: () => applyPendingImage('send'), className: "rounded-xl px-3 py-2 text-center text-[14px] font-[600] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14", disabled: isPendingImageApplying, children: "Send" })] })] }) })) : null;
    return (_jsxs(_Fragment, { children: [typeof document !== 'undefined' ? createPortal(pendingDraftModal, document.body) : pendingDraftModal, model.attachedImages.length > 0 ? (_jsx("div", { className: "px-[18px] pb-2", children: _jsx("div", { className: "mx-auto flex w-full max-w-[960px] gap-2 overflow-x-auto rounded-2xl bg-[#1a1b20]/95 p-2 ring-1 ring-white/5", children: model.attachedImages.map((attachment) => (_jsxs("div", { className: "group relative w-[92px] shrink-0 overflow-hidden rounded-xl bg-black/25 p-1.5", children: [_jsx("button", { type: "button", onClick: () => model.removeAttachedImage(attachment.id), className: "absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100", "aria-label": "Remove attachment", children: _jsx(CloseIcon, { size: 12, strokeWidth: 2.3 }) }), _jsx("div", { className: "h-[74px] w-full overflow-hidden rounded-lg bg-black/30", children: attachment.isImage && attachment.preview ? (_jsx("img", { src: attachment.preview, alt: attachment.file.name, className: "h-full w-full object-cover" })) : ((attachment.contentType || attachment.file.type || '').toLowerCase().startsWith('video/') && attachment.preview) ? (_jsx("video", { src: attachment.preview, className: "h-full w-full object-cover", playsInline: true, preload: "metadata", controls: false, muted: true })) : (_jsxs("div", { className: "flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/70", children: [_jsx(PaperclipIcon, { size: 18, strokeWidth: 2.2 }), _jsx("span", { className: "line-clamp-1 max-w-[72px] text-center text-[10px]", children: attachment.file.name })] })) }), _jsx("div", { className: "mt-1 truncate text-[10px] text-white/70", children: formatFileSize(attachment.sizeBytes ?? attachment.file.size) })] }, attachment.id))) }) })) : null, _jsx("div", { ref: composerRootRef, className: "px-[18px] pb-[10px]", "data-chat-composer-container": "true", children: _jsxs("div", { className: "relative mx-auto flex w-full max-w-[960px] items-end gap-[10px]", children: [_jsx("div", { className: "flex min-h-[58px] flex-1 items-center gap-[12px] rounded-[20px] bg-[#1a1b20] px-[16px] shadow-[0_10px_18px_rgba(0,0,0,.35)] ring-1 ring-white/5", children: _jsxs("div", { className: "flex w-full flex-col gap-2 py-2", children: [hasComposerState ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9d83ff]", children: model.editingMessage ? _jsx(EditIcon, {}) : _jsx(ReplyArrowIcon, {}) }), _jsxs("div", { className: "relative min-w-0 flex-1 overflow-hidden rounded-[10px] bg-[#353142]/92 px-4 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]", children: [_jsx("span", { className: "absolute bottom-0 left-0 top-0 w-[4px] bg-[#9d83ff]" }), _jsxs("div", { className: "pl-2 pr-7", children: [_jsx("div", { className: "text-[13px] font-[600] leading-none text-[#b79cff]", children: model.editingMessage ? 'Editing' : `Reply to ${replyingName}` }), _jsx("div", { className: "mt-[5px] truncate text-[15px] leading-none text-white/62", children: model.editingMessage ? editingPreview : replyingPreview })] }), _jsx("button", { type: "button", onClick: () => {
                                                            if (model.editingMessage) {
                                                                model.setEditingMessage(null);
                                                                model.setMessageInput('');
                                                            }
                                                            else {
                                                                model.setReplyingTo(null);
                                                            }
                                                        }, className: "absolute right-2 top-1.5 grid h-6 w-6 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white", "aria-label": model.editingMessage ? 'Cancel editing' : 'Cancel reply', children: _jsx(CloseIcon, { size: 15, strokeWidth: 2.4 }) })] })] })) : null, _jsxs("div", { className: "flex items-center gap-[12px]", children: [_jsxs("div", { className: "relative shrink-0", onMouseEnter: openEmojiPanel, onMouseLeave: closeEmojiPanelSoon, children: [_jsx("button", { type: "button", onClick: () => {
                                                            clearEmojiHideTimeout();
                                                            setIsEmojiPanelOpen((prev) => !prev);
                                                        }, className: `transition-colors ${isEmojiPanelOpen ? 'text-[#b79cff]' : 'text-white/55 hover:text-white/78'}`, "aria-label": "Open emoji panel", children: _jsx(SmilePlusIcon, { size: 24, strokeWidth: 2.1 }) }), _jsx(EmojiHoverPanel, { open: isEmojiPanelOpen, onMouseEnter: openEmojiPanel, onMouseLeave: closeEmojiPanelSoon, onSelectEmoji: appendEmojiToInput })] }), _jsx("textarea", { value: model.messageInput, onChange: (event) => {
                                                    const next = event.target.value;
                                                    model.setMessageInput(next);
                                                    if (model.selectedChat !== null) {
                                                        void model.sendTypingState(model.selectedChat, next.trim().length > 0);
                                                    }
                                                }, onBlur: () => {
                                                    if (model.selectedChat !== null) {
                                                        void model.sendTypingState(model.selectedChat, false, true);
                                                    }
                                                }, onKeyDown: (event) => {
                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                        event.preventDefault();
                                                        handleSend();
                                                    }
                                                }, rows: 1, placeholder: "Message", className: "max-h-[180px] flex-1 resize-none bg-transparent py-2 text-[16px] text-white/90 placeholder:text-white/40 focus:outline-none" }), _jsxs("label", { className: "relative cursor-pointer text-white/62 hover:text-white", children: [_jsx("input", { type: "file", accept: "image/*,video/*", multiple: true, className: "hidden", onChange: (event) => {
                                                            handlePickedFiles(event.target.files);
                                                            event.target.value = '';
                                                        } }), _jsx(PaperclipIcon, { size: 22, strokeWidth: 2.1 }), model.attachedImages.length > 0 ? (_jsx("span", { className: "absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8e77ef] px-1 text-[10px] text-white", children: model.attachedImages.length })) : null] })] })] }) }), _jsx("button", { type: "button", onClick: handleSend, className: "grid h-[58px] w-[58px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_28px_rgba(142,119,239,.42)] transition-opacity disabled:cursor-not-allowed disabled:opacity-55", disabled: model.selectedChat === null || !canSend, children: _jsx(SendIcon, { size: 24, strokeWidth: 2.2 }) })] }) })] }));
}
