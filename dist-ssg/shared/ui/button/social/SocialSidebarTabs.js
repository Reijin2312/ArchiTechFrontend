import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TabButton } from './TabButton.js';
export function SocialSidebarTabs({ model, incomingCount, outgoingCount, hasNotifications, }) {
    const { activeTab, setActiveTab, chats, friends } = model;
    return (_jsxs("div", { className: "flex gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900/40", children: [_jsx(TabButton, { active: activeTab === 'chat', onClick: () => setActiveTab('chat'), label: "\u0427\u0430\u0442", count: chats.length }), _jsx(TabButton, { active: activeTab === 'friends', onClick: () => setActiveTab('friends'), label: "\u0414\u0440\u0443\u0437\u044C\u044F", count: friends.length }), _jsx(TabButton, { active: activeTab === 'requests', onClick: () => setActiveTab('requests'), label: "\u0417\u0430\u044F\u0432\u043A\u0438", count: incomingCount + outgoingCount, badge: hasNotifications }), _jsx(TabButton, { active: activeTab === 'search', onClick: () => setActiveTab('search'), label: "\u041F\u043E\u0438\u0441\u043A" })] }));
}
