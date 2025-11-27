/**
 * E2E шифрование для чата
 * Использует Web Crypto API для RSA и AES-GCM
 * Добавлены цифровые подписи, timestamp и защита от replay атак
 */

import { secureStorage } from './secureStorage';
import { logger } from '@/shared/lib/logger';

export interface EncryptionKeys {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyPem: string
  // Добавляем ключи для подписи
  signPublicKey: CryptoKey
  signPrivateKey: CryptoKey
  signPublicKeyPem: string
}

export interface EncryptedMessage {
  encryptedContent: string
  encryptionMetadata: {
    iv: string
    encryptedKey: string
    timestamp: number // Защита от replay атак
    nonce: string // Уникальный идентификатор сообщения
    signature?: string // Цифровая подпись отправителя
  }
}

export interface KeyFingerprint {
  encryptionFingerprint: string
  signatureFingerprint: string
}

/**
 * Генерация пары ключей RSA для пользователя
 * Создаёт отдельные ключи для шифрования и подписи
 */
export async function generateKeyPair(): Promise<EncryptionKeys> {
  // Ключи для шифрования (RSA-OAEP)
  const encryptionKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )

  // Ключи для подписи (RSA-PSS)
  const signatureKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', encryptionKeyPair.publicKey)
  const publicKeyPem = arrayBufferToBase64(publicKeyBuffer)

  const signPublicKeyBuffer = await crypto.subtle.exportKey('spki', signatureKeyPair.publicKey)
  const signPublicKeyPem = arrayBufferToBase64(signPublicKeyBuffer)

  return {
    publicKey: encryptionKeyPair.publicKey,
    privateKey: encryptionKeyPair.privateKey,
    publicKeyPem,
    signPublicKey: signatureKeyPair.publicKey,
    signPrivateKey: signatureKeyPair.privateKey,
    signPublicKeyPem,
  }
}

/**
 * Импорт публичного ключа из JWK или PEM
 */
export async function importPublicKey(publicKey: string): Promise<CryptoKey> {
  // Пытаемся парсить как JWK
  try {
    const jwk = JSON.parse(publicKey);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'wrapKey']
    );
  } catch {
    // Если не JWK, то это PEM/SPKI
    const keyData = base64ToArrayBuffer(publicKey);
    return await crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'wrapKey']
    );
  }
}

/**
 * Импорт публичного ключа для проверки подписи
 */
export async function importSignPublicKey(signPublicKey: string): Promise<CryptoKey> {
  logger.crypto('🔐', 'importSignPublicKey called with:', typeof signPublicKey, signPublicKey.substring(0, 100));
  
  try {
    // Пробуем парсить как JWK
    const jwk = JSON.parse(signPublicKey);
    logger.crypto('🧩', 'Parsed as JWK:', jwk);
    logger.crypto('🧩', 'JWK meta kty/alg/ops:', jwk.kty, jwk.alg, jwk.key_ops);
    
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-PSS',
        hash: 'SHA-256',
      },
      true,
      ['verify']
    );
    console.log('✅ Successfully imported as JWK');
      logger.crypto('✅', 'Successfully imported as JWK');
    return key;
  } catch (e) {
    console.log('Failed to parse as JWK, trying SPKI...', e);
      logger.warn('Failed to parse as JWK, trying SPKI...', e);
    // Если не JWK, то это PEM/SPKI
    try {
      const keyData = base64ToArrayBuffer(signPublicKey);
      const key = await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-PSS',
          hash: 'SHA-256',
        },
        true,
        ['verify']
      );
      console.log('✅ Successfully imported as SPKI');
        logger.crypto('✅', 'Successfully imported as SPKI');
      return key;
    } catch (spkiError) {
      console.error('❌ Failed to import as SPKI too:', spkiError);
        logger.error('Failed to import as SPKI too:', spkiError);
        logger.crypto('🔐', 'Initializing encryption keys...');
        logger.crypto('✅', 'Encryption keys ready');
        logger.error('Failed to init encryption:', e);
      throw spkiError;
    }
  }
}

