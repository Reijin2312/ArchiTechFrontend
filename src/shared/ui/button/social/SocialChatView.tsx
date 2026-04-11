import { useEffect, useRef } from 'react';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessages } from './chat/ChatMessages';
import { ChatComposer } from './chat/ChatComposer';
import type { SocialFloatingModel } from './useSocialFloatingModel';

type SocialChatViewProps = {
  model: SocialFloatingModel;
  showBackButton?: boolean;
};

type CircleRecordingOverlayProps = {
  stream: MediaStream | null;
};

function CircleRecordingOverlay({ stream }: CircleRecordingOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;
    const maybePromise = video.play();
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => undefined);
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-[min(68vw,18rem)] w-[min(68vw,18rem)] rounded-full border-4 border-indigo-400/70 shadow-2xl shadow-indigo-500/35">
          <div className="h-full w-full overflow-hidden rounded-full bg-slate-900">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-full w-full object-cover scale-x-[-1]"
            />
          </div>
          <div className="absolute inset-0 rounded-full ring-1 ring-white/15" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            REC
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialChatView({ model, showBackButton = true }: SocialChatViewProps) {
  const { selectedChat, chats, friends, isRecordingCircle, recordingCircleStream } = model;

    if (selectedChat == null) {
      return (
        <div className="p-4 text-center text-sm text-slate-400">
          Выберите собеседника из списка друзей чтобы начать чат.
        </div>
      );
    }
    const chat = chats.find(c => c.chatId === selectedChat);
    const isPrivateChat = chat?.chatType === 'PRIVATE';
    const friend = isPrivateChat
      ? friends.find(f => f.userId === chat?.participantId)
      : undefined;
    const displayName =
      chat?.chatType === 'GROUP'
        ? chat.title?.trim() || `Group #${chat.chatId}`
        : friend?.displayName || friend?.username || chat?.participantId?.slice(0, 8) || 'User';

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        model={model}
        selectedChat={selectedChat}
        chat={chat}
        friend={friend}
        displayName={displayName}
        showBackButton={showBackButton}
      />
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <ChatMessages model={model} />
        {isRecordingCircle && <CircleRecordingOverlay stream={recordingCircleStream} />}
      </div>
      <ChatComposer model={model} />
    </div>
  );
}
