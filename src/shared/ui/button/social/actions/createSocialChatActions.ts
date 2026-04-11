import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { logger } from '@/shared/lib/logger';
import { buildMessageTextAndEntities } from '@/shared/utils/chatTextEntities';
import type {
  ChatListResponse,
  ChatMessage,
  ChatMessagesResponse,
  CreateChatResponse,
  SendMessageResponse,
  UploadImageResponse,
} from '@/shared/api/types';
import type { SocialChatActions, SocialFloatingActionsContext } from './types';

export function createSocialChatActions(ctx: SocialFloatingActionsContext): SocialChatActions {
  const {
    user,
    selectedChat,
    chats,
    messages,
    messageInput,
    attachedImages,
    editingMessage,
    replyingTo,
    lastActivityTime,
    markReadTimeoutRef,
    sendInFlightRef,
    sendCooldownUntilRef,
    lastProtocolSeqRef,
    lastProtocolMsgIdRef,
    typingThrottleRef,
    isFirstLoadRef,
    messagesEndRef,
    setMessages,
    setChats,
    setSelectedChat,
    setActiveTab,
    setReplyingTo,
    setMessageInput,
    setAttachedImages,
    setEditingMessage,
    setUploadingImages,
    scrollToBottom,
  } = ctx;

  const nextProtocolEnvelope = () => {
    const timestamp = Date.now();
    const nextSeqNo = Math.max(timestamp, lastProtocolSeqRef.current + 1);
    lastProtocolSeqRef.current = nextSeqNo;

    const randomSuffix = Math.floor(Math.random() * 1024);
    const candidateMsgId = timestamp * 1024 + randomSuffix;
    const nextMsgId = Math.max(candidateMsgId, lastProtocolMsgIdRef.current + 1);
    lastProtocolMsgIdRef.current = nextMsgId;

    return { msgId: nextMsgId, seqNo: nextSeqNo, timestamp };
  };

  const MAX_ATTACHMENTS = 9;

  const isImageAttachment = (attachment: {
    isImage?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'voice' || attachment.forcedMessageType === 'circle') {
      return false;
    }
    if (attachment.isImage !== undefined) {
      return attachment.isImage;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('image/');
  };

  const isAudioAttachment = (attachment: {
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'voice') {
      return true;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('audio/');
  };

  const isVideoAttachment = (attachment: {
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'circle') {
      return true;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('video/');
  };

  const resolveSingleAttachmentMessageType = (
    attachment: {
      isImage?: boolean;
      forcedMessageType?: 'voice' | 'circle';
      contentType?: string;
      file?: File;
    }
  ): 'image' | 'file' | 'voice' | 'circle' => {
    if (attachment.forcedMessageType) {
      return attachment.forcedMessageType;
    }
    if (isImageAttachment(attachment)) {
      return 'image';
    }
    if (isAudioAttachment(attachment)) {
      return 'voice';
    }
    if (isVideoAttachment(attachment)) {
      return 'circle';
    }
    return 'file';
  };

  const resolveAttachmentMessageType = (
    attachments: Array<{
      isImage?: boolean;
      forcedMessageType?: 'voice' | 'circle';
      contentType?: string;
      file?: File;
    }>
  ): 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' => {
    if (attachments.length === 1) {
      return resolveSingleAttachmentMessageType(attachments[0]);
    }
    const allImages = attachments.length > 0 && attachments.every(isImageAttachment);
    if (allImages) {
      return 'images';
    }
    return 'files';
  };

  const sendTypingState = async (chatId: number, typing: boolean, force = false) => {
    if (!chatId) return;

    const now = Date.now();
    const previous = typingThrottleRef.current.get(chatId);
    const throttleMs = typing ? 1200 : 300;

    if (
      !force &&
      previous &&
      previous.lastState === typing &&
      now - previous.lastSentAt < throttleMs
    ) {
      return;
    }

    try {
      await http.post(endpoints.chatTyping, {
        chat_id: chatId,
        typing,
      });
      typingThrottleRef.current.set(chatId, { lastSentAt: Date.now(), lastState: typing });
    } catch (err) {
      logger.warn('Failed to send typing state', err);
    }
  };

  const markChatRead = async (chatId: number, lastId: number) => {
    const inactiveTime = Date.now() - lastActivityTime;
    if (inactiveTime > 300000) {
      console.log('⚠️ User inactive, not marking as read');
      return;
    }
    
    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }
    
    markReadTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('✅ Marking message', lastId, 'in chat', chatId, 'as read');
        await http.post(endpoints.chatRead, { chatId, lastReadMessageId: lastId });
        
        setMessages(prev => prev.map(m => 
          typeof m.messageId === 'number' && m.messageId <= lastId && m.senderId !== user?.id
            ? { ...m, isRead: true }
            : m
        ));
      } catch (err) {
        logger.warn('Failed to mark chat read', err);
      }
    }, 500);
  };

  const loadChats = async () => {
    try {
      const { data } = await http.get<ChatListResponse>(endpoints.chatList);
      
      const chatsWithDecrypted = await Promise.all(
        data.chats.map(async (chat) => {
          if (chat.lastMessage && chat.lastMessage.content) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                content: chat.lastMessage.content,
              },
            };
          }
          return chat;
        })
      );

      setChats(chatsWithDecrypted);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const loadMessages = async (chatId: number, append = false) => {
    try {
      const { data } = await http.get<ChatMessagesResponse>(endpoints.chatMessages(chatId));
      
      const messagesWithContent = data.messages;
      
      if (!append) {
        setMessages(messagesWithContent);
      } else {
        setMessages(prev => [...prev, ...messagesWithContent]);
      }
    
      if (!append) {
        isFirstLoadRef.current = true;
        setTimeout(() => {
          console.log('🔄 Attempting scroll to bottom, ref exists:', !!messagesEndRef.current);
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            console.log('✅ Scrolled to bottom');
          } else {
            console.warn('⚠️ messagesEndRef is null, retrying...');
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                console.log('✅ Scrolled to bottom (retry)');
              }
            }, 100);
          }
          isFirstLoadRef.current = false;
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };
    
    const findPrivateChatByParticipant = (participantId: string) =>
    chats.find((chat) => chat.chatType === 'PRIVATE' && chat.participantId === participantId);

  const openChatWith = async (participantId: string) => {
    try {
      const existingChat = findPrivateChatByParticipant(participantId);
      if (existingChat) {
        setActiveTab('chat');
        setSelectedChat(existingChat.chatId);
        return;
      }

      const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId,
      });

      await loadChats();
      setActiveTab('chat');
      setSelectedChat(data.chatId);
    } catch (e) {
      console.error('Failed to open chat:', e);
      alert(e instanceof Error ? e.message : 'Unable to open chat');
    }
  };

  const createGroupChat = async (payload: {
    title: string;
    participantIds?: string[];
    avatarPath?: string;
  }) => {
    const title = payload.title.trim();
    if (!title) {
      throw new Error('Group title is required');
    }

    const uniqueParticipantIds = Array.from(
      new Set((payload.participantIds || []).filter((id) => id && id.trim().length > 0))
    );

    const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
      type: 'GROUP',
      title,
      avatarPath: payload.avatarPath,
      participantIds: uniqueParticipantIds,
    });

    await loadChats();
    setActiveTab('chat');
    setSelectedChat(data.chatId);
  };

  const sendMessageToChat = async (
    chatId: number,
    message: string,
    messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' = 'text',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number
  ) => {
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    const parsed = buildMessageTextAndEntities(message);
    const isVoiceOrCircle = messageType === 'voice' || messageType === 'circle';
    const normalizedContent = isVoiceOrCircle ? '' : parsed.content;
    const normalizedEntities =
      !isVoiceOrCircle && parsed.entities.length > 0 ? parsed.entities : undefined;

    try {
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: normalizedContent,
        entities: normalizedEntities,
        messageType,
        imagePath,
        createdAt,
        replyToId: replyingTo?.messageId,
        replyToMessage: replyingTo || undefined,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setTimeout(() => scrollToBottom(), 0);

      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: chatId,
        content_type: messageType,
        content: normalizedContent,
        entities: normalizedEntities,
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: imagePath,
        image_encrypted: imageEncrypted,
        image_encryption_iv: imageEncryptionIv,
        image_key_version: imageKeyVersion,
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.localId === localId || m.messageId === localId) {
            return {
              ...m,
              messageId: data.messageId,
              status: m.isRead ? 'read' : 'sent',
              content: m.content || normalizedContent,
              entities: m.entities ?? normalizedEntities,
              imageUrl: data.imageUrl ?? m.imageUrl,
              imagePath: imagePath ?? m.imagePath,
              isRead: false,
            };
          }
          return m;
        })
      );

      setChats((prev) =>
        prev.map((c) =>
          c.chatId === chatId
            ? {
                ...c,
                lastMessage: {
                  messageId: data.messageId,
                  senderId: user?.id || '',
                  content: normalizedContent,
                  entities: normalizedEntities,
                  messageType,
                  imagePath,
                  imageUrl: data.imageUrl,
                  createdAt,
                  isRead: false,
                  replyToId: replyingTo?.messageId,
                  replyToMessage: replyingTo || undefined,
                } as ChatMessage,
              }
            : c
        )
      );

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send message', e);
      setMessages((prev) => prev.filter((m) => m.localId !== localId && m.messageId !== localId));
      alert(e instanceof Error ? e.message : '������ �������� ���������');
    }
  };

  const sendMessageToUser = async (
    recipientId: string,
    message: string,
    messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' = 'text',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number
  ) => {
    let chat = findPrivateChatByParticipant(recipientId);
    if (!chat) {
      const { data: createData } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId: recipientId,
      });

      chat = {
        chatId: createData.chatId,
        chatType: createData.chatType || 'PRIVATE',
        participantId: createData.participantId || recipientId,
        title: createData.title,
        avatarPath: createData.avatarPath,
        memberCount: createData.memberCount,
        participantIds: createData.participantIds,
        lastMessage: undefined,
        createdAt: new Date().toISOString(),
      };
      setChats((prev) => [chat!, ...prev]);
      setSelectedChat(createData.chatId);
    }

    await sendMessageToChat(
      chat.chatId,
      message,
      messageType,
      imagePath,
      imageEncrypted,
      imageEncryptionIv,
      imageKeyVersion
    );
  };

  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput, attachedImagesCount: attachedImages.length });
    const draftText = messageInput;

    if (!draftText.trim() && attachedImages.length === 0) {
      console.warn('Cannot send: empty message and no attachments');
      return;
    }

    const now = Date.now();
    if (sendInFlightRef.current) {
      console.debug('Skipping duplicate send while previous request is in flight');
      return;
    }
    if (now < sendCooldownUntilRef.current) {
      console.debug('Skipping duplicate send in cooldown window');
      return;
    }

    sendInFlightRef.current = true;
    sendCooldownUntilRef.current = now + 700;

    try {
      if (editingMessage) {
        await editMessage(editingMessage.messageId, draftText);
        setMessageInput('');
        setEditingMessage(null);
        setAttachedImages([]);
      } else if (selectedChat) {

        if (attachedImages.length > 0) {
          await sendMessagesWithImages(selectedChat, draftText);
        } else {
          await sendMessageToChat(selectedChat, draftText);
        }

        setMessageInput('');
        setAttachedImages([]);
        setTimeout(() => scrollToBottom(), 100);
      }
    } finally {
      sendInFlightRef.current = false;
      if (selectedChat) {
        await sendTypingState(selectedChat, false, true);
      }
    }
  };

  // 🖼️ Отправка сообщений с прикрепленными изображениями
  const sendMessagesWithImages = async (chatId: number, textContent: string) => {
    const attachmentsToSend = attachedImages.slice(0, MAX_ATTACHMENTS);
    if (attachmentsToSend.length === 0) return;
    const tempMessageType = resolveAttachmentMessageType(attachmentsToSend);
    const isVoiceOrCircle = tempMessageType === 'voice' || tempMessageType === 'circle';
    const parsed = buildMessageTextAndEntities(textContent);
    const normalizedContent = isVoiceOrCircle ? '' : parsed.content;
    const normalizedEntities =
      !isVoiceOrCircle && parsed.entities.length > 0 ? parsed.entities : undefined;

    if (isVoiceOrCircle && attachmentsToSend.length !== 1) {
      throw new Error('Voice/circle message must contain exactly one attachment');
    }

    const localId = `local-img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tempMessage: ChatMessage = {
      localId,
      messageId: localId,
      status: 'pending',
      senderId: user?.id || '',
      content: normalizedContent,
      entities: normalizedEntities,
      messageType: tempMessageType,
      imagePath: '',
      images: attachmentsToSend.map((fileRef) => ({
        imagePath: '',
        imageUrl: fileRef.preview,
        fileName: fileRef.file.name,
        contentType: fileRef.contentType || fileRef.file.type || 'application/octet-stream',
        sizeBytes: fileRef.sizeBytes ?? fileRef.file.size,
        isImage: isImageAttachment(fileRef),
      })),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setAttachedImages([]);
    setMessageInput('');
    setTimeout(() => scrollToBottom(), 0);

    try {
      const finalChatId = chatId;
      const uploadPromises = attachmentsToSend.map((attachment, idx) => {
        return (async () => {
          const form = new FormData();
          form.append('file', attachment.file);

          const { data } = await http.post<UploadImageResponse>(
            `${endpoints.chatUpload}?chatId=${finalChatId}`,
            form,
            {
              onUploadProgress: (e: any) => {
                const progress = Math.round((e.loaded / e.total) * 100);
                setUploadingImages(prev => {
                  const next = new Map(prev);
                  next.set(`${localId}-${idx}`, { file: attachment.file, progress });
                  return next;
                });
              }
            }
          );

          setMessages(prev => prev.map(m =>
            (m.localId === localId || m.messageId === localId)
              ? {
                  ...m,
                  images: m.images?.map((img, i) =>
                    i === idx
                      ? {
                          imagePath: data.imagePath,
                          imageUrl: data.imageUrl,
                          fileName: data.fileName || attachment.file.name,
                          contentType:
                            data.contentType ||
                            attachment.file.type ||
                            'application/octet-stream',
                          sizeBytes: data.sizeBytes ?? attachment.file.size,
                          isImage: data.isImage ?? isImageAttachment(attachment),
                          imageKeyVersion: data.imageKeyVersion,
                        }
                      : img
                  ) || []
                }
              : m
          ));

          return {
            image_path: data.imagePath,
            image_url: data.imageUrl,
            image_encrypted: data.imageEncrypted,
            image_encryption_iv: data.imageEncryptionIv,
            image_key_version: data.imageKeyVersion,
            file_name: data.fileName || attachment.file.name,
            content_type: data.contentType || attachment.file.type || 'application/octet-stream',
            size_bytes: data.sizeBytes ?? attachment.file.size,
            is_image: data.isImage ?? isImageAttachment(attachment),
          };
        })();
      });

      const uploadedAttachments = await Promise.all(uploadPromises);

      setUploadingImages(prev => {
        const next = new Map(prev);
        Array.from(next.keys()).forEach(k => {
          if (k === localId || k.startsWith(`${localId}-`)) next.delete(k);
        });
        return next;
      });

      const messageType = tempMessageType;
      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();

      const messageData: any = {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp: timestamp,
        chat_id: finalChatId,
        content_type: messageType,
        content: normalizedContent,
        entities: normalizedEntities,
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: uploadedAttachments[0].image_path,
        image_encrypted: uploadedAttachments[0].image_encrypted,
        image_encryption_iv: uploadedAttachments[0].image_encryption_iv,
        image_key_version: uploadedAttachments[0].image_key_version,
        file_name: uploadedAttachments[0].file_name,
        file_content_type: uploadedAttachments[0].content_type,
        file_size_bytes: uploadedAttachments[0].size_bytes,
        file_is_image: uploadedAttachments[0].is_image,
      };

      if (uploadedAttachments.length > 1) {
        messageData.images = uploadedAttachments.map(item => ({
          image_path: item.image_path,
          image_encrypted: item.image_encrypted,
          image_encryption_iv: item.image_encryption_iv,
          image_key_version: item.image_key_version,
          file_name: item.file_name,
          content_type: item.content_type,
          size_bytes: item.size_bytes,
          is_image: item.is_image,
        }));
      }

      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, messageData);

      setMessages(prev => prev.map(m => 
        (m.localId === localId || m.messageId === localId)
          ? {
              ...m,
              messageId: data.messageId,
              status: 'sent',
              senderId: user?.id || '',
              content: normalizedContent,
              entities: m.entities ?? normalizedEntities,
              messageType,
              imagePath: uploadedAttachments[0].image_path,
              imageUrl: data.imageUrl ?? m.imageUrl,
              images: uploadedAttachments.map((item, index) => {
                const fromResponse = data.imageUrls?.[index];
                const singleAttachmentUrl = uploadedAttachments.length === 1 ? data.imageUrl : undefined;
                return {
                  imagePath: fromResponse?.imagePath || item.image_path,
                  imageUrl:
                    fromResponse?.imageUrl ||
                    singleAttachmentUrl ||
                    item.image_url ||
                    `/media/${item.image_path}`,
                  fileName: item.file_name,
                  contentType: item.content_type,
                  sizeBytes: item.size_bytes,
                  isImage: item.is_image,
                  imageKeyVersion: item.image_key_version,
                };
              }),
              createdAt: new Date().toISOString(),
              isRead: false,
            }
          : m
      ));

      setChats(prev => prev.map(c =>
        c.chatId === finalChatId
          ? { ...c, lastMessage: {
              localId,
              messageId: data.messageId,
              senderId: user?.id || '',
              content: normalizedContent,
              entities: normalizedEntities,
              messageType,
              imagePath: uploadedAttachments[0].image_path,
              createdAt: new Date().toISOString(),
              status: 'sent',
            } as ChatMessage }
          : c
      ));

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send multi-attachment message:', e);
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
      setUploadingImages(prev => {
        const next = new Map(prev);
        Array.from(next.keys()).forEach(k => {
          if (k === localId || k.startsWith(`${localId}-`)) next.delete(k);
        });
        return next;
      });
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };

  const attachImage = async (
    file: File,
    options?: { forcedMessageType?: 'voice' | 'circle'; preview?: string; sendAsFile?: boolean }
  ) => {
    if (!selectedChat) return;
    
    const id = `attached-${Date.now()}-${Math.random()}`;
    const fileType = (file.type || '').toLowerCase();
    const forcedMessageType = options?.forcedMessageType;
    const isRawImage = fileType.startsWith('image/');
    const isImage = !forcedMessageType && !options?.sendAsFile && isRawImage;
    let preview: string | undefined = options?.preview;

    if (!preview && isRawImage) {
      preview = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    
    const nextAttachment = {
      id,
      file,
      preview,
      isImage,
      forcedMessageType,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploading: false
    };

    setAttachedImages(prev => forcedMessageType ? [nextAttachment] : [...prev, nextAttachment]);
    if (forcedMessageType) {
      setMessageInput('');
    }
  };

  // 🖼️ Удаление прикрепленного изображения
  const removeAttachedImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const editMessage = async (messageId: number | string, newContent: string) => {
    if (!selectedChat || typeof messageId === 'string') return;
    
    try {
      const parsed = buildMessageTextAndEntities(newContent);
      const normalizedContent = parsed.content;
      const normalizedEntities = parsed.entities.length > 0 ? parsed.entities : undefined;
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) return;

      await http.put(endpoints.chatMessageEdit(messageId), {
        content: normalizedContent,
        entities: normalizedEntities,
      });

      setMessages(prev => prev.map(m => 
        m.messageId === messageId 
          ? { ...m, content: normalizedContent, entities: normalizedEntities, edited: true }
          : m
      ));
    } catch (e) {
      console.error('Failed to edit message', e);
      alert(e instanceof Error ? e.message : 'Ошибка редактирования сообщения');
    }
  };

  const deleteMessage = async (messageId: number | string) => {
    if (!selectedChat || typeof messageId === 'string') return;
    
    if (!confirm('Удалить сообщение?')) return;
    
    try {
      await http.delete(endpoints.chatMessageDelete(messageId));
      setMessages(prev => prev.filter(m => m.messageId !== messageId));
      
      const chat = chats.find(c => c.chatId === selectedChat);
      if (chat?.lastMessage?.messageId === messageId) {
        const remainingMessages = messages.filter(m => m.messageId !== messageId);
        const newLastMessage = remainingMessages[remainingMessages.length - 1];
        setChats(prev => prev.map(c => 
          c.chatId === selectedChat 
            ? { ...c, lastMessage: newLastMessage }
            : c
        ));
      }
    } catch (e) {
      console.error('Failed to delete message', e);
      alert(e instanceof Error ? e.message : 'Ошибка удаления сообщения');
    }
  };

  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message', err);
    });
  };

  const uploadImage = async (file: File) => {
    if (!selectedChat || !file) return;
    const chat = chats.find(c => c.chatId === selectedChat);
    if (!chat) return;
    const isImage = (file.type || '').toLowerCase().startsWith('image/');
    const messageType = isImage
      ? 'image'
      : (file.type || '').toLowerCase().startsWith('audio/')
        ? 'voice'
        : (file.type || '').toLowerCase().startsWith('video/')
          ? 'circle'
          : 'file';
    
    const localId = `local-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    const fallbackContentType = file.type || 'application/octet-stream';
    const localPreviewUrl =
      messageType === 'voice' || messageType === 'circle'
        ? URL.createObjectURL(file)
        : undefined;
    
    try {
      // Создаем временное сообщение с индикатором загрузки
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: '',
        messageType,
        imageUrl: localPreviewUrl,
        images: [{
          imagePath: '',
          imageUrl: localPreviewUrl,
          fileName: file.name,
          contentType: fallbackContentType,
          sizeBytes: file.size,
          isImage,
        }],
        createdAt,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setUploadingImages(prev => new Map(prev).set(localId, { progress: 0, file }));
      
      setTimeout(() => scrollToBottom(), 0);
      
      const form = new FormData();
      form.append('file', file);
      
      console.log('📤 Uploading attachment:', {
        chatId: selectedChat,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: `${endpoints.chatUpload}?chatId=${selectedChat}`
      });
      
      const { data } = await http.post<UploadImageResponse>(
        `${endpoints.chatUpload}?chatId=${selectedChat}`, 
        form,
        {
          onUploadProgress: (e: any) => {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadingImages(prev => {
              const next = new Map(prev);
              next.set(localId, { file, progress });
              return next;
            });
          }
        }
      );
      
      console.log('✅ Attachment uploaded successfully:', data);
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.set(localId, { file, progress: 100 });
        return next;
      });
      
      // Отправляем реальное сообщение с изображением, остаемся на том же объекте
      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();
      
      const { data: sendRes } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: chat!.chatId,
        content_type: messageType,
        content: '',
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: data.imagePath,
        image_encrypted: data.imageEncrypted,
        image_encryption_iv: data.imageEncryptionIv,
        image_key_version: data.imageKeyVersion,
        file_name: data.fileName || file.name,
        file_content_type: data.contentType || file.type || 'application/octet-stream',
        file_size_bytes: data.sizeBytes ?? file.size,
        file_is_image: data.isImage ?? isImage,
      });

      const resolvedRemoteUrl = sendRes.imageUrl ?? data.imageUrl;
      
      setMessages(prev => prev.map(m => 
        (m.localId === localId || m.messageId === localId)
          ? {
              ...m,
              messageId: sendRes.messageId,
              status: 'sent',
              imagePath: data.imagePath || m.imagePath,
              imageUrl: resolvedRemoteUrl ?? m.imageUrl,
              images: [{
                imagePath: data.imagePath || m.imagePath || '',
                imageUrl: resolvedRemoteUrl ?? m.imageUrl,
                fileName: data.fileName || file.name,
                contentType: data.contentType || fallbackContentType,
                sizeBytes: data.sizeBytes ?? file.size,
                isImage: data.isImage ?? isImage,
                imageKeyVersion: data.imageKeyVersion,
              }],
              createdAt: new Date().toISOString(),
              isRead: false,
            }
          : m
      ));

      if (localPreviewUrl && sendRes.imageUrl && sendRes.imageUrl !== localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      
      setChats(prev => prev.map(c => 
        c.chatId === chat!.chatId 
          ? { ...c, lastMessage: {
              localId,
              messageId: sendRes.messageId,
              senderId: user?.id || '',
              content: '',
              messageType,
              imagePath: data.imagePath,
              createdAt: new Date().toISOString(),
              status: 'sent',
            } as ChatMessage }
          : c
      ));
    } catch (e) {
      console.error('❌ Failed to upload attachment:', {
        error: e,
        response: (e as any).response?.data,
        status: (e as any).response?.status,
        chatId: selectedChat,
        file: file.name
      });
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      alert('Не удалось загрузить файл');
    }
  };

  return {
    markChatRead,
    loadChats,
    loadMessages,
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
    sendMessagesWithImages,
    attachImage,
    removeAttachedImage,
    editMessage,
    deleteMessage,
    copyMessageText,
    uploadImage,
  };
}