/**
 * Шифрование сообщения для получателя с цифровой подписью
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: CryptoKey,
  senderSignPrivateKey?: CryptoKey
): Promise<EncryptedMessage> {
  // Генерируем случайный AES ключ для этого сообщения
  const aesKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )

  // Генерируем IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Генерируем уникальный nonce
  const nonce = crypto.getRandomValues(new Uint8Array(16))
  const timestamp = Date.now()

  // Шифруем сообщение с помощью AES
  const encoder = new TextEncoder()
  const messageData = encoder.encode(message)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    messageData
  )

  // Экспортируем AES ключ
  const aesKeyData = await crypto.subtle.exportKey('raw', aesKey)

  // Шифруем AES ключ с помощью RSA публичного ключа получателя
  const encryptedAesKey = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPublicKey,
    aesKeyData
  )

  const metadata: EncryptedMessage['encryptionMetadata'] = {
    iv: arrayBufferToBase64(iv.buffer),
    encryptedKey: arrayBufferToBase64(encryptedAesKey),
    timestamp,
    nonce: arrayBufferToBase64(nonce.buffer),
  }

  // Создаём цифровую подпись
  if (senderSignPrivateKey) {
    const signatureData = encoder.encode(
      JSON.stringify({
        encryptedContent: arrayBufferToBase64(encryptedData),
        timestamp,
        nonce: metadata.nonce,
      })
    )

    const signature = await crypto.subtle.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      senderSignPrivateKey,
      signatureData
    )

    metadata.signature = arrayBufferToBase64(signature)
  }

  return {
    encryptedContent: arrayBufferToBase64(encryptedData),
    encryptionMetadata: metadata,
  }
}

/**
 * Расшифровка сообщения своим приватным ключом с проверкой подписи
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  privateKey: CryptoKey,
  senderSignPublicKey?: CryptoKey,
  maxAgeMs: number = 3600000 // 1 час максимальный возраст сообщения
): Promise<string> {
  // Проверяем timestamp для защиты от replay атак
  if (encryptedMessage.encryptionMetadata.timestamp) {
    const messageAge = Date.now() - encryptedMessage.encryptionMetadata.timestamp
    if (messageAge > maxAgeMs || messageAge < -60000) {
      throw new Error('Message timestamp is invalid or too old')
    }
  }

  // Проверяем цифровую подпись если есть
  if (encryptedMessage.encryptionMetadata.signature && senderSignPublicKey) {
    const encoder = new TextEncoder()
    const signatureData = encoder.encode(
      JSON.stringify({
        encryptedContent: encryptedMessage.encryptedContent,
        timestamp: encryptedMessage.encryptionMetadata.timestamp,
        nonce: encryptedMessage.encryptionMetadata.nonce,
      })
    )

    const signature = base64ToArrayBuffer(encryptedMessage.encryptionMetadata.signature)

    const isValid = await crypto.subtle.verify(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      senderSignPublicKey,
      signature,
      signatureData
    )

    if (!isValid) {
      throw new Error('Invalid message signature - message may be tampered')
    }
  }

  // Расшифровываем AES ключ с помощью RSA приватного ключа
  const encryptedAesKeyData = base64ToArrayBuffer(encryptedMessage.encryptionMetadata.encryptedKey)
  const aesKeyData = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedAesKeyData
  )

  // Импортируем AES ключ
  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  )

  // Расшифровываем сообщение
  const iv = base64ToArrayBuffer(encryptedMessage.encryptionMetadata.iv)
  const encryptedData = base64ToArrayBuffer(encryptedMessage.encryptedContent)

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    encryptedData
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedData)
}

// Утилиты конвертации
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Вычисление fingerprint публичного ключа
 * Используется для проверки целостности ключей
 */
