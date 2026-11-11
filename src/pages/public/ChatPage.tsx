import { Navigate, Link } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';
import { Seo } from '@/shared/seo/seo';
import { useSocialFloatingModel } from '@/shared/ui/button/social/useSocialFloatingModel';
import { SocialSidebarTabs } from '@/shared/ui/button/social/SocialSidebarTabs';
import { SocialSidebarContent } from '@/shared/ui/button/social/SocialSidebarContent';
import { SocialChatView } from '@/shared/ui/button/social/SocialChatView';

/** Full-size companion to the restored floating widget, powered by the same
 * authenticated chat model, existing PostgreSQL and Kafka-backed realtime transport.
 * No groups, media upload or polls: one global Minecraft chat and private DMs.
 */
export default function ChatPage() {
  const user = authStore(state => state.user);
  const model = useSocialFloatingModel({ mode: 'page' });
  if (!user) return <Navigate to="/auth/login" replace />;

  const requests = model.incomingRequests.length + model.outgoingRequests.length;
  return (
    <div className="at-secondary-skin flex h-dvh min-h-0 flex-col overflow-hidden bg-[#171916] text-[#f2efe9]">
      <Seo title="Чат — ArchiTech" description="Общий чат Minecraft-сервера и личные сообщения ArchiTech" />
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[rgba(239,232,218,.14)] bg-[#20221d] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="rounded-md p-1.5 text-sm text-[#bdab8d] transition hover:bg-[#30332b] hover:text-[#f2e5cb]"
            aria-label="Вернуться на главную">←</Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">ArchiTech · Сообщения</h1>
            <p className="text-[11px] text-[#9f9c8f]">Общий чат сервера и личные переписки</p>
          </div>
        </div>
        <Link to="/" className="rounded-lg border border-[#514a3c] px-3 py-2 text-xs font-medium text-[#ccb391] hover:bg-[#30312b]">
          На сайт
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 overflow-hidden border-x border-[rgba(239,232,218,.08)]">
        <aside className="flex min-h-0 w-[350px] shrink-0 flex-col border-r border-[rgba(239,232,218,.14)] bg-[#20221d] max-md:w-[min(45vw,280px)] max-[540px]:w-full">
          <SocialSidebarTabs
            model={model}
            incomingCount={model.incomingRequests.length}
            outgoingCount={model.outgoingRequests.length}
            hasNotifications={requests > 0}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <SocialSidebarContent model={model} forceChatList />
          </div>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 bg-[#1b1d19] max-[540px]:hidden" aria-label="Переписка">
          {model.selectedChat ? (
            <SocialChatView model={model} showBackButton={false} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <div className="mb-2 flex size-14 items-center justify-center rounded-2xl border border-[#5e503c] bg-[#2a291f] text-2xl text-[#cdb18b]">✉</div>
              <h2 className="font-semibold">Выберите чат</h2>
              <p className="max-w-md text-sm leading-6 text-[#a9a396]">
                Общий чат синхронизируется с Minecraft, а личные сообщения доступны с сайта и в игре.
              </p>
            </div>
          )}
        </section>
        {model.selectedChat ? (
          <div className="absolute inset-x-0 bottom-0 top-16 z-10 hidden min-h-0 bg-[#1b1d19] max-[540px]:block">
            <SocialChatView model={model} showBackButton />
          </div>
        ) : null}
      </main>
    </div>
  );
}
