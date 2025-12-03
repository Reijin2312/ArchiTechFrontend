import { logger } from '@/shared/lib/logger';

export interface EncryptedMessage {
  encryptedContent: string
  encryptionMetadata: {
    iv: string
    keyVersion?: number  // 🔐 Версия ключа для поддержки ротации
  }
}

export interface MessageWithHMAC extends EncryptedMessage {
  messageHmac?: string
  sequenceNumber?: number
  signatureTimestamp?: number
  messageKeyVersion?: number
}

// 🔐 Удалены DUMMY_KEYS и EncryptionKeys - теперь используем только облачные ключи через API

export async function generateChatKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportChatKey(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(rawKey);
}

export async function importChatKey(keyBase64: string): Promise<CryptoKey> {
  const rawKey = base64ToArrayBuffer(keyBase64);
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  message: string,
  chatKey: CryptoKey,
  keyVersion?: number
): Promise<EncryptedMessage> {
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    chatKey,
    messageData
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedData),
    encryptionMetadata: {
      iv: arrayBufferToBase64(iv.buffer),
      ...(keyVersion !== undefined && { keyVersion }),
    },
  };
}

export async function decryptMessage(
  encrypted: EncryptedMessage,
  chatKey: CryptoKey
): Promise<string> {
  try {
    const encryptedData = base64ToArrayBuffer(encrypted.encryptedContent);
    const iv = base64ToArrayBuffer(encrypted.encryptionMetadata.iv);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      chatKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (e) {
    logger.error('Failed to decrypt message:', e);
    throw new Error('Decryption failed');
  }
}

// 🔐 HMAC функции для проверки целостности сообщений
export async function generateHMAC(
  data: string,
  key: CryptoKey,
  sequenceNumber: number,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  
  // 🔐 CRITICAL FIX: Используем тот же формат, что и сервер (Java)
  // Сервер: mac.update(messageContent) + mac.update(longToBytes(seq)) + mac.update(longToBytes(ts))
  // Клиент должен делать то же самое: concat(messageContent, seq_bytes, ts_bytes)
  
  const messageData = encoder.encode(data);
  const seqBytes = longToBytes(sequenceNumber);
  const tsBytes = longToBytes(timestamp);
  
  // Объединяем все байты в один массив
  const combined = new Uint8Array(messageData.length + seqBytes.length + tsBytes.length);
  combined.set(messageData, 0);
  combined.set(seqBytes, messageData.length);
  combined.set(tsBytes, messageData.length + seqBytes.length);
  
  // Экспортируем ключ для использования в HMAC
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  
  const signature = await crypto.subtle.sign('HMAC', hmacKey, combined);
  return arrayBufferToBase64(signature);
}

// 🔐 Вспомогательная функция для конвертации long в байты (как в Java)
function longToBytes(value: number): Uint8Array {
  const result = new Uint8Array(8);
  // JavaScript поддерживает битовые операции только для 32-битных чисел,
  // поэтому разбиваем на high и low части
  let high = Math.floor(value / 0x100000000);
  let low = value >>> 0;
  
  for (let i = 7; i >= 4; i--) {
    result[i] = low & 0xFF;
    low = low >>> 8;
  }
  for (let i = 3; i >= 0; i--) {
    result[i] = high & 0xFF;
    high = high >>> 8;
  }
  return result;
}

export async function verifyHMAC(
  data: string,
  expectedHmac: string,
  key: CryptoKey,
  sequenceNumber: number,
  timestamp: number
): Promise<boolean> {
  try {
    const computedHmac = await generateHMAC(data, key, sequenceNumber, timestamp);
    return computedHmac === expectedHmac;
  } catch (e) {
    logger.error('Failed to verify HMAC:', e);
    return false;
  }
}

// 🔐 Вспомогательная функция для проверки сообщения с HMAC
export async function verifyMessageIntegrity(
  message: MessageWithHMAC,
  chatKey: CryptoKey
): Promise<boolean> {
  if (!message.messageHmac || message.sequenceNumber === undefined || !message.signatureTimestamp) {
    // Старое сообщение без HMAC - пропускаем проверку
    return true;
  }
  
  return verifyHMAC(
    message.encryptedContent,
    message.messageHmac,
    chatKey,
    message.sequenceNumber,
    message.signatureTimestamp
  );
}

// 🔐 REMOVED: initEncryption, unlockKeys, resetAndReinitializeKeys, wrapChatKey, unwrapChatKey, importPublicKey, importSignPublicKey
// Теперь используется только облачная модель с ключами на сервере

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