export async function calculateKeyFingerprint(keys: EncryptionKeys): Promise<KeyFingerprint> {
  const encryptionKeyBuffer = base64ToArrayBuffer(keys.publicKeyPem)
  const signKeyBuffer = base64ToArrayBuffer(keys.signPublicKeyPem)
  
  const encryptionHash = await crypto.subtle.digest('SHA-256', encryptionKeyBuffer)
  const signHash = await crypto.subtle.digest('SHA-256', signKeyBuffer)
  
  return {
    encryptionFingerprint: arrayBufferToBase64(encryptionHash).substring(0, 32),
    signatureFingerprint: arrayBufferToBase64(signHash).substring(0, 32),
  }
}

  /**
   * ============================================================================
   * SHARED CHAT KEY MANAGEMENT (Signal Protocol Style)
   * ============================================================================
   * Для каждого чата создаётся один AES-256 ключ, который оборачивается
   * публичными ключами всех участников. Это позволяет всем видеть все сообщения.
   */

  export interface WrappedChatKey {
    wrappedKey: string // AES ключ, обёрнутый RSA публичным ключом участника
    userId: string
  }

/**
 * Генерация нового AES-256 ключа для чата
 */
export async function generateChatKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable (нужно для wrapKey)
    ['encrypt', 'decrypt'] // только шифрование/расшифровка
  )
}  /**
   * Оборачивание (wrap) AES ключа чата публичным RSA ключом участника
   */
  export async function wrapChatKey(
    chatKey: CryptoKey,
    recipientPublicKey: CryptoKey
  ): Promise<string> {
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      chatKey,
      recipientPublicKey,
      {
        name: 'RSA-OAEP',
      }
    )
    return arrayBufferToBase64(wrappedKey)
  }

  /**
   * Разворачивание (unwrap) AES ключа чата своим приватным RSA ключом
   */
  export async function unwrapChatKey(
    wrappedKey: string,
    privateKey: CryptoKey
  ): Promise<CryptoKey> {
    const wrappedKeyBuffer = base64ToArrayBuffer(wrappedKey)
    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedKeyBuffer,
      privateKey,
      {
        name: 'RSA-OAEP',
      },
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Шифрование сообщения с помощью общего ключа чата (с подписью)
   */
  export async function encryptMessageWithChatKey(
    message: string,
    chatKey: CryptoKey,
    senderSignPrivateKey?: CryptoKey
  ): Promise<EncryptedMessage> {
    // Генерируем IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
  
    // Генерируем уникальный nonce
    const nonce = crypto.getRandomValues(new Uint8Array(16))
    const timestamp = Date.now()

    // Шифруем сообщение с помощью AES-GCM
    const encoder = new TextEncoder()
    const messageData = encoder.encode(message)
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      chatKey,
      messageData
    )

    const metadata: EncryptedMessage['encryptionMetadata'] = {
      iv: arrayBufferToBase64(iv.buffer),
      encryptedKey: '', // Не используется для chat key (ключ уже wrapped)
      timestamp,
      nonce: arrayBufferToBase64(nonce.buffer),
    }

    // Создаём цифровую подпись
    if (senderSignPrivateKey) {
      const signatureData = encoder.encode(
        JSON.stringify({
          encryptedContent: arrayBufferToBase64(encryptedData),
          timestamp,
          nonce: metadata.nonce,
        })
      )

      const signature = await crypto.subtle.sign(
        {
          name: 'RSA-PSS',
          saltLength: 32,
        },
        senderSignPrivateKey,
        signatureData
      )

      metadata.signature = arrayBufferToBase64(signature)
    }

    return {
      encryptedContent: arrayBufferToBase64(encryptedData),
      encryptionMetadata: metadata,
    }
  }

  /**
   * Расшифровка сообщения с помощью общего ключа чата (с проверкой подписи)
   */
  export async function decryptMessageWithChatKey(
    encryptedMessage: EncryptedMessage,
    chatKey: CryptoKey,
    senderSignPublicKey?: CryptoKey,
    maxAgeMs: number = Number.POSITIVE_INFINITY // messages never expire
  ): Promise<string> {
    console.log('🔍 Decrypting message with metadata:', encryptedMessage.encryptionMetadata);
    
    // Проверяем наличие обязательных полей
    if (!encryptedMessage.encryptionMetadata.iv) {
      throw new Error('Missing IV in encryption metadata');
    }
    
    // Do not expire messages: only check time when maxAge is finite
    if (Number.isFinite(maxAgeMs) && encryptedMessage.encryptionMetadata.timestamp) {
      const messageAge = Date.now() - encryptedMessage.encryptionMetadata.timestamp
      if (messageAge > maxAgeMs || messageAge < -60000) {
        console.warn("Message timestamp is suspicious:", new Date(encryptedMessage.encryptionMetadata.timestamp))
      }
    }

    // Проверяем цифровую подпись если есть
    if (encryptedMessage.encryptionMetadata.signature && senderSignPublicKey) {
      const encoder = new TextEncoder()
      const signatureData = encoder.encode(
        JSON.stringify({
          encryptedContent: encryptedMessage.encryptedContent,
          timestamp: encryptedMessage.encryptionMetadata.timestamp,
          nonce: encryptedMessage.encryptionMetadata.nonce,
        })
      )

      const signature = base64ToArrayBuffer(encryptedMessage.encryptionMetadata.signature)

      const isValid = await crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: 32,
        },
        senderSignPublicKey,
        signature,
        signatureData
      )

      if (!isValid) {
        throw new Error('Invalid message signature - message may be tampered')
      }
    }

    // Расшифровываем сообщение
    console.log('🔓 Converting IV from base64...');
    const iv = base64ToArrayBuffer(encryptedMessage.encryptionMetadata.iv)
    console.log('🔓 Converting encrypted content from base64...');
    const encryptedData = base64ToArrayBuffer(encryptedMessage.encryptedContent)

    console.log('🔓 Decrypting with AES-GCM...', { ivLength: iv.byteLength, dataLength: encryptedData.byteLength });
    
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        chatKey,
        encryptedData
      )

      const decoder = new TextDecoder()
      return decoder.decode(decryptedData)
    } catch (e) {
      console.error('❌ AES-GCM decryption failed:', e);
      throw new Error('Failed to decrypt: wrong key or corrupted data');
    }
  }

