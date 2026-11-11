import type { SocialFloatingModel } from './useSocialFloatingModel';
import { TabButton } from './TabButton';

type SocialSidebarTabsProps = {
  model: SocialFloatingModel;
  incomingCount: number;
  outgoingCount: number;
  hasNotifications: boolean;
};

export function SocialSidebarTabs({
  model,
  incomingCount,
  outgoingCount,
  hasNotifications,
}: SocialSidebarTabsProps) {
  const { activeTab, setActiveTab, chats, friends } = model;

  return (

    <div className="flex gap-1 px-2 py-2 border-b border-slate-800 [.at-secondary-skin_&]:border-[rgba(239,232,218,0.22)] bg-slate-900/40 [.at-secondary-skin_&]:bg-[rgba(33,35,31,0.91)]">
      <TabButton
        active={activeTab === 'chat'}
        onClick={() => setActiveTab('chat')}
        label="Чат"
        count={chats.length}
      />
      <TabButton
        active={activeTab === 'friends'}
        onClick={() => setActiveTab('friends')}
        label="Друзья"
        count={friends.length}
      />
      <TabButton
        active={activeTab === 'requests'}
        onClick={() => setActiveTab('requests')}
        label="Заявки"
        count={incomingCount + outgoingCount}
        badge={hasNotifications}
      />
      <TabButton
        active={activeTab === 'search'}
        onClick={() => setActiveTab('search')}
        label="Поиск"
      />
    </div>
  );
}
