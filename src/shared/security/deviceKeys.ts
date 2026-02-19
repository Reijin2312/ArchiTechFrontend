
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface DeviceKeysDB extends DBSchema {
  'device-keys': {
    key: string
    value: {
      deviceId: string
      publicKey: string
      encryptedPrivateKey: string
      privateKeyIv: string
      createdAt: number
      lastUsed: number
    }
  }
}

const DB_NAME = 'device-keys-db'
const DB_VERSION = 1
const STORE_NAME = 'device-keys'

let dbInstance: IDBPDatabase<DeviceKeysDB> | null = null

async function getDB(): Promise<IDBPDatabase<DeviceKeysDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<DeviceKeysDB>(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase<DeviceKeysDB>) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'deviceId' })
      }
    },
  })

  return dbInstance
}

export async function generateDeviceKeypair(): Promise<{
  publicKey: JsonWebKey
  privateKey: JsonWebKey
}> {
  const keypair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  )

  const publicKey = await crypto.subtle.exportKey('jwk', keypair.publicKey)
  const privateKey = await crypto.subtle.exportKey('jwk', keypair.privateKey)

  return { publicKey, privateKey }
}

async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptPrivateKey(
  privateKey: JsonWebKey,
  password: string
): Promise<{ encrypted: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encryptionKey = await deriveEncryptionKey(password, salt)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const privateKeyData = encoder.encode(JSON.stringify(privateKey))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    privateKeyData
  )

  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  }
}

async function decryptPrivateKey(
  encryptedPrivateKey: string,
  iv: string,
  salt: string,
  password: string
): Promise<JsonWebKey> {
  const saltBytes = base64ToArrayBuffer(salt)
  const encryptionKey = await deriveEncryptionKey(password, new Uint8Array(saltBytes))

  const ivBytes = base64ToArrayBuffer(iv)
  const encryptedBytes = base64ToArrayBuffer(encryptedPrivateKey)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    encryptionKey,
    encryptedBytes
  )

  const decoder = new TextDecoder()
  const privateKeyJson = decoder.decode(decrypted)
  return JSON.parse(privateKeyJson)
}

export async function storeDeviceKeypair(
  deviceId: string,
  publicKey: JsonWebKey,
  privateKey: JsonWebKey,
  password: string
): Promise<void> {
  const { encrypted, iv, salt } = await encryptPrivateKey(privateKey, password)

  const db = await getDB()
  await db.put(STORE_NAME, {
    deviceId,
    publicKey: btoa(JSON.stringify(publicKey)),
    encryptedPrivateKey: `${salt}:${encrypted}`,
    privateKeyIv: iv,
    createdAt: Date.now(),
    lastUsed: Date.now(),
  })

  console.log('🔐 Device keypair stored in IndexedDB:', deviceId)
}

export async function loadDevicePrivateKey(
  deviceId: string,
  password: string
): Promise<CryptoKey | null> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, deviceId)

  if (!record) {
    console.warn('⚠️ No device key found for deviceId:', deviceId)
    return null
  }

  try {
    const [salt, encrypted] = record.encryptedPrivateKey.split(':')
    
    const privateKeyJwk = await decryptPrivateKey(
      encrypted,
      record.privateKeyIv,
      salt,
      password
    )

    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['unwrapKey']
    )

    await db.put(STORE_NAME, { ...record, lastUsed: Date.now() })

    return privateKey
  } catch (err) {
    console.error('❌ Failed to decrypt device private key:', err)
    throw new Error('Invalid password or corrupted key')
  }
}

export async function loadDevicePublicKey(deviceId: string): Promise<JsonWebKey | null> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, deviceId)

  if (!record) return null

  return JSON.parse(atob(record.publicKey))
}

export async function hasDeviceKeypair(deviceId: string): Promise<boolean> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, deviceId)
  return record !== undefined
}

export async function deleteDeviceKeypair(deviceId: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, deviceId)
  console.log('🗑️ Device keypair deleted:', deviceId)
}

export async function registerDevicePublicKey(
  deviceId: string,
  publicKey: JsonWebKey
): Promise<void> {
  const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
  
  const response = await fetch(`${apiBase}/api/v1/devices/register`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId,
    },
    body: JSON.stringify({
      deviceId,
      publicKey: btoa(JSON.stringify(publicKey)),
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to register device: ${response.status}`)
  }

  console.log('✅ Device public key registered with server:', deviceId)
}

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