/**
 * Очистка всех ключей и данных (для logout)
 */
export async function clearAllKeys(): Promise<void> {
  // Очищаем secureStorage
  await secureStorage.clear()
  
  // Очищаем localStorage
  localStorage.removeItem('chat_public_key')
  localStorage.removeItem('chat_sign_public_key')
  localStorage.removeItem('chat_master_salt')
  
  console.log('✅ All encryption keys cleared')
  logger.crypto('🧹', 'All encryption keys cleared');
}

/**
 * Сохранение ключей в безопасное хранилище (secureStorage) с автогенерацией и сохранением соли
 */
export async function saveKeys(keys: EncryptionKeys, password: string): Promise<void> {
  // Инициализируем secureStorage (генерируется соль внутри)
  await secureStorage.init(password)
  const salt = secureStorage.getCurrentSalt()
  if (!salt) throw new Error('Failed to obtain storage salt')

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
  const privateKeyPem = arrayBufferToBase64(privateKeyBuffer)

  const signPrivateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keys.signPrivateKey)
  const signPrivateKeyPem = arrayBufferToBase64(signPrivateKeyBuffer)

  // Сохраняем приватные ключи в secureStorage
  await secureStorage.set('chat_private_key', privateKeyPem)
  await secureStorage.set('chat_sign_private_key', signPrivateKeyPem)

  // Сохраняем публичные ключи вне secureStorage (они не секретные)
  localStorage.setItem('chat_public_key', keys.publicKeyPem)
  localStorage.setItem('chat_sign_public_key', keys.signPublicKeyPem)
  localStorage.setItem('chat_master_salt', arrayBufferToBase64(salt.buffer as ArrayBuffer))

  console.log('✅ Keys saved securely (IndexedDB + master salt)')
  logger.crypto('✅', 'Keys saved securely (IndexedDB + master salt)');
}

/**
 * Загрузка ключей из secureStorage по автогенерируемому паролю
 */
