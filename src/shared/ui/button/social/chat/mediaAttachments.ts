import type { ChatMessage } from '@/shared/api/types';

export type ChatMediaAttachment = {
  imagePath: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  isImage?: boolean;
  imageKeyVersion?: number;
  imageEncryptionIv?: string;
};

export const getMessageMediaAttachments = (
  message: ChatMessage
): ChatMediaAttachment[] => {
  if (!Array.isArray(message.images)) {
    return [];
  }

  return message.images
    .map((item) => ({
      imagePath: typeof item.imagePath === 'string' ? item.imagePath : '',
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
      thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
      strippedThumbnailUrl:
        typeof item.strippedThumbnailUrl === 'string' ? item.strippedThumbnailUrl : undefined,
      width:
        typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0
          ? item.width
          : undefined,
      height:
        typeof item.height === 'number' && Number.isFinite(item.height) && item.height > 0
          ? item.height
          : undefined,
      fileName: typeof item.fileName === 'string' ? item.fileName : undefined,
      contentType: typeof item.contentType === 'string' ? item.contentType : undefined,
      sizeBytes: typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes)
        ? item.sizeBytes
        : undefined,
      isImage: typeof item.isImage === 'boolean' ? item.isImage : undefined,
      imageKeyVersion:
        typeof item.imageKeyVersion === 'number' && Number.isFinite(item.imageKeyVersion)
          ? item.imageKeyVersion
          : undefined,
      imageEncryptionIv:
        typeof item.imageEncryptionIv === 'string' ? item.imageEncryptionIv : undefined,
    }))
    .filter((item) => item.imagePath || item.imageUrl);
};
