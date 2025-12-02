import { logger } from '@/shared/lib/logger';

export interface EncryptedMessage {
  encryptedContent: string
  encryptionMetadata: {
    iv: string
  }
}

export interface EncryptionKeys {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyPem: string
  signPublicKey: CryptoKey
  signPrivateKey: CryptoKey
  signPublicKeyPem: string
}

const DUMMY_KEYS: EncryptionKeys = {
  publicKey: {} as CryptoKey,
  privateKey: {} as CryptoKey,
  publicKeyPem: 'cloud',
  signPublicKey: {} as CryptoKey,
  signPrivateKey: {} as CryptoKey,
  signPublicKeyPem: 'cloud',
};

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
  chatKey: CryptoKey
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

export async function initEncryption(): Promise<void> {
  return;
}

export async function unlockKeys(): Promise<EncryptionKeys | null> {
  return DUMMY_KEYS;
}

export async function resetAndReinitializeKeys(): Promise<EncryptionKeys | null> {
  return DUMMY_KEYS;
}

export async function wrapChatKey(chatKey: CryptoKey, _recipientKey: CryptoKey): Promise<string> {
  return exportChatKey(chatKey);
}

export async function unwrapChatKey(wrappedKey: string, _privateKey: CryptoKey): Promise<CryptoKey> {
  return importChatKey(wrappedKey);
}

export async function importPublicKey(_publicKey: string): Promise<CryptoKey> {
  return await generateChatKey();
}

export async function importSignPublicKey(_signPublicKey: string): Promise<CryptoKey> {
  return await generateChatKey();
}

export async function encryptMessageWithChatKey(
  message: string,
  chatKey: CryptoKey,
  _senderSignPrivateKey?: CryptoKey
): Promise<EncryptedMessage> {
  return encryptMessage(message, chatKey);
}

export async function decryptMessageWithChatKey(
  payload: EncryptedMessage,
  chatKey: CryptoKey,
  _senderSignPublicKey?: CryptoKey
): Promise<string> {
  return decryptMessage(payload, chatKey);
}

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