async function loadKeys(password: string): Promise<EncryptionKeys | null> {
  const publicKeyPem = localStorage.getItem('chat_public_key')
  const signPublicKeyPem = localStorage.getItem('chat_sign_public_key')
  const saltBase64 = localStorage.getItem('chat_master_salt')
  
  if (!publicKeyPem || !signPublicKeyPem || !saltBase64) {
    console.error('❌ Missing key data in localStorage:', {
      publicKey: !!publicKeyPem,
      signPublicKey: !!signPublicKeyPem,
      salt: !!saltBase64
    });
    logger.error('Missing key data in localStorage:', {
      publicKey: !!publicKeyPem,
      signPublicKey: !!signPublicKeyPem,
      salt: !!saltBase64
    });
    return null;
  }

  try {
    const saltBuffer = base64ToArrayBuffer(saltBase64)
    const salt = new Uint8Array(saltBuffer)
    
    console.log('🔓 Attempting to unlock secure storage...');
    logger.crypto('🔓', 'Attempting to unlock secure storage...');
    const unlocked = await secureStorage.unlock(password, salt)
    if (!unlocked) {
      console.error('❌ Failed to unlock secure storage with derived password')
      logger.error('Failed to unlock secure storage with derived password');
      return null
    }
    console.log('✅ Secure storage unlocked');
    logger.crypto('✅', 'Secure storage unlocked');

    console.log('📥 Retrieving private keys from secure storage...');
    logger.crypto('📥', 'Retrieving private keys from secure storage...');
    const privateKeyPem = await secureStorage.get('chat_private_key')
    const signPrivateKeyPem = await secureStorage.get('chat_sign_private_key')
    
    if (!privateKeyPem || !signPrivateKeyPem) {
      console.error('❌ Private keys not found in secure storage');
      logger.error('Private keys not found in secure storage');
      return null;
    }
    console.log('✅ Private keys retrieved');

    console.log('🔑 Importing cryptographic keys...');
    logger.crypto('🔑', 'Importing cryptographic keys...');
    const privateKeyData = base64ToArrayBuffer(privateKeyPem)
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt', 'unwrapKey']
    )

    const signPrivateKeyData = base64ToArrayBuffer(signPrivateKeyPem)
    const signPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      signPrivateKeyData,
      { name: 'RSA-PSS', hash: 'SHA-256' },
      true,
      ['sign']
    )

    const publicKeyData = base64ToArrayBuffer(publicKeyPem)
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt', 'wrapKey']
    )

    const signPublicKeyData = base64ToArrayBuffer(signPublicKeyPem)
    const signPublicKey = await crypto.subtle.importKey(
      'spki',
      signPublicKeyData,
      { name: 'RSA-PSS', hash: 'SHA-256' },
      true,
      ['verify']
    )

    console.log('✅ All keys imported successfully');
    logger.crypto('✅', 'All keys imported successfully');
    return {
      publicKey,
      privateKey,
      publicKeyPem,
      signPublicKey,
      signPrivateKey,
      signPublicKeyPem,
    }
  } catch (e) {
    console.error('❌ Failed to load keys from secure storage:', e)
    logger.error('Failed to load keys from secure storage:', e);
    return null
  }
}

/**
 * ВРЕМЕННЫЕ функции для обратной совместимости
 * TODO: Требовать пароль от пользователя
 */

/**
 * Загрузка ключей без пароля (НЕБЕЗОПАСНО, для миграции)
 */
