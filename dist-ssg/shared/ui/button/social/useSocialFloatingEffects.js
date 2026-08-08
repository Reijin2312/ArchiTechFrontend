import { useEffect, useRef } from 'react';
import { http } from '../../../../shared/api/http.js';
import { endpoints } from '../../../../shared/api/endpoints.js';
import { secureChatClient } from '../../../../shared/auth/secureChat.js';
import { logger } from '../../../../shared/lib/logger.js';
import { useChatReadTracking } from './useChatReadTracking.js';
import { patchMediaMetadataInStore, patchMessagesInStore, removeMessageFromStore, upsertMessageInStore, } from './actions/messageReconcile.js';
import { ChatScrollSaver, withChatScrollTransaction } from './scroll/chatScrollSaver.js';
export function useSocialFloatingEffects(ctx) {
    const { selectedChatRef, selectedChat, userRef, user, isOpenRef, isOpen, friendsRef, friends, chatsRef, chats, setLastActivityTime, lastActivityTime, setAutoScrollLocked, messages, userId, markChatRead, setIncomingRequests, setOutgoingRequests, setFriends, setChats, setMessageStore, loadFriends, loadIncomingRequests, loadOutgoingRequests, refreshSearchIfNeeded, loadChats, showDesktopNotification, setTypingUsersByChat, typingTimeoutsRef, presenceByUser, setPresenceByUser, setContextMenu, contextMenu, activeTab, loadMessages, loadMessagesAfter, searchQuery, setSearchResults, searchUsers, setIsWsConnecting, disableBodyScrollLock, } = ctx;
    const AUTO_SCROLL_IDLE_LOCK_MS = 60_000;
    const PRESENCE_SYNC_INTERVAL_MS = 20_000;
    const STICKY_BOTTOM_THRESHOLD_PX = 96;
    const lastSentPresenceGateRef = useRef(null);
    const lastPresenceSyncAtRef = useRef(0);
    const messagesRef = useRef(messages);
    const reconnectSyncCursorByChatRef = useRef(new Map());
    const chatScrollSyncRef = useRef({
        chatId: null,
        firstServerMessageId: 0,
        lastMessageIdentity: '',
        scrollHeight: 0,
        nearBottom: true,
    });
    const chatScrollSaverRef = useRef(null);
    const resolveActiveChatScrollContainer = () => document.querySelector('[data-chat-scroll-container="true"]');
    const resolveActiveChatScrollContent = (container) => container.querySelector('[data-chat-scroll-content="true"]') ??
        (container.firstElementChild instanceof HTMLElement ? container.firstElementChild : null);
    const isNearBottom = (element, thresholdPx = STICKY_BOTTOM_THRESHOLD_PX) => {
        const distanceToBottom = element.scrollHeight - (element.scrollTop + element.clientHeight);
        return distanceToBottom <= thresholdPx;
    };
    const getChatMessageEdgeState = (chatId) => {
        let firstServerMessageId = 0;
        let lastMessageIdentity = '';
        for (const message of messagesRef.current) {
            if (message.chatId !== chatId)
                continue;
            if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
                if (firstServerMessageId === 0 || message.messageId < firstServerMessageId) {
                    firstServerMessageId = message.messageId;
                }
            }
            lastMessageIdentity = [
                String(message.messageId),
                typeof message.clientMessageId === 'number' ? String(message.clientMessageId) : '',
                String(message.serverTimestamp ?? message.signatureTimestamp ?? ''),
            ].join('|');
        }
        return { firstServerMessageId, lastMessageIdentity };
    };
    const parsePresenceTimestamp = (value) => {
        if (!value)
            return null;
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    };
    const mergeHttpPresenceState = (previous, response) => {
        const nextOnline = !!response.online;
        const incomingLastSeenAt = response.lastSeenAt ?? null;
        if (nextOnline) {
            return {
                online: true,
                lastSeenAt: previous?.lastSeenAt ?? incomingLastSeenAt ?? null,
                resolved: true,
            };
        }
        if (!previous?.resolved || previous?.online) {
            return {
                online: false,
                lastSeenAt: incomingLastSeenAt ?? previous?.lastSeenAt ?? null,
                resolved: true,
            };
        }
        const previousTs = parsePresenceTimestamp(previous.lastSeenAt ?? null);
        const incomingTs = parsePresenceTimestamp(incomingLastSeenAt);
        if (previousTs == null) {
            return {
                online: false,
                lastSeenAt: incomingLastSeenAt ?? null,
                resolved: true,
            };
        }
        if (incomingTs != null && incomingTs <= previousTs) {
            return {
                online: false,
                lastSeenAt: incomingLastSeenAt,
                resolved: true,
            };
        }
        return {
            online: false,
            lastSeenAt: previous.lastSeenAt ?? incomingLastSeenAt ?? null,
            resolved: true,
        };
    };
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);
    useEffect(() => {
        userRef.current = user;
    }, [user]);
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                setAutoScrollLocked(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [setAutoScrollLocked]);
    useEffect(() => {
        if (!user || !isOpen || activeTab !== 'chat' || !selectedChat) {
            return;
        }
        const elapsed = Date.now() - lastActivityTime;
        if (elapsed >= AUTO_SCROLL_IDLE_LOCK_MS) {
            setAutoScrollLocked(true);
            return;
        }
        const timeoutId = window.setTimeout(() => {
            setAutoScrollLocked(true);
        }, AUTO_SCROLL_IDLE_LOCK_MS - elapsed + 40);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [user, isOpen, activeTab, selectedChat, lastActivityTime, setAutoScrollLocked]);
    useEffect(() => {
        if (!user || !isOpen || activeTab !== 'chat' || !selectedChat) {
            return;
        }
        const unlockAutoScroll = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            const inChatScrollContainer = target.closest('[data-chat-scroll-container="true"]');
            if (!inChatScrollContainer) {
                return;
            }
            setAutoScrollLocked(false);
        };
        document.addEventListener('wheel', unlockAutoScroll, { capture: true, passive: true });
        document.addEventListener('touchmove', unlockAutoScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener('wheel', unlockAutoScroll, true);
            document.removeEventListener('touchmove', unlockAutoScroll, true);
        };
    }, [user, isOpen, activeTab, selectedChat, setAutoScrollLocked]);
    useEffect(() => {
        if (!user) {
            lastSentPresenceGateRef.current = null;
            lastPresenceSyncAtRef.current = 0;
            return;
        }
        const resolvePresenceGateOpen = () => {
            if (!selectedChatRef.current) {
                return false;
            }
            if (!isOpenRef.current) {
                return false;
            }
            if (activeTab !== 'chat') {
                return false;
            }
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                return false;
            }
            const idleMs = Date.now() - lastActivityTime;
            return idleMs <= AUTO_SCROLL_IDLE_LOCK_MS;
        };
        const syncPresenceGate = async (force = false) => {
            const shouldBeOnline = resolvePresenceGateOpen();
            const now = Date.now();
            const shouldResync = now - lastPresenceSyncAtRef.current >= PRESENCE_SYNC_INTERVAL_MS;
            if (!force && !shouldResync && lastSentPresenceGateRef.current === shouldBeOnline) {
                return;
            }
            try {
                await secureChatClient.setPresenceState(shouldBeOnline);
                lastSentPresenceGateRef.current = shouldBeOnline;
                lastPresenceSyncAtRef.current = now;
            }
            catch {
                // ignore transient WS state and retry on next tick
            }
        };
        void syncPresenceGate(true);
        const intervalId = window.setInterval(() => {
            void syncPresenceGate(false);
        }, 1_000);
        const handleVisibilityOrFocus = () => {
            void syncPresenceGate(true);
        };
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [user, activeTab, isOpen, selectedChat, lastActivityTime]);
    useChatReadTracking({
        selectedChatRef,
        selectedChat,
        userRef,
        user,
        isOpenRef,
        activeTab,
        messages,
        lastActivityTime,
        setLastActivityTime,
        markChatRead,
    });
    useEffect(() => {
        if (!isOpen || disableBodyScrollLock)
            return;
        const body = document.body;
        const html = document.documentElement;
        const prevBodyOverflow = body.style.overflow;
        const prevBodyPaddingRight = body.style.paddingRight;
        const prevHtmlOverflow = html.style.overflow;
        const scrollbarWidth = window.innerWidth - html.clientWidth;
        body.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`;
        }
        return () => {
            body.style.overflow = prevBodyOverflow;
            body.style.paddingRight = prevBodyPaddingRight;
            html.style.overflow = prevHtmlOverflow;
        };
    }, [isOpen]);
    useEffect(() => {
        friendsRef.current = friends;
    }, [friends]);
    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);
    useEffect(() => {
        if (!selectedChat || !isOpen || activeTab !== 'chat') {
            chatScrollSyncRef.current.chatId = selectedChat ?? null;
            chatScrollSaverRef.current = null;
            return;
        }
        const scrollContainer = resolveActiveChatScrollContainer();
        if (!scrollContainer) {
            return;
        }
        const saver = chatScrollSaverRef.current ??
            new ChatScrollSaver(scrollContainer, {
                reverse: true,
            });
        chatScrollSaverRef.current = saver;
        const syncNearBottomState = () => {
            const nearBottom = isNearBottom(scrollContainer);
            chatScrollSyncRef.current.nearBottom = nearBottom;
            chatScrollSyncRef.current.scrollHeight = scrollContainer.scrollHeight;
            if (!nearBottom) {
                saver.save();
            }
        };
        syncNearBottomState();
        scrollContainer.addEventListener('scroll', syncNearBottomState, { passive: true });
        window.addEventListener('resize', syncNearBottomState, { passive: true });
        return () => {
            scrollContainer.removeEventListener('scroll', syncNearBottomState);
            window.removeEventListener('resize', syncNearBottomState);
        };
    }, [selectedChat, isOpen, activeTab]);
    useEffect(() => {
        if (!selectedChat || !isOpen || activeTab !== 'chat') {
            return;
        }
        const scrollContainer = resolveActiveChatScrollContainer();
        if (!scrollContainer) {
            return;
        }
        const scrollContent = resolveActiveChatScrollContent(scrollContainer);
        const saver = chatScrollSaverRef.current ??
            new ChatScrollSaver(scrollContainer, {
                reverse: true,
            });
        chatScrollSaverRef.current = saver;
        saver.save();
        let rafId = null;
        const syncAfterLayoutShift = () => {
            rafId = null;
            const previous = chatScrollSyncRef.current;
            const currentScrollHeight = scrollContainer.scrollHeight;
            const currentNearBottom = isNearBottom(scrollContainer);
            if (previous.chatId !== selectedChat) {
                chatScrollSyncRef.current = {
                    ...previous,
                    chatId: selectedChat,
                    scrollHeight: currentScrollHeight,
                    nearBottom: currentNearBottom,
                };
                return;
            }
            const heightDelta = currentScrollHeight - previous.scrollHeight;
            if (Math.abs(heightDelta) < 1) {
                chatScrollSyncRef.current = {
                    ...previous,
                    scrollHeight: currentScrollHeight,
                    nearBottom: currentNearBottom,
                };
                if (!currentNearBottom) {
                    saver.save();
                }
                return;
            }
            if (previous.nearBottom || currentNearBottom) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
            else {
                saver.restore();
            }
            const nearBottomAfterSync = isNearBottom(scrollContainer);
            chatScrollSyncRef.current = {
                ...previous,
                scrollHeight: scrollContainer.scrollHeight,
                nearBottom: nearBottomAfterSync,
            };
            if (!nearBottomAfterSync) {
                saver.save();
            }
        };
        const queueSync = () => {
            if (rafId !== null) {
                return;
            }
            rafId = window.requestAnimationFrame(syncAfterLayoutShift);
        };
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(queueSync) : null;
        if (resizeObserver) {
            resizeObserver.observe(scrollContainer);
            if (scrollContent) {
                resizeObserver.observe(scrollContent);
            }
        }
        const onMediaSettled = (event) => {
            const target = event.target;
            if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) {
                queueSync();
            }
        };
        queueSync();
        scrollContainer.addEventListener('load', onMediaSettled, true);
        scrollContainer.addEventListener('loadedmetadata', onMediaSettled, true);
        return () => {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
            resizeObserver?.disconnect();
            scrollContainer.removeEventListener('load', onMediaSettled, true);
            scrollContainer.removeEventListener('loadedmetadata', onMediaSettled, true);
        };
    }, [selectedChat, isOpen, activeTab]);
    useEffect(() => {
        if (!selectedChat || !isOpen || activeTab !== 'chat') {
            return;
        }
        const scrollContainer = resolveActiveChatScrollContainer();
        if (!scrollContainer) {
            return;
        }
        const chatId = selectedChat;
        const previous = chatScrollSyncRef.current;
        const nextState = getChatMessageEdgeState(chatId);
        const currentScrollHeight = scrollContainer.scrollHeight;
        const currentNearBottom = isNearBottom(scrollContainer);
        let nearBottomAfterSync = currentNearBottom;
        if (previous.chatId === chatId) {
            const appendedMessages = nextState.lastMessageIdentity.length > 0 &&
                nextState.lastMessageIdentity !== previous.lastMessageIdentity;
            if (appendedMessages && previous.nearBottom) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
            nearBottomAfterSync = isNearBottom(scrollContainer);
        }
        chatScrollSyncRef.current = {
            chatId,
            firstServerMessageId: nextState.firstServerMessageId,
            lastMessageIdentity: nextState.lastMessageIdentity,
            scrollHeight: scrollContainer.scrollHeight,
            nearBottom: nearBottomAfterSync,
        };
        if (!nearBottomAfterSync) {
            chatScrollSaverRef.current?.save();
        }
    }, [messages, selectedChat, isOpen, activeTab]);
    useEffect(() => {
        if (!user) {
            setIsWsConnecting(false);
            return;
        }
        let cancelled = false;
        setIsWsConnecting(true);
        logger.chat('[chat_ws]', 'Connecting WebSocket for user:', userId);
        secureChatClient
            .connect()
            .catch((err) => console.error('Failed to connect:', err))
            .finally(() => {
            if (!cancelled) {
                setIsWsConnecting(false);
            }
        });
        return () => {
            cancelled = true;
            setIsWsConnecting(false);
            logger.chat('[chat_ws]', 'Disconnecting WebSocket');
            secureChatClient.disconnect();
            logger.chat('[chat_ws]', 'WebSocket disconnected');
        };
    }, [user, userId, setIsWsConnecting]);
    useEffect(() => {
        logger.chat('Р РЋР вЂљР РЋРЎСџР Р†Р вЂљРЎСљР В Р вЂ°', 'Setting up WebSocket subscription (ONCE on mount)');
        const maxLoadedServerMessageId = (chatId) => messagesRef.current.reduce((maxId, message) => {
            if (message.chatId !== chatId)
                return maxId;
            if (typeof message.messageId !== 'number')
                return maxId;
            return message.messageId > maxId ? message.messageId : maxId;
        }, 0);
        const unsubscribeConnection = secureChatClient.onConnectionState(async (state) => {
            if (state === 'disconnected') {
                setIsWsConnecting(true);
                return;
            }
            if (state !== 'connected') {
                return;
            }
            setIsWsConnecting(false);
            const currentUser = userRef.current;
            if (!currentUser) {
                return;
            }
            const chatIds = Array.from(new Set(chatsRef.current
                .map((chat) => chat.chatId)
                .filter((chatId) => Number.isFinite(chatId) && chatId > 0)));
            for (const chatId of chatIds) {
                const fallbackLastMessageId = (() => {
                    const chat = chatsRef.current.find((item) => item.chatId === chatId);
                    if (!chat || !chat.lastMessage)
                        return 0;
                    return typeof chat.lastMessage.messageId === 'number' ? chat.lastMessage.messageId : 0;
                })();
                const afterMessageId = Math.max(maxLoadedServerMessageId(chatId), fallbackLastMessageId);
                if (afterMessageId <= 0) {
                    continue;
                }
                const lastSyncedAfterId = reconnectSyncCursorByChatRef.current.get(chatId);
                if (lastSyncedAfterId === afterMessageId) {
                    continue;
                }
                try {
                    await loadMessagesAfter(chatId, afterMessageId, 100);
                    reconnectSyncCursorByChatRef.current.set(chatId, afterMessageId);
                }
                catch (error) {
                    reconnectSyncCursorByChatRef.current.delete(chatId);
                    logger.warn('Failed to load reconnect missed-range', { chatId, afterMessageId, error });
                }
            }
        });
        const unsubscribe = secureChatClient.onMessage(async (wsMessage) => {
            const currentUser = userRef.current;
            const currentChatId = selectedChatRef.current;
            if (!currentUser)
                return;
            if (wsMessage.type === 'friend_request') {
                const req = wsMessage.friendRequest ?? {
                    userId: wsMessage.userId,
                    displayName: wsMessage.displayName,
                    username: wsMessage.username,
                    requestId: wsMessage.requestId,
                };
                logger.chat('[friend_request]', 'New friend request received:', req);
                setIncomingRequests(prev => {
                    if (req.requestId && prev.some(r => r.requestId === req.requestId))
                        return prev;
                    if (prev.some(r => r.userId === req.userId))
                        return prev;
                    return [req, ...prev];
                });
                loadIncomingRequests();
                loadOutgoingRequests();
                return;
            }
            if (wsMessage.type === 'friend_accept') {
                const reqUserId = wsMessage.friendRequest?.userId || wsMessage.userId;
                logger.chat('[friend_accept]', 'Friend request accepted:', wsMessage.friendRequest || wsMessage);
                if (reqUserId) {
                    setIncomingRequests(prev => prev.filter(r => r.userId !== reqUserId));
                    setOutgoingRequests(prev => prev.filter(r => r.userId !== reqUserId));
                }
                try {
                    const { data } = await http.get(endpoints.friendsList);
                    setFriends(data.friends);
                    logger.chat('[friend_accept]', 'Friends list updated after accept');
                }
                catch (err) {
                    logger.error('Failed to reload friends:', err);
                }
                loadOutgoingRequests();
                loadIncomingRequests();
                refreshSearchIfNeeded();
                return;
            }
            if (wsMessage.type === 'friend_reject') {
                const reqUserId = wsMessage.friendRequest?.userId || wsMessage.userId;
                logger.chat('[friend_reject]', 'Friend request rejected:', wsMessage.friendRequest || wsMessage);
                if (reqUserId) {
                    setIncomingRequests(prev => prev.filter(r => r.userId !== reqUserId));
                    setOutgoingRequests(prev => prev.filter(r => r.userId !== reqUserId));
                }
                loadIncomingRequests();
                loadOutgoingRequests();
                refreshSearchIfNeeded();
                return;
            }
            if (wsMessage.type === 'friend_removed') {
                const removerId = wsMessage.friendRequest?.userId || wsMessage.userId;
                logger.chat('[friend_removed]', 'Friend removed you:', wsMessage.friendRequest || wsMessage);
                if (removerId) {
                    setFriends(prev => prev.filter(f => f.userId !== removerId));
                    setOutgoingRequests(prev => prev.filter(r => r.userId !== removerId));
                    setIncomingRequests(prev => prev.filter(r => r.userId !== removerId));
                    setChats(prev => prev.filter((c) => c.chatType !== 'PRIVATE' || !c.participantId || c.participantId !== removerId));
                }
                try {
                    const { data } = await http.get(endpoints.friendsList);
                    setFriends(data.friends);
                }
                catch (err) {
                    logger.error('Failed to reload friends after removal:', err);
                }
                loadChats();
                loadIncomingRequests();
                loadOutgoingRequests();
                refreshSearchIfNeeded();
                return;
            }
            if (wsMessage.type === 'chat_list_changed') {
                logger.chat('[chat_list_changed]', 'Refreshing chat list for chat:', wsMessage.chatId);
                loadChats();
                return;
            }
            if (wsMessage.type === 'typing_state' && wsMessage.chatId && wsMessage.userId) {
                if (wsMessage.userId === currentUser.id) {
                    return;
                }
                const chatId = wsMessage.chatId;
                const typing = !!wsMessage.typing;
                const timeoutKey = `${chatId}:${wsMessage.userId}`;
                const clearTypingTimeout = () => {
                    const timerId = typingTimeoutsRef.current.get(timeoutKey);
                    if (timerId !== undefined) {
                        window.clearTimeout(timerId);
                        typingTimeoutsRef.current.delete(timeoutKey);
                    }
                };
                const removeTypingUser = () => {
                    setTypingUsersByChat((prev) => {
                        const currentUsers = prev[chatId] ?? [];
                        if (!currentUsers.includes(wsMessage.userId)) {
                            return prev;
                        }
                        const nextUsers = currentUsers.filter((id) => id !== wsMessage.userId);
                        const next = { ...prev };
                        if (nextUsers.length === 0) {
                            delete next[chatId];
                        }
                        else {
                            next[chatId] = nextUsers;
                        }
                        return next;
                    });
                };
                clearTypingTimeout();
                if (typing) {
                    setTypingUsersByChat((prev) => {
                        const currentUsers = prev[chatId] ?? [];
                        if (currentUsers.includes(wsMessage.userId)) {
                            return prev;
                        }
                        return { ...prev, [chatId]: [...currentUsers, wsMessage.userId] };
                    });
                    const timerId = window.setTimeout(() => {
                        removeTypingUser();
                        typingTimeoutsRef.current.delete(timeoutKey);
                    }, 7000);
                    typingTimeoutsRef.current.set(timeoutKey, timerId);
                }
                else {
                    removeTypingUser();
                }
                return;
            }
            if (wsMessage.type === 'presence_changed' && wsMessage.userId) {
                setPresenceByUser((prev) => {
                    const previous = prev[wsMessage.userId];
                    const nextLastSeenAt = wsMessage.online
                        ? previous?.lastSeenAt ?? null
                        : wsMessage.lastSeenAt ?? previous?.lastSeenAt ?? null;
                    return {
                        ...prev,
                        [wsMessage.userId]: {
                            online: !!wsMessage.online,
                            lastSeenAt: nextLastSeenAt,
                            resolved: true,
                        },
                    };
                });
                return;
            }
            if (wsMessage.type === 'message_read' && wsMessage.chatId && wsMessage.lastReadMessageId) {
                console.log('Р Р†РЎС™РІР‚В¦ Received message_read event for chat', wsMessage.chatId, 'up to message', wsMessage.lastReadMessageId);
                setMessageStore((prev) => patchMessagesInStore(prev, (message) => message.chatId === wsMessage.chatId &&
                    message.senderId === currentUser.id &&
                    typeof message.messageId === 'number' &&
                    message.messageId <= wsMessage.lastReadMessageId, () => ({ isRead: true }), currentUser.id));
                return;
            }
            if (wsMessage.type === 'message_edited' && wsMessage.chatId && wsMessage.messageId) {
                console.log('Р Р†РЎС™Р РЏР С—РЎвЂР РЏ Received message_edited event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
                if (wsMessage.message?.content === undefined) {
                    return;
                }
                setMessageStore((prev) => patchMessagesInStore(prev, (message) => message.messageId === wsMessage.messageId, (message) => ({
                    content: wsMessage.message?.content ?? message.content,
                    entities: wsMessage.message?.entities ?? message.entities,
                    edited: true,
                }), currentUser.id));
                return;
            }
            if (wsMessage.type === 'message_deleted' && wsMessage.chatId && wsMessage.messageId) {
                console.log('РЎР‚РЎСџРІР‚вЂќРІР‚ВР С—РЎвЂР РЏ Received message_deleted event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
                setMessageStore((prev) => removeMessageFromStore(prev, wsMessage.messageId, currentUser.id));
                return;
            }
            if (wsMessage.type === 'message_sent' && wsMessage.messageId && wsMessage.clientMessageId) {
                setMessageStore((prev) => upsertMessageInStore(prev, {
                    messageId: wsMessage.messageId,
                    clientMessageId: wsMessage.clientMessageId,
                    status: 'sent',
                    sequenceNumber: wsMessage.sequenceNumber,
                    serverTimestamp: wsMessage.serverTimestamp,
                    signatureTimestamp: wsMessage.serverTimestamp,
                    groupingKey: wsMessage.groupingKey,
                }, currentUser.id));
                return;
            }
            if (wsMessage.type === 'media_updated' && wsMessage.chatId) {
                const mediaPath = wsMessage.mediaPath ?? wsMessage.media?.mediaPath;
                const hasServerMessageId = typeof wsMessage.messageId === 'number' && Number.isFinite(wsMessage.messageId);
                const hasClientMessageKey = typeof wsMessage.clientMessageId === 'number'
                    && Number.isFinite(wsMessage.clientMessageId)
                    && typeof wsMessage.senderId === 'string'
                    && wsMessage.senderId.trim().length > 0;
                if (!hasServerMessageId && !hasClientMessageKey) {
                    return;
                }
                const patch = {
                    messageId: hasServerMessageId ? wsMessage.messageId : undefined,
                    clientMessageId: typeof wsMessage.clientMessageId === 'number'
                        ? wsMessage.clientMessageId
                        : undefined,
                    senderId: wsMessage.senderId,
                    mediaPath,
                    width: typeof wsMessage.mediaWidth === 'number'
                        ? wsMessage.mediaWidth
                        : wsMessage.media?.width,
                    height: typeof wsMessage.mediaHeight === 'number'
                        ? wsMessage.mediaHeight
                        : wsMessage.media?.height,
                    contentType: wsMessage.mediaContentType ?? wsMessage.media?.contentType,
                    sizeBytes: wsMessage.mediaSizeBytes ?? wsMessage.media?.sizeBytes,
                    imageEncryptionIv: wsMessage.mediaEncryptionIv ?? wsMessage.media?.imageEncryptionIv,
                    imageKeyVersion: wsMessage.mediaKeyVersion ?? wsMessage.media?.imageKeyVersion,
                    imageUrl: wsMessage.mediaUrl ?? wsMessage.media?.imageUrl,
                    thumbnailUrl: wsMessage.mediaThumbnailUrl ?? wsMessage.media?.thumbnailUrl,
                    strippedThumbnailUrl: wsMessage.mediaStrippedThumbnailUrl ?? wsMessage.media?.strippedThumbnailUrl,
                    fileName: wsMessage.mediaFileName ?? wsMessage.media?.fileName,
                    isImage: typeof wsMessage.mediaIsImage === 'boolean'
                        ? wsMessage.mediaIsImage
                        : wsMessage.media?.isImage,
                };
                withChatScrollTransaction(() => {
                    setMessageStore((prev) => patchMediaMetadataInStore(prev, patch));
                }, {
                    reverse: true,
                    frames: 2,
                });
                return;
            }
            if (wsMessage.type !== 'new_message')
                return;
            const incoming = wsMessage.message;
            if (!incoming || typeof incoming.messageId !== 'number' || typeof incoming.chatId !== 'number') {
                return;
            }
            const normalizedMessage = {
                ...incoming,
                chatId: incoming.chatId,
                messageId: incoming.messageId,
                clientMessageId: incoming.clientMessageId,
                status: incoming.isRead ? 'read' : 'sent',
                serverTimestamp: incoming.serverTimestamp ?? incoming.signatureTimestamp,
                signatureTimestamp: incoming.serverTimestamp ?? incoming.signatureTimestamp,
            };
            showDesktopNotification(normalizedMessage, currentUser.id);
            setMessageStore((prev) => upsertMessageInStore(prev, normalizedMessage, currentUser.id));
        });
        return () => {
            logger.chat('РЎР‚РЎСџРІР‚СњР Р‰', 'Unsubscribing from WebSocket');
            unsubscribeConnection();
            unsubscribe();
        };
    }, []);
    useEffect(() => {
        if (!user)
            return;
        loadIncomingRequests();
        loadOutgoingRequests();
        logger.chat('Р РЋР вЂљР РЋРЎСџР Р†Р вЂљРЎС™Р В РІР‚В°', 'Loading initial friend requests for badge counts');
    }, [user]);
    useEffect(() => {
        if (!user || !isOpen)
            return;
        loadFriends();
        loadChats();
        loadIncomingRequests();
        loadOutgoingRequests();
    }, [user, isOpen]);
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        const handleScroll = () => setContextMenu(null);
        if (contextMenu) {
            document.addEventListener('click', handleClick);
            document.addEventListener('scroll', handleScroll, true);
            return () => {
                document.removeEventListener('click', handleClick);
                document.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [contextMenu]);
    useEffect(() => {
        if (!selectedChat || !user)
            return;
        const chat = chats.find((item) => item.chatId === selectedChat);
        if (!chat || chat.chatType !== 'GROUP')
            return;
        const participantIds = chat.participantIds ?? [];
        const uniqueParticipantIds = Array.from(new Set(participantIds.filter((id) => !!id && id !== userId)));
        const unresolvedParticipantIds = uniqueParticipantIds.filter((id) => !presenceByUser[id]?.resolved);
        if (unresolvedParticipantIds.length === 0)
            return;
        let cancelled = false;
        (async () => {
            const loadedStates = await Promise.all(unresolvedParticipantIds.map(async (targetUserId) => {
                try {
                    const { data } = await http.get(endpoints.chatPresence(targetUserId));
                    return { targetUserId, data };
                }
                catch (err) {
                    logger.warn('Failed to load chat presence', { targetUserId, err });
                    return null;
                }
            }));
            if (cancelled)
                return;
            setPresenceByUser((prev) => {
                let changed = false;
                const next = { ...prev };
                for (const loadedState of loadedStates) {
                    if (!loadedState)
                        continue;
                    const { targetUserId, data } = loadedState;
                    const previous = prev[targetUserId];
                    const nextState = mergeHttpPresenceState(previous, data);
                    if (previous?.online !== nextState.online
                        || (previous?.lastSeenAt ?? null) !== (nextState.lastSeenAt ?? null)
                        || previous?.resolved !== true) {
                        next[targetUserId] = nextState;
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedChat, user, userId, chats, presenceByUser, setPresenceByUser]);
    useEffect(() => {
        if (!selectedChat || !user || !isOpen || activeTab !== 'chat')
            return;
        const chat = chats.find((item) => item.chatId === selectedChat);
        if (!chat || chat.chatType !== 'PRIVATE')
            return;
        const participantId = chat.participantId;
        if (!participantId || participantId === userId)
            return;
        let cancelled = false;
        const refreshPresence = async () => {
            try {
                const { data } = await http.get(endpoints.chatPresence(participantId));
                if (cancelled)
                    return;
                setPresenceByUser((prev) => {
                    const previous = prev[participantId];
                    const nextState = mergeHttpPresenceState(previous, data);
                    if (previous?.online === nextState.online
                        && (previous?.lastSeenAt ?? null) === (nextState.lastSeenAt ?? null)
                        && previous?.resolved === true) {
                        return prev;
                    }
                    return { ...prev, [participantId]: nextState };
                });
            }
            catch (err) {
                logger.warn('Failed to refresh private chat presence', { participantId, err });
            }
        };
        void refreshPresence();
        const intervalId = window.setInterval(() => {
            void refreshPresence();
        }, 20_000);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void refreshPresence();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [selectedChat, user, userId, chats, isOpen, activeTab, setPresenceByUser]);
    useEffect(() => {
        if (!selectedChat || !isOpen || activeTab !== 'chat')
            return;
        loadMessages(selectedChat, false);
    }, [selectedChat, isOpen, activeTab]);
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            searchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    useEffect(() => {
        return () => {
            typingTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId));
            typingTimeoutsRef.current.clear();
        };
    }, []);
}
