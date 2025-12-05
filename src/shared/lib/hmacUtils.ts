import CryptoJS from 'crypto-js';

/**
 * Собирает данные для HMAC точно как на сервере Java
 * Использует побайтовый порядок как в Java (big-endian)
 */
function buildHMACData(
  chatId: number,
  contentType: string,
  messageContent: string,
  sequenceNumber: number,
  timestamp: number
): Uint8Array {
  // Создаём буфер нужного размера
  // chatId: 4 байта + contentType: variable + content: variable + seqNo: 8 + timestamp: 8
  const contentTypeBytes = new TextEncoder().encode(contentType);
  const messageBytes = new TextEncoder().encode(messageContent);
  
  const totalSize = 4 + contentTypeBytes.length + messageBytes.length + 8 + 8;
  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  // Добавляем chatId (4 байта, big-endian)
  buffer[offset++] = (chatId >>> 24) & 0xFF;
  buffer[offset++] = (chatId >>> 16) & 0xFF;
  buffer[offset++] = (chatId >>> 8) & 0xFF;
  buffer[offset++] = chatId & 0xFF;

  // Добавляем contentType
  for (let i = 0; i < contentTypeBytes.length; i++) {
    buffer[offset++] = contentTypeBytes[i];
  }

  // Добавляем messageContent
  for (let i = 0; i < messageBytes.length; i++) {
    buffer[offset++] = messageBytes[i];
  }

  // Добавляем sequenceNumber (8 байт, big-endian)
  const seqBig = BigInt(sequenceNumber);
  buffer[offset++] = Number((seqBig >> BigInt(56)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(48)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(40)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(32)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(24)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(16)) & BigInt(0xFF));
  buffer[offset++] = Number((seqBig >> BigInt(8)) & BigInt(0xFF));
  buffer[offset++] = Number(seqBig & BigInt(0xFF));

  // Добавляем timestamp (8 байт, big-endian)
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

/**
 * Конвертирует Uint8Array в hex строку
 */
function uint8ArrayToHex(u8: Uint8Array): string {
  return Array.from(u8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Вычисляет HMAC-SHA256 сообщения точно как на сервере
 * 
 * ☁️ CLOUD MODEL: HMAC вычисляется с использованием sessionKey
 * HMAC = HmacSHA256(
 *   intToBytes(chatId) +            // 4 байта
 *   contentType.getBytes() +         // N байт
 *   messageContent.getBytes() +      // N байт
 *   longToBytes(sequenceNumber) +    // 8 байт
 *   longToBytes(timestamp)           // 8 байт
 * )
 * 
 * @param messageContent Содержимое сообщения (plaintext)
 * @param sessionKey Ключ сессии (он же используется как ключ для HMAC)
 * @param chatId ID чата
 * @param contentType Тип контента ('text' или 'image')
 * @param sequenceNumber Номер последовательности
 * @param timestamp Временная метка
 * @returns Base64-закодированный HMAC
 */
export function computeMessageHMAC(
  messageContent: string,
  sessionKey: string,
  chatId: number,
  contentType: string,
  sequenceNumber: number,
  timestamp: number
): string {
  try {
    // Собираем данные для подписи в правильном порядке (как на сервере)
    const hmacDataBuffer = buildHMACData(chatId, contentType, messageContent, sequenceNumber, timestamp);
    
    // Конвертируем в hex (более надежный способ для CryptoJS)
    const hmacDataHex = uint8ArrayToHex(hmacDataBuffer);
    
    // Парсим hex в WordArray
    const hmacData = CryptoJS.enc.Hex.parse(hmacDataHex);
    
    // Вычисляем HMAC-SHA256 с sessionKey в качестве секрета
    const hmac = CryptoJS.HmacSHA256(hmacData, sessionKey);
    
    // Кодируем результат в Base64
    const result = CryptoJS.enc.Base64.stringify(hmac);
    
    // 🔍 DEBUG: Detailed logging
    console.log('🔐 HMAC Computation Debug:', {
      chatId,
      contentType,
      messageContent,
      messageLength: messageContent.length,
      sequenceNumber,
      timestamp,
      sessionKey: sessionKey.substring(0, 20) + '...',
      hmacDataLength: hmacDataBuffer.length,
      hmacDataHex: hmacDataHex, // Полный hex без обрезки
      hmacResult: result
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to compute HMAC:', error);
    throw error;
  }
}
