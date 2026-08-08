export const endpoints = {
    login: '/api/auth/login',
    authLogin2fa: '/api/auth/login/2fa',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    verifyEmailConfirm: '/api/auth/verify-email/confirm',
    verifyEmailResend: '/api/auth/verify-email/resend',
    resetBegin: '/api/auth/password/reset/begin',
    resetConfirm: '/api/auth/password/reset/confirm',
    resetResend: '/api/auth/password/reset/resend',
    resetFinish: '/api/auth/password/reset/finish',
    deviceBegin: '/api/auth/device/begin',
    deviceComplete: '/api/auth/device/complete',
    devicePoll: '/api/auth/device/poll',
    userByName: (u) => `/api/v1/users/by-name?username=${encodeURIComponent(u)}`,
    profileMe: '/api/v1/profile',
    profileUpdate: '/api/v1/profile',
    profileAvatar: '/api/v1/profile/avatar',
    profileSkin: '/api/v1/profile/skin',
    profileSkinUrl: '/api/v1/profile/skin/url',
    accountPasswordChange: '/api/v1/account/password/change',
    accountUsernameChange: '/api/v1/account/username/change',
    accountEmailChange: '/api/v1/account/email/change',
    accountEmailConfirm: '/api/v1/account/email/confirm',
    accountPhoneBind: '/api/v1/account/phone/bind',
    accountPhoneVerify: '/api/v1/account/phone/verify',
    accountSessions: '/api/v1/account/sessions',
    accountExport: '/api/v1/account/export',
    account2faStatus: '/api/v1/account/2fa/status',
    account2faSetupStart: '/api/v1/account/2fa/setup/start',
    account2faSetupConfirm: '/api/v1/account/2fa/setup/confirm',
    account2faDisable: '/api/v1/account/2fa/disable',
    accountEmailChangeOldBegin: '/api/account/email/change/begin',
    accountEmailChangeOldResend: '/api/account/email/change/resend',
    accountEmailChangeOldConfirm: '/api/account/email/change/confirm',
    accountEmailChangeSet: '/api/account/email/change/set',
    desktopToken: '/api/auth/desktop-token',
    friendsList: '/api/v1/friends',
    friendsRequestsSend: '/api/v1/friends/requests',
    friendsRequestsIncoming: '/api/v1/friends/requests/incoming',
    friendsRequestsOutgoing: '/api/v1/friends/requests/outgoing',
    friendsRequestsAccept: '/api/v1/friends/requests/accept',
    friendsRequestsReject: '/api/v1/friends/requests/reject',
    friendsRemove: '/api/v1/friends/remove',
    friendsBlock: '/api/v1/friends/block',
    friendsSearch: (query, limit = 20) => `/api/v1/friends/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    friendsStatus: (userId) => `/api/v1/friends/status/${userId}`,
    chatList: '/api/v1/chat/chats',
    chatCreate: '/api/v1/chat/create',
    chatMembers: (chatId) => `/api/v1/chat/${chatId}/members`,
    chatAddMembers: (chatId) => `/api/v1/chat/${chatId}/members`,
    chatRemoveMembers: (chatId) => `/api/v1/chat/${chatId}/members`,
    chatLeave: (chatId) => `/api/v1/chat/${chatId}/leave`,
    chatMemberRole: (chatId, userId) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/role`,
    chatMemberRestrictions: (chatId, userId) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/restrictions`,
    chatMemberAdminRights: (chatId, userId) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/admin-rights`,
    chatUpdateGroup: (chatId) => `/api/v1/chat/${chatId}/group`,
    chatGroupSettings: (chatId) => `/api/v1/chat/${chatId}/group/settings`,
    chatGroupPermissions: (chatId) => `/api/v1/chat/${chatId}/group/permissions`,
    chatInvites: (chatId) => `/api/v1/chat/${chatId}/invites`,
    chatInviteUpdate: (chatId, inviteId) => `/api/v1/chat/${chatId}/invites/${inviteId}`,
    chatInviteRevoke: (chatId, inviteId) => `/api/v1/chat/${chatId}/invites/${inviteId}/revoke`,
    chatJoinByInvite: (inviteCode) => `/api/v1/chat/join/${encodeURIComponent(inviteCode)}`,
    chatJoinRequests: (chatId, status, before, limit = 100) => {
        const query = new URLSearchParams();
        query.set('limit', String(limit));
        if (status) {
            query.set('status', status);
        }
        if (before && before > 0) {
            query.set('before', String(before));
        }
        return `/api/v1/chat/${chatId}/join-requests?${query.toString()}`;
    },
    chatJoinRequestApprove: (chatId, requestId) => `/api/v1/chat/${chatId}/join-requests/${requestId}/approve`,
    chatJoinRequestDecline: (chatId, requestId) => `/api/v1/chat/${chatId}/join-requests/${requestId}/decline`,
    chatTopics: (chatId, includeDeleted) => `/api/v1/chat/${chatId}/topics${includeDeleted ? '?includeDeleted=true' : ''}`,
    chatTopicUpdate: (chatId, topicId) => `/api/v1/chat/${chatId}/topics/${topicId}`,
    chatMessageReactions: (chatId, messageId) => `/api/v1/chat/${chatId}/messages/${messageId}/reactions`,
    chatToggleReaction: (chatId, messageId) => `/api/v1/chat/${chatId}/messages/${messageId}/reactions/toggle`,
    chatCreatePoll: (chatId) => `/api/v1/chat/${chatId}/polls`,
    chatPoll: (chatId, pollId) => `/api/v1/chat/${chatId}/polls/${pollId}`,
    chatPollVoters: (chatId, pollId) => `/api/v1/chat/${chatId}/polls/${pollId}/voters`,
    chatPollByMessage: (chatId, messageId) => `/api/v1/chat/${chatId}/polls/by-message/${messageId}`,
    chatPollVote: (chatId, pollId) => `/api/v1/chat/${chatId}/polls/${pollId}/vote`,
    chatPollClose: (chatId, pollId) => `/api/v1/chat/${chatId}/polls/${pollId}/close`,
    chatPinMessage: (chatId, messageId) => `/api/v1/chat/${chatId}/pin/${messageId}`,
    chatUnpinMessage: (chatId) => `/api/v1/chat/${chatId}/unpin`,
    chatMedia: (chatId, before, limit = 30) => `/api/v1/chat/${chatId}/media${before ? `?before=${before}&limit=${limit}` : `?limit=${limit}`}`,
    chatAdminLog: (chatId, before, limit = 40, filters) => {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (typeof before === 'number' && Number.isFinite(before) && before > 0) {
            params.set('before', String(before));
        }
        if (filters?.actorUserId) {
            params.set('actorUserId', filters.actorUserId);
        }
        if (filters?.targetUserId) {
            params.set('targetUserId', filters.targetUserId);
        }
        if (filters?.eventType) {
            params.set('eventType', filters.eventType);
        }
        return `/api/v1/chat/${chatId}/admin-log?${params.toString()}`;
    },
    chatDelete: (chatId) => `/api/v1/chat/${chatId}/delete`,
    chatMessages: (chatId, before, limit = 50, after, topicId) => {
        const query = new URLSearchParams();
        query.set('limit', String(limit));
        if (before && before > 0) {
            query.set('before', String(before));
        }
        if (after && after > 0) {
            query.set('after', String(after));
        }
        if (topicId && topicId > 0) {
            query.set('topicId', String(topicId));
        }
        return `/api/v1/chat/${chatId}/messages?${query.toString()}`;
    },
    chatLinks: (chatId, before, limit = 24) => `/api/v1/chat/${chatId}/links${before ? `?before=${before}&limit=${limit}` : `?limit=${limit}`}`,
    chatLinkPreview: (url) => `/api/v1/chat/link-preview?url=${encodeURIComponent(url)}`,
    chatSend: '/api/v1/chat/send',
    chatUpload: '/api/v1/chat/upload',
    chatRead: '/api/v1/chat/read',
    chatTyping: '/api/v1/chat/typing',
    chatPresence: (userId) => `/api/v1/chat/presence/${userId}`,
    chatMessageEdit: (messageId) => `/api/v1/chat/message/${messageId}/edit`,
    chatMessageDelete: (messageId) => `/api/v1/chat/message/${messageId}/delete`,
    chatWsTicket: '/api/v1/chat/ws-ticket',
    chatKeySave: '/api/v1/chat/chatkey/save',
    chatKeyGet: (chatId) => `/api/v1/chat/chatkey/${chatId}`,
    chatKeyGetVersion: (chatId, version) => `/api/v1/chat/chatkey/${chatId}/version/${version}`,
};
