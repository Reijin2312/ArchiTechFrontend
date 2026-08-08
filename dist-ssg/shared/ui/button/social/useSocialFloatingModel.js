import { useEffect, useMemo, useRef, useState, } from 'react';
import { authStore } from '../../../../shared/store/auth.js';
import { logger } from '../../../../shared/lib/logger.js';
import { useSocialFloatingEffects } from './useSocialFloatingEffects.js';
import { createSocialFloatingActions } from './createSocialFloatingActions.js';
import { createMessageStore, messageStoreToArray, projectChatsFromMessageStore, } from './actions/messageReconcile.js';
export function useSocialFloatingModel(options = {}) {
    const mode = options.mode ?? 'floating';
    const isPageMode = mode === 'page';
    const user = authStore(s => s.user);
    const userId = user?.id || '';
    const [isOpen, setIsOpen] = useState(isPageMode);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');
    const [requestsSubTab, setRequestsSubTab] = useState('incoming');
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageStore, setMessageStore] = useState(() => createMessageStore([]));
    const messages = useMemo(() => {
        if (!selectedChat) {
            return [];
        }
        return messageStoreToArray(messageStore).filter((message) => message.chatId === selectedChat);
    }, [messageStore, selectedChat]);
    const setMessages = (value) => {
        setMessageStore((previousStore) => {
            const previousMessages = messageStoreToArray(previousStore);
            const nextMessages = typeof value === 'function'
                ? value(previousMessages)
                : value;
            return createMessageStore(nextMessages, userId);
        });
    };
    const [messageInput, setMessageInput] = useState('');
    const [typingUsersByChat, setTypingUsersByChat] = useState({});
    const [presenceByUser, setPresenceByUser] = useState({});
    const [isWsConnecting, setIsWsConnecting] = useState(false);
    const [isChatsRefreshing, setIsChatsRefreshing] = useState(false);
    const [lastActivityTime, setLastActivityTime] = useState(Date.now());
    const [autoScrollLocked, setAutoScrollLockedState] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [uploadingImages, setUploadingImages] = useState(new Map());
    const [pendingMediaPreviewUrls, setPendingMediaPreviewUrls] = useState(new Map());
    const [attachedImages, setAttachedImages] = useState([]);
    const messagesEndRef = useRef(null);
    const pendingMediaPreviewUrlsRef = useRef(new Map());
    const markReadTimeoutRef = useRef(null);
    const markReadTargetRef = useRef(null);
    const sendQueueRef = useRef(new Map());
    const pendingUploadCancelsRef = useRef(new Map());
    const historyBeforeByChatRef = useRef(new Map());
    const historyHasMoreByChatRef = useRef(new Map());
    const historyLoadingByChatRef = useRef(new Set());
    const activeTopicByChatRef = useRef(new Map());
    const lastProtocolSeqRef = useRef(0);
    const lastProtocolMsgIdRef = useRef(0);
    const typingTimeoutsRef = useRef(new Map());
    const typingThrottleRef = useRef(new Map());
    const isFirstLoadRef = useRef(true);
    const autoScrollLockedRef = useRef(false);
    const setAutoScrollLocked = (value) => {
        setAutoScrollLockedState((prev) => {
            const next = typeof value === 'function'
                ? value(prev)
                : value;
            autoScrollLockedRef.current = next;
            return next;
        });
    };
    const selectedChatRef = useRef(selectedChat);
    const userRef = useRef(user);
    const isOpenRef = useRef(isOpen);
    const friendsRef = useRef([]);
    const chatsRef = useRef([]);
    const scrollToBottom = (smooth = true) => {
        if (autoScrollLockedRef.current) {
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };
    const closeMessenger = () => {
        if (isPageMode) {
            setSelectedChat(null);
            setMessages([]);
            return;
        }
        setIsOpen(false);
        setIsFullscreen(false);
        setActiveTab('chat');
    };
    useEffect(() => {
        setChats((previousChats) => projectChatsFromMessageStore(previousChats, messageStore));
    }, [messageStore]);
    const normalizeAssetUrl = (url) => {
        if (!url)
            return undefined;
        try {
            return new URL(url, window.location.origin).toString();
        }
        catch {
            return undefined;
        }
    };
    const requestDesktopNotificationPermission = async () => {
        if (!('Notification' in window))
            return;
        if (Notification.permission !== 'default')
            return;
        try {
            await Notification.requestPermission();
        }
        catch (err) {
            logger.warn('Failed to request Notification permission:', err);
        }
    };
    const getNotificationBody = (msg) => {
        const messageType = typeof msg?.messageType === 'string' ? msg.messageType : '';
        const isGroupServiceMessage = messageType === 'group_created' ||
            messageType === 'group_title_updated' ||
            messageType === 'group_avatar_updated' ||
            messageType === 'group_member_added' ||
            messageType === 'group_members_added' ||
            messageType === 'group_member_removed' ||
            messageType === 'group_members_removed' ||
            messageType === 'group_member_left' ||
            messageType === 'group_admin_promoted' ||
            messageType === 'group_admin_demoted' ||
            messageType === 'group_owner_transferred' ||
            messageType === 'group_description_updated' ||
            messageType === 'group_public_username_updated' ||
            messageType === 'group_slow_mode_updated' ||
            messageType === 'group_history_visibility_updated' ||
            messageType === 'group_permissions_updated' ||
            messageType === 'group_admin_rights_updated' ||
            messageType === 'group_member_muted' ||
            messageType === 'group_member_unmuted' ||
            messageType === 'group_member_banned' ||
            messageType === 'group_member_unbanned' ||
            messageType === 'group_message_pinned' ||
            messageType === 'group_message_unpinned' ||
            messageType === 'group_invite_link_created' ||
            messageType === 'group_invite_link_revoked' ||
            messageType === 'group_join_request_created' ||
            messageType === 'group_join_request_approved' ||
            messageType === 'group_join_request_declined' ||
            messageType === 'group_topic_created' ||
            messageType === 'group_topic_closed' ||
            messageType === 'group_topic_reopened' ||
            messageType === 'group_topic_deleted' ||
            messageType === 'reaction' ||
            messageType === 'poll' ||
            messageType === 'poll_closed';
        if (isGroupServiceMessage) {
            const actor = (typeof msg?.senderDisplayName === 'string' && msg.senderDisplayName.trim()) ||
                (typeof msg?.senderUsername === 'string' && msg.senderUsername.trim()) ||
                'Someone';
            const members = typeof msg?.content === 'string'
                ? msg.content
                    .split(',')
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0)
                : [];
            if (messageType === 'group_created') {
                const title = typeof msg?.content === 'string' ? msg.content.trim() : '';
                return title ? `${actor} created group "${title}"` : `${actor} created the group`;
            }
            if (messageType === 'group_title_updated') {
                const title = typeof msg?.content === 'string' ? msg.content.trim() : '';
                return title ? `${actor} changed group title to "${title}"` : `${actor} changed the group title`;
            }
            if (messageType === 'group_avatar_updated')
                return `${actor} updated group photo`;
            if (messageType === 'group_member_added' || messageType === 'group_members_added') {
                if (members.length === 1)
                    return `${actor} added ${members[0]}`;
                if (members.length > 1)
                    return `${actor} added ${members.join(', ')}`;
                return `${actor} added members`;
            }
            if (messageType === 'group_member_removed' || messageType === 'group_members_removed') {
                if (members.length === 1)
                    return `${actor} removed ${members[0]}`;
                if (members.length > 1)
                    return `${actor} removed ${members.join(', ')}`;
                return `${actor} removed members`;
            }
            if (messageType === 'group_member_left')
                return `${actor} left the group`;
            if (messageType === 'group_admin_promoted') {
                if (members.length === 1)
                    return `${actor} promoted ${members[0]} to admin`;
                if (members.length > 1)
                    return `${actor} promoted ${members.join(', ')} to admins`;
                return `${actor} promoted a new admin`;
            }
            if (messageType === 'group_admin_demoted') {
                if (members.length === 1)
                    return `${actor} demoted ${members[0]}`;
                if (members.length > 1)
                    return `${actor} demoted ${members.join(', ')}`;
                return `${actor} changed admin rights`;
            }
            if (messageType === 'group_owner_transferred') {
                if (members.length === 1)
                    return `${actor} transferred ownership to ${members[0]}`;
                if (members.length > 1)
                    return `${actor} transferred ownership to ${members.join(', ')}`;
                return `${actor} transferred ownership`;
            }
            if (messageType === 'group_description_updated')
                return `${actor} updated group description`;
            if (messageType === 'group_public_username_updated')
                return `${actor} updated public username`;
            if (messageType === 'group_slow_mode_updated')
                return `${actor} updated slow mode`;
            if (messageType === 'group_history_visibility_updated')
                return `${actor} updated history visibility`;
            if (messageType === 'group_permissions_updated')
                return `${actor} updated group permissions`;
            if (messageType === 'group_admin_rights_updated')
                return `${actor} updated admin rights`;
            if (messageType === 'group_member_muted')
                return `${actor} muted a member`;
            if (messageType === 'group_member_unmuted')
                return `${actor} unmuted a member`;
            if (messageType === 'group_member_banned')
                return `${actor} banned a member`;
            if (messageType === 'group_member_unbanned')
                return `${actor} unbanned a member`;
            if (messageType === 'group_message_pinned')
                return `${actor} pinned a message`;
            if (messageType === 'group_message_unpinned')
                return `${actor} unpinned a message`;
            if (messageType === 'group_invite_link_created')
                return `${actor} created an invite link`;
            if (messageType === 'group_invite_link_revoked')
                return `${actor} revoked an invite link`;
            if (messageType === 'group_join_request_created')
                return `${actor} requested to join`;
            if (messageType === 'group_join_request_approved')
                return `${actor} approved a join request`;
            if (messageType === 'group_join_request_declined')
                return `${actor} declined a join request`;
            if (messageType === 'group_topic_created')
                return `${actor} created a topic`;
            if (messageType === 'group_topic_closed')
                return `${actor} closed a topic`;
            if (messageType === 'group_topic_reopened')
                return `${actor} reopened a topic`;
            if (messageType === 'group_topic_deleted')
                return `${actor} deleted a topic`;
            if (messageType === 'reaction')
                return `${actor} reacted to a message`;
            if (messageType === 'poll')
                return `${actor} created a poll`;
            if (messageType === 'poll_closed')
                return `${actor} closed a poll`;
        }
        const text = typeof msg.content === 'string' ? msg.content.trim() : '';
        if (text)
            return text;
        if (msg.messageType === 'images') {
            const count = Array.isArray(msg.images) ? msg.images.length : 0;
            return count > 1 ? `${count} изображений` : 'Изображение';
        }
        if (msg.messageType === 'image') {
            return 'Изображение';
        }
        return 'Новое сообщение';
    };
    const showDesktopNotification = (msg, currentUserId) => {
        if (!('Notification' in window))
            return;
        if (Notification.permission !== 'granted')
            return;
        if (msg.senderId === currentUserId)
            return;
        const isBackgroundTab = document.visibilityState !== 'visible' || !document.hasFocus();
        if (!isBackgroundTab)
            return;
        const sender = friendsRef.current.find((friend) => friend.userId === msg.senderId);
        const chat = chatsRef.current.find((item) => item.chatId === msg.chatId);
        const title = sender?.displayName ||
            sender?.username ||
            (chat?.chatType === 'GROUP'
                ? chat.title?.trim() || `Group #${chat.chatId}`
                : chat?.participantId?.slice(0, 8)) ||
            'Новое сообщение';
        const icon = normalizeAssetUrl(sender?.avatarUrl) ||
            normalizeAssetUrl('/images/favicon-192.png');
        const badge = normalizeAssetUrl('/images/favicon-32.png');
        const notification = new Notification(title, {
            body: getNotificationBody(msg),
            icon,
            badge,
            tag: `chat-${msg.chatId}-${msg.messageId ?? Date.now()}`,
        });
        notification.onclick = () => {
            window.focus();
            setIsOpen(true);
            setActiveTab('chat');
            setSelectedChat(msg.chatId);
            notification.close();
        };
    };
    const { loadFriends, loadIncomingRequests, loadOutgoingRequests, searchUsers, refreshSearchIfNeeded, sendFriendRequest, acceptRequest, rejectRequest, removeFriend, cancelRequest, markChatRead, loadChats, loadMessages, loadMessagesAfter, loadOlderMessages, setActiveTopicId, getActiveTopicId, openChatWith, createGroupChat, updateGroupChat, addGroupMembers, removeGroupMembers, leaveGroupChat, updateGroupMemberRole, getGroupSettings, updateGroupSettings, getGroupPermissions, updateGroupPermissions, getInviteLinks, createInviteLink, updateInviteLink, revokeInviteLink, joinByInviteCode, getJoinRequests, approveJoinRequest, declineJoinRequest, getMemberRestrictions, updateMemberRestrictions, getAdminRights, updateAdminRights, getTopics, createTopic, updateTopic, getMessageReactions, toggleMessageReaction, createPoll, getPollByMessageId, getPollVoters, getPoll, votePoll, closePoll, pinGroupMessage, unpinGroupMessage, getGroupMedia, getGroupAdminLog, sendTypingState, sendMessageToUser, sendChatMessage, retryFailedMessage, sendMessagesWithImages, cancelPendingMediaUpload, attachImage, removeAttachedImage, editMessage, deleteMessage, copyMessageText, uploadImage, } = createSocialFloatingActions({
        user,
        searchQuery,
        selectedChat,
        chats,
        messages,
        messageStore,
        messageInput,
        attachedImages,
        editingMessage,
        replyingTo,
        markReadTimeoutRef,
        sendQueueRef,
        pendingUploadCancelsRef,
        historyBeforeByChatRef,
        historyHasMoreByChatRef,
        historyLoadingByChatRef,
        activeTopicByChatRef,
        lastProtocolSeqRef,
        lastProtocolMsgIdRef,
        typingThrottleRef,
        isFirstLoadRef,
        messagesEndRef,
        markReadTargetRef,
        setFriends,
        setIncomingRequests,
        setOutgoingRequests,
        setLoading,
        setSearchResults,
        setMessages,
        setMessageStore,
        setChats,
        setSelectedChat,
        setActiveTab,
        setReplyingTo,
        setMessageInput,
        setAttachedImages,
        setEditingMessage,
        setUploadingImages,
        pendingMediaPreviewUrls,
        setPendingMediaPreviewUrls,
        setAutoScrollLocked,
        setIsChatsRefreshing,
        scrollToBottom,
    });
    useEffect(() => {
        pendingMediaPreviewUrlsRef.current = pendingMediaPreviewUrls;
    }, [pendingMediaPreviewUrls]);
    useEffect(() => {
        return () => {
            for (const url of pendingMediaPreviewUrlsRef.current.values()) {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            }
        };
    }, []);
    useSocialFloatingEffects({
        selectedChatRef,
        selectedChat,
        userRef,
        user,
        isOpenRef,
        isOpen,
        friendsRef,
        friends,
        chatsRef,
        chats,
        setLastActivityTime,
        lastActivityTime,
        messages,
        userId,
        markChatRead,
        setIncomingRequests,
        setOutgoingRequests,
        setFriends,
        setChats,
        setMessageStore,
        loadFriends,
        loadIncomingRequests,
        loadOutgoingRequests,
        refreshSearchIfNeeded,
        loadChats,
        showDesktopNotification,
        setTypingUsersByChat,
        typingTimeoutsRef,
        presenceByUser,
        setPresenceByUser,
        setContextMenu,
        contextMenu,
        activeTab,
        loadMessages,
        loadMessagesAfter,
        searchQuery,
        setSearchResults,
        searchUsers,
        disableBodyScrollLock: isPageMode,
        setAutoScrollLocked,
        setIsWsConnecting,
    });
    return {
        isOpen,
        setIsOpen,
        isFullscreen,
        setIsFullscreen,
        activeTab,
        setActiveTab,
        requestsSubTab,
        setRequestsSubTab,
        friends,
        setFriends,
        incomingRequests,
        setIncomingRequests,
        outgoingRequests,
        setOutgoingRequests,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        loading,
        setLoading,
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        messageStore,
        setMessageStore,
        messages,
        setMessages,
        messageInput,
        setMessageInput,
        typingUsersByChat,
        setTypingUsersByChat,
        presenceByUser,
        setPresenceByUser,
        isWsConnecting,
        setIsWsConnecting,
        isChatsRefreshing,
        setIsChatsRefreshing,
        lastActivityTime,
        setLastActivityTime,
        autoScrollLocked,
        setAutoScrollLocked,
        replyingTo,
        setReplyingTo,
        editingMessage,
        setEditingMessage,
        contextMenu,
        setContextMenu,
        uploadingImages,
        setUploadingImages,
        pendingMediaPreviewUrls,
        setPendingMediaPreviewUrls,
        attachedImages,
        setAttachedImages,
        user,
        userId,
        messagesEndRef,
        markReadTimeoutRef,
        markReadTargetRef,
        typingTimeoutsRef,
        typingThrottleRef,
        isFirstLoadRef,
        selectedChatRef,
        userRef,
        isOpenRef,
        friendsRef,
        chatsRef,
        scrollToBottom,
        closeMessenger,
        normalizeAssetUrl,
        requestDesktopNotificationPermission,
        getNotificationBody,
        showDesktopNotification,
        loadFriends,
        loadIncomingRequests,
        loadOutgoingRequests,
        searchUsers,
        refreshSearchIfNeeded,
        sendFriendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        cancelRequest,
        markChatRead,
        loadChats,
        loadMessages,
        loadMessagesAfter,
        loadOlderMessages,
        setActiveTopicId,
        getActiveTopicId,
        openChatWith,
        createGroupChat,
        updateGroupChat,
        addGroupMembers,
        removeGroupMembers,
        leaveGroupChat,
        updateGroupMemberRole,
        getGroupSettings,
        updateGroupSettings,
        getGroupPermissions,
        updateGroupPermissions,
        getInviteLinks,
        createInviteLink,
        updateInviteLink,
        revokeInviteLink,
        joinByInviteCode,
        getJoinRequests,
        approveJoinRequest,
        declineJoinRequest,
        getMemberRestrictions,
        updateMemberRestrictions,
        getAdminRights,
        updateAdminRights,
        getTopics,
        createTopic,
        updateTopic,
        getMessageReactions,
        toggleMessageReaction,
        createPoll,
        getPollByMessageId,
        getPollVoters,
        getPoll,
        votePoll,
        closePoll,
        pinGroupMessage,
        unpinGroupMessage,
        getGroupMedia,
        getGroupAdminLog,
        sendTypingState,
        sendMessageToUser,
        sendChatMessage,
        retryFailedMessage,
        sendMessagesWithImages,
        cancelPendingMediaUpload,
        attachImage,
        removeAttachedImage,
        editMessage,
        deleteMessage,
        copyMessageText,
        uploadImage,
    };
}
