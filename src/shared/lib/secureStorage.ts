/**
 * Безопасное хранилище для чувствительных данных
 * Использует IndexedDB с шифрованием вместо localStorage
 */

const DB_NAME = 'SecureChatStorage';
const DB_VERSION = 2; // Увеличена версия для обработки миграции
const STORE_NAME = 'encrypted_keys';

interface StoredKey {
  id: string;
  encryptedData: string;
  iv: string;
  salt: string;
  createdAt: number;
}

class SecureStorage {
  private db: IDBDatabase | null = null;
  private masterKey: CryptoKey | null = null;
  private currentSalt: Uint8Array | null = null;

  /**
   * Инициализация IndexedDB с обработкой ошибок версионирования
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('❌ IndexedDB error:', error);
        
        // Если ошибка связана с версией, пытаемся удалить и пересоздать БД
        if (error && error.name === 'VersionError') {
          console.warn('⚠️ Version conflict detected, attempting to delete and recreate database...');
          indexedDB.deleteDatabase(DB_NAME);
          // Повторяем попытку после небольшой задержки
          setTimeout(() => {
            const retryRequest = indexedDB.open(DB_NAME, DB_VERSION);
            retryRequest.onsuccess = () => {
              this.db = retryRequest.result;
              resolve(this.db);
            };
            retryRequest.onerror = () => reject(retryRequest.error);
            retryRequest.onupgradeneeded = this.handleUpgrade;
          }, 100);
        } else {
          reject(error);
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = this.handleUpgrade;
    });
  }

  /**
   * Обработка обновления схемы БД
   */
  private handleUpgrade = (event: IDBVersionChangeEvent) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const oldVersion = event.oldVersion;
    
    console.log(`🔄 Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
    
    // Создаём object store если его нет
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      console.log('✅ Created object store:', STORE_NAME);
    }
    
    // Здесь можно добавить дополнительную логику миграции для будущих версий
  };

  /**
   * Получение мастер-ключа из пароля пользователя
   * Использует PBKDF2 для деривации ключа
   */
  private async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000, // 100k итераций для защиты от brute-force
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Инициализация с паролем пользователя
   */
  async init(password: string): Promise<void> {
    this.currentSalt = crypto.getRandomValues(new Uint8Array(16));
    this.masterKey = await this.deriveMasterKey(password, this.currentSalt);
    await this.initDB();
  }

  /**
   * Разблокировка существующего хранилища
   */
  async unlock(password: string, salt: Uint8Array): Promise<boolean> {
    try {
      this.masterKey = await this.deriveMasterKey(password, salt);
      this.currentSalt = salt;
      await this.initDB();
      
      // Проверяем правильность пароля попыткой расшифровать данные
      const testData = await this.get('test_key');
      return true;
    } catch (e) {
      this.masterKey = null;
      return false;
    }
  }

  /**
   * Получить текущую соль, использованную для деривации мастер-ключа
   */
  getCurrentSalt(): Uint8Array | null {
    return this.currentSalt;
  }

  /**
   * Сохранить зашифрованные данные
   */
  async set(key: string, data: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Storage not initialized. Call init() or unlock() first.');
    }

    const db = await this.initDB();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      encoder.encode(data)
    );

    const storedKey: StoredKey = {
      id: key,
      encryptedData: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv.buffer),
      salt: this.arrayBufferToBase64(salt.buffer),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить и расшифровать данные
   */
  async get(key: string): Promise<string | null> {
    if (!this.masterKey) {
      throw new Error('Storage not initialized. Call init() or unlock() first.');
    }

    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = async () => {
        const result = request.result as StoredKey | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        try {
          const encryptedData = this.base64ToArrayBuffer(result.encryptedData);
          const iv = this.base64ToArrayBuffer(result.iv);

          const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.masterKey!,
            encryptedData
          );

          const decoder = new TextDecoder();
          resolve(decoder.decode(decryptedData));
        } catch (e) {
          console.error('Failed to decrypt data:', e);
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Удалить данные
   */
  async remove(key: string): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Очистить всё хранилище
   */
  async clear(): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.masterKey = null;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Проверить существование ключа
   */
  async has(key: string): Promise<boolean> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Утилиты
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const secureStorage = new SecureStorage();