export async function loadKeysLegacy(): Promise<EncryptionKeys | null> {
  const publicKeyPem = localStorage.getItem('chat_public_key')
  const signPublicKeyPem = localStorage.getItem('chat_sign_public_key')

  // Пытаемся загрузить из старого localStorage (для миграции)
  const oldPrivateKeyPem = localStorage.getItem('chat_private_key')
  
  if (oldPrivateKeyPem && publicKeyPem) {
    console.warn('⚠️ Found keys in localStorage (insecure). Please set a password to migrate.')
    logger.warn('Found keys in localStorage (insecure). Please set a password to migrate.');
    // Возвращаем старые ключи для миграции
    try {
      const privateKeyData = base64ToArrayBuffer(oldPrivateKeyPem)
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt', 'unwrapKey']
      )

      const publicKeyData = base64ToArrayBuffer(publicKeyPem)
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'wrapKey']
      )
      
      // Проверяем есть ли ключи подписи
      const oldSignPrivateKeyPem = localStorage.getItem('chat_sign_private_key')
      const oldSignPublicKeyPem = localStorage.getItem('chat_sign_public_key')
      
      let signPublicKey: CryptoKey;
      let signPrivateKey: CryptoKey;
      let signPublicKeyPem: string;
      
      if (oldSignPrivateKeyPem && oldSignPublicKeyPem) {
        // Загружаем существующие ключи подписи
        const signPrivateKeyData = base64ToArrayBuffer(oldSignPrivateKeyPem)
        signPrivateKey = await crypto.subtle.importKey(
          'pkcs8',
          signPrivateKeyData,
          {
            name: 'RSA-PSS',
            hash: 'SHA-256',
          },
          true,
          ['sign']
        )
        
        const signPublicKeyData = base64ToArrayBuffer(oldSignPublicKeyPem)
        signPublicKey = await crypto.subtle.importKey(
          'spki',
          signPublicKeyData,
          {
            name: 'RSA-PSS',
            hash: 'SHA-256',
          },
          true,
          ['verify']
        )
        signPublicKeyPem = oldSignPublicKeyPem
        console.log('✅ Loaded existing signature keys')
        logger.crypto('✅', 'Loaded existing signature keys');
      } else {
        // Генерируем новые ключи для подписи
        console.log('⚠️ Generating new signature keys (old keys missing)')
        logger.warn('Generating new signature keys (old keys missing)');
        const signatureKeyPair = await crypto.subtle.generateKey(
          {
            name: 'RSA-PSS',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['sign', 'verify']
        )
        
        signPublicKey = signatureKeyPair.publicKey
        signPrivateKey = signatureKeyPair.privateKey
        
        const signPublicKeyBuffer = await crypto.subtle.exportKey('spki', signPublicKey)
        signPublicKeyPem = arrayBufferToBase64(signPublicKeyBuffer)
        
        const signPrivateKeyBuffer = await crypto.subtle.exportKey('pkcs8', signPrivateKey)
        const signPrivateKeyPem = arrayBufferToBase64(signPrivateKeyBuffer)
        
        localStorage.setItem('chat_sign_public_key', signPublicKeyPem)
        localStorage.setItem('chat_sign_private_key', signPrivateKeyPem)
      }

      return {
        publicKey,
        privateKey,
        publicKeyPem,
        signPublicKey,
        signPrivateKey,
        signPublicKeyPem,
      }
    } catch (e) {
      console.error('Failed to load legacy keys:', e)
      logger.error('Failed to load legacy keys:', e);
      return null
    }
  }

  return null
}

/**
 * Автоматическая инициализация ключей при первом использовании
 * Запрашивает мастер-пароль для защиты приватных ключей
 */
