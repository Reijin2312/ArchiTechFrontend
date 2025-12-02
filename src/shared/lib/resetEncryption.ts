/**
 * Утилита для полного сброса шифрования чата
 * Используется при критических ошибках с IndexedDB или ключами
 * 
 * Вызов из консоли браузера:
 * import { resetChatEncryption } from '@/shared/lib/resetEncryption'
 * await resetChatEncryption()
 */

import { clearAllKeys } from './encryption';
import { logger } from './logger';

/**
 * Полный сброс всех данных шифрования
 * ВНИМАНИЕ: Это удалит все ключи шифрования и историю чата станет нечитаемой!
 */
export async function resetChatEncryption(): Promise<void> {
  const confirmed = confirm(
    '⚠️ ВНИМАНИЕ!\n\n' +
    'Это удалит ВСЕ ключи шифрования.\n' +
    'После этого:\n' +
    '• Старые сообщения станут нечитаемыми\n' +
    '• Вам придётся пересоздать все чаты\n' +
    '• Собеседники должны будут сделать то же самое\n\n' +
    'Продолжить?'
  );

  if (!confirmed) {
    console.log('❌ Сброс отменён пользователем');
    return;
  }

  console.log('🔄 Начинается полный сброс шифрования...');
  logger.warn('Starting full encryption reset...');

  try {
    // 1. Очищаем все ключи через API
    console.log('1️⃣ Очистка ключей через API...');
    await clearAllKeys();

    // 2. Принудительно удаляем IndexedDB
    console.log('2️⃣ Удаление IndexedDB...');
    await deleteIndexedDB('SecureChatStorage');

    // 3. Очищаем все связанные записи в localStorage
    console.log('3️⃣ Очистка localStorage...');
    const keysToRemove = [
      'chat_public_key',
      'chat_private_key',
      'chat_sign_public_key',
      'chat_sign_private_key',
      'chat_master_salt',
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`  ✓ Удалён: ${key}`);
      }
    });

    // 4. Опционально: очищаем sessionStorage
    console.log('4️⃣ Очистка sessionStorage...');
    sessionStorage.clear();

    console.log('\n✅ Сброс завершён успешно!');
    console.log('💡 Перезагрузите страницу для инициализации новых ключей.');
    
    logger.crypto('✅', 'Encryption reset completed successfully');

    // Предлагаем перезагрузить страницу
    const reload = confirm('Перезагрузить страницу сейчас?');
    if (reload) {
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Ошибка при сбросе шифрования:', error);
    logger.error('Failed to reset encryption:', error);
    
    alert(
      '❌ Не удалось полностью сбросить шифрование.\n\n' +
      'Попробуйте:\n' +
      '1. Закрыть все вкладки с приложением\n' +
      '2. Очистить данные сайта в настройках браузера\n' +
      '3. Перезапустить браузер'
    );
  }
}

/**
 * Удаление IndexedDB базы данных
 */
function deleteIndexedDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🗑️ Удаление базы данных: ${dbName}...`);
    
    const request = indexedDB.deleteDatabase(dbName);
    
    request.onsuccess = () => {
      console.log(`✅ База данных ${dbName} успешно удалена`);
      resolve();
    };
    
    request.onerror = () => {
      console.error(`❌ Ошибка удаления базы данных ${dbName}:`, request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.warn(`⚠️ Удаление базы данных ${dbName} заблокировано`);
      console.warn('💡 Закройте все вкладки с приложением и попробуйте снова');
      reject(new Error('Database deletion blocked - close all tabs'));
    };
  });
}

/**
 * Проверка состояния шифрования
 */
export async function checkEncryptionStatus(): Promise<void> {
  console.log('🔍 Проверка состояния шифрования...\n');

  // Проверка localStorage
  console.log('📦 localStorage:');
  const lsKeys = [
    'chat_public_key',
    'chat_private_key',
    'chat_sign_public_key', 
    'chat_sign_private_key',
    'chat_master_salt',
  ];
  
  lsKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? 'присутствует' : 'отсутствует'}`);
  });

  // Проверка IndexedDB
  console.log('\n💾 IndexedDB:');
  try {
    const databases = await indexedDB.databases();
    const secureChatDB = databases.find(db => db.name === 'SecureChatStorage');
    
    if (secureChatDB) {
      console.log(`  ✅ SecureChatStorage: версия ${secureChatDB.version}`);
    } else {
      console.log('  ❌ SecureChatStorage: не найдена');
    }
  } catch (e) {
    console.log('  ⚠️ Не удалось получить список баз данных');
  }

  console.log('\n✅ Проверка завершена');
}

// Экспортируем для использования из консоли браузера
if (typeof window !== 'undefined') {
  (window as any).resetChatEncryption = resetChatEncryption;
  (window as any).checkEncryptionStatus = checkEncryptionStatus;
  console.log('💡 Утилиты сброса шифрования доступны:');
  console.log('  - resetChatEncryption() - полный сброс');
  console.log('  - checkEncryptionStatus() - проверка состояния');
}
