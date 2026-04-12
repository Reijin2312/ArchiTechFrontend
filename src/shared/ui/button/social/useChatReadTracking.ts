import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatMessage } from '@/shared/api/types';

type ChatReadTrackingContext = {
  selectedChatRef: MutableRefObject<number | null>;
  selectedChat: number | null;
  userRef: MutableRefObject<any>;
  user: any;
  isOpenRef: MutableRefObject<boolean>;
  activeTab: string;
  messages: ChatMessage[];
  lastActivityTime: number;
  setLastActivityTime: Dispatch<SetStateAction<number>>;
  markChatRead: (chatId: number, lastId: number) => Promise<void>;
};

const READ_IDLE_TIMEOUT_MS = 60_000;
const MIN_VISIBLE_HEIGHT_PX = 1;

const toMessageDomId = (messageId: number | string) =>
  `chat-message-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const resolveScrollContainerForMessageElement = (messageEl: HTMLElement): HTMLElement | null => {
  const tgScroll = messageEl.closest('.tg-scroll');
  if (tgScroll instanceof HTMLElement) {
    return tgScroll;
  }

  let current: HTMLElement | null = messageEl.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const scrollableY = style.overflowY === 'auto' || style.overflowY === 'scroll';
    if (scrollableY && current.scrollHeight > current.clientHeight + 2) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
};

type VisibleBounds = {
  top: number;
  bottom: number;
};

const getEffectiveVisibleBoundsInContainer = (scrollContainer: HTMLElement): VisibleBounds => {
  const containerRect = scrollContainer.getBoundingClientRect();
  let visibleBottom = containerRect.bottom;

  const composerElements = document.querySelectorAll<HTMLElement>('[data-chat-composer-container="true"]');
  composerElements.forEach((composerElement) => {
    const composerRect = composerElement.getBoundingClientRect();
    const intersectsHorizontally =
      composerRect.right > containerRect.left && composerRect.left < containerRect.right;
    const intersectsVertically =
      composerRect.bottom > containerRect.top && composerRect.top < containerRect.bottom;
    if (!intersectsHorizontally || !intersectsVertically) {
      return;
    }

    // Composer overlays the message list in page mode; do not treat this occluded area as visible.
    if (composerRect.top < visibleBottom) {
      visibleBottom = Math.max(containerRect.top, composerRect.top);
    }
  });

  return {
    top: containerRect.top,
    bottom: visibleBottom,
  };
};

const getVisibleHeightInViewport = (
  messageEl: HTMLElement,
  containerBoundsCache?: WeakMap<HTMLElement, VisibleBounds>,
): number => {
  const scrollContainer = resolveScrollContainerForMessageElement(messageEl);
  if (!scrollContainer) {
    const rect = messageEl.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    return Math.max(0, visibleBottom - visibleTop);
  }

  const messageRect = messageEl.getBoundingClientRect();
  let bounds = containerBoundsCache?.get(scrollContainer);
  if (!bounds) {
    bounds = getEffectiveVisibleBoundsInContainer(scrollContainer);
    containerBoundsCache?.set(scrollContainer, bounds);
  }
  const visibleTop = Math.max(messageRect.top, bounds.top);
  const visibleBottom = Math.min(messageRect.bottom, bounds.bottom);
  return Math.max(0, visibleBottom - visibleTop);
};

const resolveMessageElement = (messageId: number): HTMLElement | null => {
  const byData = document.querySelector<HTMLElement>(`.message-item[data-message-id="${messageId}"]`);
  if (byData) {
    return byData;
  }
  return document.getElementById(toMessageDomId(messageId));
};

export function useChatReadTracking(ctx: ChatReadTrackingContext) {
  const {
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
  } = ctx;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedMessageIdsRef = useRef<Set<string>>(new Set());
  const markChatReadRef = useRef(markChatRead);
  const lastRequestedReadByChatRef = useRef<Map<number, { lastId: number; at: number }>>(new Map());
  const activityTimestampRef = useRef(lastActivityTime);
  const activeTabRef = useRef(activeTab);
  const messagesRef = useRef(messages);
  const scanTimerRef = useRef<number | null>(null);
  const extraScanTimersRef = useRef<Set<number>>(new Set());
  const periodicScanIntervalRef = useRef<number | null>(null);

  const disconnectObserver = () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    observedMessageIdsRef.current.clear();
  };

  const getReadTrackingBlockReason = (): string | null => {
    if (!selectedChatRef.current) {
      return 'no_selected_chat';
    }
    if (!userRef.current?.id) {
      return 'no_user';
    }
    if (!isOpenRef.current) {
      return 'messenger_closed';
    }
    if (activeTabRef.current !== 'chat') {
      return 'active_tab_not_chat';
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return 'document_hidden';
    }
    const idleMs = Date.now() - activityTimestampRef.current;
    if (idleMs > READ_IDLE_TIMEOUT_MS) {
      return `inactive_${idleMs}`;
    }
    return null;
  };

  const isReadTrackingAllowed = () => getReadTrackingBlockReason() === null;

  const requestMarkRead = (chatId: number, lastId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0 || !Number.isFinite(lastId) || lastId <= 0) {
      return;
    }

    const previous = lastRequestedReadByChatRef.current.get(chatId);
    if (previous && lastId <= previous.lastId) {
      return;
    }

    lastRequestedReadByChatRef.current.set(chatId, { lastId, at: Date.now() });
    markChatReadRef.current(chatId, lastId).catch(() => {
      const current = lastRequestedReadByChatRef.current.get(chatId);
      if (current && current.lastId === lastId) {
        lastRequestedReadByChatRef.current.delete(chatId);
      }
    });
  };

  const markVisibleUnreadIncomingInViewport = (source: string) => {
    void source;
    const activeChatId = selectedChatRef.current;
    const currentUserId = userRef.current?.id;
    if (!activeChatId || !currentUserId || !isReadTrackingAllowed()) {
      return;
    }

    const incomingMessageIds: number[] = [];
    for (const message of messagesRef.current) {
      if (typeof message.messageId !== 'number') {
        continue;
      }
      if (message.senderId === currentUserId) {
        continue;
      }
      incomingMessageIds.push(message.messageId);
    }

    if (incomingMessageIds.length === 0) {
      return;
    }

    const containerBoundsCache = new WeakMap<HTMLElement, VisibleBounds>();
    let lastVisibleUnreadIncomingMessageId = 0;
    incomingMessageIds.forEach((messageId) => {
      const messageEl = resolveMessageElement(messageId);
      if (!messageEl) {
        return;
      }

      const visibleHeight = getVisibleHeightInViewport(messageEl, containerBoundsCache);
      if (visibleHeight < MIN_VISIBLE_HEIGHT_PX) {
        return;
      }

      if (messageId > lastVisibleUnreadIncomingMessageId) {
        lastVisibleUnreadIncomingMessageId = messageId;
      }
    });

    if (lastVisibleUnreadIncomingMessageId > 0) {
      requestMarkRead(activeChatId, lastVisibleUnreadIncomingMessageId);
    }
  };

  const scheduleVisibleUnreadScan = (delayMs: number, source: string, replaceExisting = true) => {
    if (replaceExisting && scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
    }

    const timerId = window.setTimeout(() => {
      if (replaceExisting) {
        scanTimerRef.current = null;
      } else {
        extraScanTimersRef.current.delete(timerId);
      }
      markVisibleUnreadIncomingInViewport(`timer:${source}`);
    }, delayMs);

    if (replaceExisting) {
      scanTimerRef.current = timerId;
      return;
    }
    extraScanTimersRef.current.add(timerId);
  };

  useEffect(() => {
    markChatReadRef.current = markChatRead;
  }, [markChatRead]);

  useEffect(() => {
    activityTimestampRef.current = lastActivityTime;
  }, [lastActivityTime]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const touchActivity = (force = false) => {
      const now = Date.now();
      if (!force && now - activityTimestampRef.current < 500) {
        return false;
      }
      activityTimestampRef.current = now;
      setLastActivityTime(now);
      return true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        touchActivity(true);
        scheduleVisibleUnreadScan(120, 'visibilitychange');
        scheduleVisibleUnreadScan(420, 'visibilitychange_settle_1', false);
        scheduleVisibleUnreadScan(1100, 'visibilitychange_settle_2', false);
        return;
      }

      disconnectObserver();
    };

    const handleWindowFocus = () => {
      touchActivity(true);
      scheduleVisibleUnreadScan(80, 'window_focus');
    };

    const handleActivity = () => {
      if (touchActivity()) {
        scheduleVisibleUnreadScan(60, 'user_activity');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handleWindowFocus);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handleWindowFocus);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, setLastActivityTime]);

  useEffect(() => {
    disconnectObserver();
    lastRequestedReadByChatRef.current.clear();
  }, [selectedChat, user?.id]);

  useEffect(() => {
    if (!selectedChat || !user || !isReadTrackingAllowed()) {
      disconnectObserver();
      return;
    }

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (!isReadTrackingAllowed()) {
            return;
          }

          const hasIntersecting = entries.some((entry) => entry.isIntersecting);
          if (!hasIntersecting) {
            return;
          }

          markVisibleUnreadIncomingInViewport('observer_callback');
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: [0, 0.01],
        },
      );
    }

    const currentUserId = user.id;
    const incomingMessageIdsForObserver: number[] = [];
    for (const message of messagesRef.current) {
      if (typeof message.messageId !== 'number') {
        continue;
      }
      if (message.senderId === currentUserId) {
        continue;
      }
      incomingMessageIdsForObserver.push(message.messageId);
    }

    incomingMessageIdsForObserver.forEach((messageId) => {
      const messageEl = resolveMessageElement(messageId);
      if (!messageEl) {
        return;
      }
      const key = String(messageId);
      if (observedMessageIdsRef.current.has(key)) {
        return;
      }
      observerRef.current?.observe(messageEl);
      observedMessageIdsRef.current.add(key);
    });

    scheduleVisibleUnreadScan(80, 'observer_setup');
  }, [selectedChat, user, messages.length, activeTab, lastActivityTime]);

  useEffect(() => {
    if (periodicScanIntervalRef.current !== null) {
      window.clearInterval(periodicScanIntervalRef.current);
      periodicScanIntervalRef.current = null;
    }

    if (!selectedChat || !user || activeTab !== 'chat' || !isOpenRef.current) {
      return;
    }

    periodicScanIntervalRef.current = window.setInterval(() => {
      markVisibleUnreadIncomingInViewport('interval');
    }, 900);

    return () => {
      if (periodicScanIntervalRef.current !== null) {
        window.clearInterval(periodicScanIntervalRef.current);
        periodicScanIntervalRef.current = null;
      }
    };
  }, [selectedChat, user, activeTab]);

  useEffect(() => {
    return () => {
      disconnectObserver();
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current);
      }
      if (extraScanTimersRef.current.size > 0) {
        extraScanTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        extraScanTimersRef.current.clear();
      }
      if (periodicScanIntervalRef.current !== null) {
        window.clearInterval(periodicScanIntervalRef.current);
      }
    };
  }, []);
}