export async function initEncryption(): Promise<void> {
  // Проверяем есть ли salt - значит ключи уже есть
  const hasMasterSalt = localStorage.getItem('chat_master_salt')
  
  if (hasMasterSalt) {
    // Ключи существуют, но еще не загружены - запрашиваем пароль
    console.log('🔐 Encryption keys exist, waiting for password unlock...')
    logger.crypto('🔐', 'Encryption keys exist, waiting for password unlock...');
    // Пароль будет запрошен через UI при необходимости
    return
  }
  
  // Пытаемся загрузить старые ключи из localStorage для миграции
  const existing = await loadKeysLegacy()
  
  if (existing) {
    console.log('⚠️ Found legacy keys in localStorage, migrating to secure storage...');
    logger.warn('Found legacy keys in localStorage, migrating to secure storage...');
    
    // Генерируем мастер-пароль автоматически из учетных данных
    const { authStore } = await import('@/shared/store/auth');
    const userId = authStore.getState().user?.id;
    
    if (!userId) {
      console.error('Cannot migrate: no user ID available');
      logger.error('Cannot migrate: no user ID available');
      return;
    }
    
    const password = await deriveMasterPasswordFromUser(userId);
    
    // Сохраняем ключи в secureStorage
    await saveKeys(existing, password);
    
    // Удаляем старые незащищенные ключи
    localStorage.removeItem('chat_private_key');
    localStorage.removeItem('chat_sign_private_key');
    console.log('✅ Keys migrated to secure storage');
    logger.crypto('✅', 'Keys migrated to secure storage');
    
    // Всегда проверяем и обновляем ключи на сервере
    try {
      const { http } = await import('@/shared/api/http');
      const { endpoints } = await import('@/shared/api/endpoints');
      const { authStore } = await import('@/shared/store/auth');
      const userId = authStore.getState().user?.id;
      if (!userId) return;
      
      // Проверяем есть ли ключи на сервере
      let needsUpload = false;
      try {
        const { data } = await http.get(endpoints.chatKeysGet(userId));
        if (!data.signPublicKey) {
          console.log('⚠️ Server has no signPublicKey, updating...');
          logger.warn('Server has no signPublicKey, updating...');
          needsUpload = true;
        } else {
          console.log('✅ Both keys exist on server');
          logger.crypto('✅', 'Both keys exist on server');
        }
      } catch (e) {
        console.log('Public keys not found on server, uploading...');
        logger.warn('Public keys not found on server, uploading...');
        needsUpload = true;
      }
      
      if (needsUpload) {
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', existing.publicKey);
        const signPublicKeyJwk = await crypto.subtle.exportKey('jwk', existing.signPublicKey);
        console.log('Uploading keys to server...');
        logger.crypto('⬆️', 'Uploading keys to server...');
        
        await http.post(endpoints.chatKeysSave, {
          publicKey: JSON.stringify(publicKeyJwk),
          signPublicKey: JSON.stringify(signPublicKeyJwk),
          keyType: 'RSA'
        });
        console.log('✅ Public keys uploaded to server');
        logger.crypto('✅', 'Public keys uploaded to server');
      }
    } catch (err) {
      console.error('Failed to sync keys with server:', err);
      logger.error('Failed to sync keys with server:', err);
    }
    
    return;
  }
  
  console.log('Generating new encryption keys...');
  logger.crypto('🔧', 'Generating new encryption keys...');
  const keys = await generateKeyPair();
  
  // Генерируем мастер-пароль автоматически
  const { authStore } = await import('@/shared/store/auth');
  const userId = authStore.getState().user?.id;
  
  if (!userId) {
    console.error('Cannot generate keys: no user ID available');
    logger.error('Cannot generate keys: no user ID available');
    throw new Error('Cannot generate keys: no user ID available');
  }
  
  const password = await deriveMasterPasswordFromUser(userId);
  
  // Сохраняем ключи в secureStorage с паролем
  await saveKeys(keys, password);
  console.log('✅ Keys saved securely with auto-generated password')
  logger.crypto('✅', 'Keys saved securely with auto-generated password');
  
  // Отправляем публичный ключ на сервер
  setTimeout(async () => {
    try {
      const { http } = await import('@/shared/api/http');
      const { endpoints } = await import('@/shared/api/endpoints');
      const publicKeyJwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
      const signPublicKeyJwk = await crypto.subtle.exportKey('jwk', keys.signPublicKey);
      await http.post(endpoints.chatKeysSave, {
        publicKey: JSON.stringify(publicKeyJwk),
        signPublicKey: JSON.stringify(signPublicKeyJwk),
        keyType: 'RSA'
      });
      console.log('Public keys saved to server');
      logger.crypto('✅', 'Public keys saved to server');
    } catch (e) {
      console.error('Failed to save public keys to server:', e);
      logger.error('Failed to save public keys to server:', e);
    }
  }, 1000);
}

/**
 * Разблокировка ключей с автоматической генерацией пароля (для использования после initEncryption)
 */
