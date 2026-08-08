export const getMessageMediaAttachments = (message) => {
    if (!Array.isArray(message.images)) {
        return [];
    }
    const hasRenderableAttachmentPayload = (item) => !!(item.imagePath ||
        item.imageUrl ||
        item.thumbnailUrl ||
        item.strippedThumbnailUrl ||
        item.fileName ||
        item.contentType ||
        typeof item.isImage === 'boolean' ||
        (typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes) && item.sizeBytes > 0) ||
        (typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0) ||
        (typeof item.height === 'number' && Number.isFinite(item.height) && item.height > 0));
    return message.images
        .map((item) => ({
        imagePath: typeof item.imagePath === 'string' ? item.imagePath : '',
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
        strippedThumbnailUrl: typeof item.strippedThumbnailUrl === 'string' ? item.strippedThumbnailUrl : undefined,
        width: typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0
            ? item.width
            : undefined,
        height: typeof item.height === 'number' && Number.isFinite(item.height) && item.height > 0
            ? item.height
            : undefined,
        fileName: typeof item.fileName === 'string' ? item.fileName : undefined,
        contentType: typeof item.contentType === 'string' ? item.contentType : undefined,
        sizeBytes: typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes)
            ? item.sizeBytes
            : undefined,
        isImage: typeof item.isImage === 'boolean' ? item.isImage : undefined,
        imageKeyVersion: typeof item.imageKeyVersion === 'number' && Number.isFinite(item.imageKeyVersion)
            ? item.imageKeyVersion
            : undefined,
        imageEncryptionIv: typeof item.imageEncryptionIv === 'string' ? item.imageEncryptionIv : undefined,
    }))
        .filter(hasRenderableAttachmentPayload);
};
