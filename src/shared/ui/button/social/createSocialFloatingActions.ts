import { createSocialFriendActions } from './actions/createSocialFriendActions';
import { createSocialChatActions } from './actions/createSocialChatActions';
import type { SocialFloatingActions, SocialFloatingActionsContext } from './actions/types';

export function createSocialFloatingActions(
  ctx: SocialFloatingActionsContext,
): SocialFloatingActions {
  const chatActions = createSocialChatActions(ctx);
  const friendActions = createSocialFriendActions(ctx, {
    loadChats: chatActions.loadChats,
  });

  return {
    ...friendActions,
    ...chatActions,
  };
}

export type { SocialFloatingActionsContext } from './actions/types';
