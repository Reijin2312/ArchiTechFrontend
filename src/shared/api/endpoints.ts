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

userByName: (u: string) => `/api/v1/users/by-name?username=${encodeURIComponent(u)}`,

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
friendsSearch: (query: string, limit = 20) => `/api/v1/friends/search?q=${encodeURIComponent(query)}&limit=${limit}`,
friendsStatus: (userId: string) => `/api/v1/friends/status/${userId}`,

  chatList: '/api/v1/chat/chats',
  chatCreate: '/api/v1/chat/create',
  chatMembers: (chatId: number) => `/api/v1/chat/${chatId}/members`,
  chatAddMembers: (chatId: number) => `/api/v1/chat/${chatId}/members`,
  chatRemoveMembers: (chatId: number) => `/api/v1/chat/${chatId}/members`,
  chatLeave: (chatId: number) => `/api/v1/chat/${chatId}/leave`,
  chatMemberRole: (chatId: number, userId: string) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/role`,
  chatMemberRestrictions: (chatId: number, userId: string) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/restrictions`,
  chatMemberAdminRights: (chatId: number, userId: string) => `/api/v1/chat/${chatId}/members/${encodeURIComponent(userId)}/admin-rights`,
  chatUpdateGroup: (chatId: number) => `/api/v1/chat/${chatId}/group`,
  chatGroupSettings: (chatId: number) => `/api/v1/chat/${chatId}/group/settings`,
  chatGroupPermissions: (chatId: number) => `/api/v1/chat/${chatId}/group/permissions`,
  chatInvites: (chatId: number) => `/api/v1/chat/${chatId}/invites`,
  chatInviteUpdate: (chatId: number, inviteId: number) => `/api/v1/chat/${chatId}/invites/${inviteId}`,
  chatInviteRevoke: (chatId: number, inviteId: number) => `/api/v1/chat/${chatId}/invites/${inviteId}/revoke`,
  chatJoinByInvite: (inviteCode: string) => `/api/v1/chat/join/${encodeURIComponent(inviteCode)}`,
  chatJoinRequests: (chatId: number, status?: string, before?: number, limit = 100) => {
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
  chatJoinRequestApprove: (chatId: number, requestId: number) => `/api/v1/chat/${chatId}/join-requests/${requestId}/approve`,
  chatJoinRequestDecline: (chatId: number, requestId: number) => `/api/v1/chat/${chatId}/join-requests/${requestId}/decline`,
  chatTopics: (chatId: number, includeDeleted?: boolean) => `/api/v1/chat/${chatId}/topics${includeDeleted ? '?includeDeleted=true' : ''}`,
  chatTopicUpdate: (chatId: number, topicId: number) => `/api/v1/chat/${chatId}/topics/${topicId}`,
  chatMessageReactions: (chatId: number, messageId: number) => `/api/v1/chat/${chatId}/messages/${messageId}/reactions`,
  chatToggleReaction: (chatId: number, messageId: number) => `/api/v1/chat/${chatId}/messages/${messageId}/reactions/toggle`,
  chatCreatePoll: (chatId: number) => `/api/v1/chat/${chatId}/polls`,
  chatPoll: (chatId: number, pollId: number) => `/api/v1/chat/${chatId}/polls/${pollId}`,
  chatPollVoters: (chatId: number, pollId: number) =>
    `/api/v1/chat/${chatId}/polls/${pollId}/voters`,
  chatPollByMessage: (chatId: number, messageId: number) =>
    `/api/v1/chat/${chatId}/polls/by-message/${messageId}`,
  chatPollVote: (chatId: number, pollId: number) => `/api/v1/chat/${chatId}/polls/${pollId}/vote`,
  chatPollClose: (chatId: number, pollId: number) => `/api/v1/chat/${chatId}/polls/${pollId}/close`,
  chatPinMessage: (chatId: number, messageId: number) => `/api/v1/chat/${chatId}/pin/${messageId}`,
  chatUnpinMessage: (chatId: number) => `/api/v1/chat/${chatId}/unpin`,
  chatMedia: (chatId: number, before?: number, limit = 30) => `/api/v1/chat/${chatId}/media${before ? `?before=${before}&limit=${limit}` : `?limit=${limit}`}`,
  chatFiles: (chatId: number, before?: number, limit = 30) => `/api/v1/chat/${chatId}/files${before ? `?before=${before}&limit=${limit}` : `?limit=${limit}`}`,
  chatAdminLog: (
    chatId: number,
    before?: number,
    limit = 40,
    filters?: {
      actorUserId?: string;
      targetUserId?: string;
      eventType?: string;
    }
  ) => {
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
  chatDelete: (chatId: number) => `/api/v1/chat/${chatId}/delete`,
  chatMessages: (chatId: number, before?: number, limit = 50, after?: number, topicId?: number) => {
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
  chatLinks: (chatId: number, before?: number, limit = 24) => `/api/v1/chat/${chatId}/links${before ? `?before=${before}&limit=${limit}` : `?limit=${limit}`}`,
  chatLinkPreview: (url: string) => `/api/v1/chat/link-preview?url=${encodeURIComponent(url)}`,
  chatSend: '/api/v1/chat/send',
chatUpload: '/api/v1/chat/upload',
chatTranscribe: '/api/v1/chat/transcribe',
chatRead: '/api/v1/chat/read',
chatTyping: '/api/v1/chat/typing',
chatPresence: (userId: string) => `/api/v1/chat/presence/${userId}`,
chatMessageEdit: (messageId: number) => `/api/v1/chat/message/${messageId}/edit`,
chatMessageDelete: (messageId: number) => `/api/v1/chat/message/${messageId}/delete`,
  chatWsTicket: '/api/v1/chat/ws-ticket',
  chatKeySave: '/api/v1/chat/chatkey/save',
  chatKeyGet: (chatId: number) => `/api/v1/chat/chatkey/${chatId}`,
  chatKeyGetVersion: (chatId: number, version: number) => `/api/v1/chat/chatkey/${chatId}/version/${version}`,
} as const;
