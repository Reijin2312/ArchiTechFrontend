import { createSocialFriendActions } from './actions/createSocialFriendActions.js';
import { createSocialChatActions } from './actions/createSocialChatActions.js';
export function createSocialFloatingActions(ctx) {
    const chatActions = createSocialChatActions(ctx);
    const friendActions = createSocialFriendActions(ctx, {
        loadChats: chatActions.loadChats,
    });
    return {
        ...friendActions,
        ...chatActions,
    };
}
