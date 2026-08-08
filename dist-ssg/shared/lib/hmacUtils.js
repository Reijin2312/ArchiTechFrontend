import CryptoJS from 'crypto-js';
function buildHMACData(chatId, contentType, messageContent, sequenceNumber, timestamp) {
    // Создаём буфер нужного размера
    const contentTypeBytes = new TextEncoder().encode(contentType);
    const messageBytes = new TextEncoder().encode(messageContent);
    const totalSize = 4 + contentTypeBytes.length + messageBytes.length + 8 + 8;
    const buffer = new Uint8Array(totalSize);
    let offset = 0;
    buffer[offset++] = (chatId >>> 24) & 0xFF;
    buffer[offset++] = (chatId >>> 16) & 0xFF;
    buffer[offset++] = (chatId >>> 8) & 0xFF;
    buffer[offset++] = chatId & 0xFF;
    for (let i = 0; i < contentTypeBytes.length; i++) {
        buffer[offset++] = contentTypeBytes[i];
    }
    for (let i = 0; i < messageBytes.length; i++) {
        buffer[offset++] = messageBytes[i];
    }
    const seqBig = BigInt(sequenceNumber);
    buffer[offset++] = Number((seqBig >> BigInt(56)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(48)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(40)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(32)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(24)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(16)) & BigInt(0xFF));
    buffer[offset++] = Number((seqBig >> BigInt(8)) & BigInt(0xFF));
    buffer[offset++] = Number(seqBig & BigInt(0xFF));
    const tsBig = BigInt(timestamp);
    buffer[offset++] = Number((tsBig >> BigInt(56)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(48)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(40)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(32)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(24)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(16)) & BigInt(0xFF));
    buffer[offset++] = Number((tsBig >> BigInt(8)) & BigInt(0xFF));
    buffer[offset++] = Number(tsBig & BigInt(0xFF));
    return buffer;
}
function uint8ArrayToHex(u8) {
    return Array.from(u8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export function computeMessageHMAC(messageContent, sessionKey, chatId, contentType, sequenceNumber, timestamp) {
    try {
        // Собираем данные для подписи в правильном порядке (как на сервере)
        const hmacDataBuffer = buildHMACData(chatId, contentType, messageContent, sequenceNumber, timestamp);
        const hmacDataHex = uint8ArrayToHex(hmacDataBuffer);
        const hmacData = CryptoJS.enc.Hex.parse(hmacDataHex);
        const hmac = CryptoJS.HmacSHA256(hmacData, sessionKey);
        const result = CryptoJS.enc.Base64.stringify(hmac);
        console.log('🔐 HMAC Computation Debug:', {
            chatId,
            contentType,
            messageContent,
            messageLength: messageContent.length,
            sequenceNumber,
            timestamp,
            sessionKey: sessionKey.substring(0, 20) + '...',
            hmacDataLength: hmacDataBuffer.length,
            hmacDataHex: hmacDataHex,
            hmacResult: result
        });
        return result;
    }
    catch (error) {
        console.error('❌ Failed to compute HMAC:', error);
        throw error;
    }
}