export async function unlockKeys(): Promise<EncryptionKeys | null> {
  const saltBase64 = localStorage.getItem('chat_master_salt');
  if (!saltBase64) {
    console.error('❌ No master salt found - keys not initialized');
    return null;
  }

  try {
    const { authStore } = await import('@/shared/store/auth');
    const userId = authStore.getState().user?.id;
    
    if (!userId) {
      console.error('❌ Cannot unlock: no user ID available');
      return null;
    }
    
    console.log('🔐 Deriving master password from user ID...');
    const password = await deriveMasterPasswordFromUser(userId);
    
    console.log('🔓 Attempting to load keys from secure storage...');
    let keys = await loadKeys(password);
    
    if (!keys) {
      console.warn('⚠️ Primary unlock failed. Attempting legacy migration fallback...');
      const legacy = await loadKeysLegacy();
      if (legacy) {
        console.log('🔄 Migrating legacy keys during unlock...');
        await saveKeys(legacy, password);
        keys = await loadKeys(password);
        if (keys) {
          console.log('✅ Legacy keys migrated successfully');
        }
      }
    }
    
    if (keys) {
      console.log('✅ Keys unlocked successfully');
    } else {
      console.error('❌ Failed to unlock keys - no keys available');
    }
    return keys;
  } catch (e) {
    console.error('❌ Exception during key unlock:', e);
    return null;
  }
}

/**
 * Проверить нужна ли разблокировка ключей
 */
export function needsUnlock(): boolean {
  return !!localStorage.getItem('chat_master_salt');
}

/**
 * Автоматическая деривация мастер-пароля из учетных данных пользователя
 * Использует userId + серверный секрет для безопасной деривации
 * Серверный секрет хранится на сервере и доступен только аутентифицированному пользователю
 */
async function deriveMasterPasswordFromUser(userId: string): Promise<string> {
  try {
    // Пытаемся получить серверный секрет
    const { http } = await import('@/shared/api/http');
    const { endpoints } = await import('@/shared/api/endpoints');
    
    let serverSecret: string;
    
    try {
      const { data } = await http.get<{ encryptionSalt?: string }>(endpoints.chatKeysGet(userId));
      
      if (data.encryptionSalt) {
        serverSecret = data.encryptionSalt;
        console.log('✅ Retrieved server encryption salt');
      } else {
        // Генерируем новый серверный секрет
        console.log('⚠️ No server encryption salt found, generating new one...');
        serverSecret = generateRandomSalt();
        
        // Сохраняем на сервер
        await http.post(endpoints.chatKeysSave, {
          encryptionSalt: serverSecret
        });
        console.log('✅ Server encryption salt saved');
      }
    } catch (e) {
      // Если не удалось получить с сервера, генерируем новый
      console.warn('⚠️ Failed to get server salt, generating new one:', e);
      serverSecret = generateRandomSalt();
      
      try {
        await http.post(endpoints.chatKeysSave, {
          encryptionSalt: serverSecret
        });
      } catch (saveError) {
        console.error('Failed to save server salt:', saveError);
      }
    }
    
    // Комбинируем userId + серверный секрет
    const input = `architech-encryption-v1:${userId}:${serverSecret}`;
    
    // Хэшируем через SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Конвертируем в hex для использования как пароль
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (e) {
    console.error('❌ Failed to derive master password:', e);
    // Fallback на userId (небезопасно, но лучше чем ничего)
    console.warn('⚠️ Falling back to userId-only derivation (less secure)');
    logger.warn('Falling back to userId-only derivation (less secure)');
    const input = `architech-chat-encryption-${userId}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
}

/**
 * Генерация случайной соли для серверного хранения
 */
function generateRandomSalt(): string {
  const array = new Uint8Array(32); // 256 бит
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Полный сброс и переинициализация ключей шифрования
 * Используется когда старые ключи не могут быть разблокированы
 */
export async function resetAndReinitializeKeys(): Promise<EncryptionKeys | null> {
  console.warn('⚠️ Resetting encryption keys...');
  logger.warn('Resetting encryption keys...');
  
  try {
    // Очищаем все старые данные
    await clearAllKeys();
    
    // Инициализируем заново
    await initEncryption();
    
    // Пытаемся разблокировать новые ключи
    const keys = await unlockKeys();
    
    if (keys) {
      console.log('✅ Keys reset and reinitialized successfully');
      logger.crypto('✅', 'Keys reset and reinitialized successfully');
    } else {
      console.error('❌ Failed to reinitialize keys after reset');
      logger.error('Failed to reinitialize keys after reset');
    }
    
    return keys;
  } catch (e) {
    console.error('❌ Failed to reset and reinitialize keys:', e);
    logger.error('Failed to reset and reinitialize keys:', e);
    return null;
  }
}
