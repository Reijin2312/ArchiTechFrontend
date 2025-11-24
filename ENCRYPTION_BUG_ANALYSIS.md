# 🔍 Комплексный анализ багов системы шифрования чата

## 📋 Обзор проблем

Выявлено **2 критических бага** в системе E2E шифрования чата:

1. **PostgreSQL Encoding Error (500)** - при создании первого чата
2. **Key Persistence Error** - сообщения не расшифровываются после перезагрузки страницы

---

## 🐛 БАГ #1: PostgreSQL JSONB Encoding Error (500 Status)

### Симптомы
```
org.postgresql.util.PSQLException: я┐╝я┐╝я┐╝я┐╝ я┐╝я┐╝ я┐╝я┐╝я┐╝я┐╝
```

При попытке создать первый чат и отправить сообщение возникает ошибка PostgreSQL с искажёнными символами.

### Причина
**Backend**: `ChatRepo.java:sendMessage()` - неправильная передача JSON в JSONB колонку PostgreSQL.

#### Проблемный код:
```java
// ChatRepo.java:140-147
String insertSql = "INSERT INTO chat_messages (..., encryption_metadata) " +
                  "VALUES (?, ?, ?, ?, ?, ?::jsonb)";  // ❌ НЕПРАВИЛЬНО

ps.setString(6, encryptionMetadata);  // encryptionMetadata - уже JSON string
```

#### Что происходит:
1. Frontend отправляет `encryptionMetadata` как **JavaScript Object**
2. `ChatHandler.java:214` конвертирует его в JSON string через `mapper.writeValueAsString()`
3. `ChatRepo.java` получает **двойной JSON string** (escaped)
4. PostgreSQL пытается распарсить испорченный JSON → **encoding error**

### Решение
```java
// ChatRepo.java - ИСПРАВЛЕНИЕ
String insertSql = "INSERT INTO chat_messages (..., encryption_metadata) " +
                  "VALUES (?, ?, ?, ?, ?, ?::jsonb)";

if (encryptionMetadata != null && !encryptionMetadata.isEmpty()) {
    // ✅ Используем setObject с правильным типом
    ps.setObject(6, encryptionMetadata, java.sql.Types.OTHER);
} else {
    ps.setNull(6, java.sql.Types.OTHER);
}
```

**ИЛИ** альтернатива - использовать PGobject:
```java
if (encryptionMetadata != null && !encryptionMetadata.isEmpty()) {
    org.postgresql.util.PGobject jsonObject = new org.postgresql.util.PGobject();
    jsonObject.setType("jsonb");
    jsonObject.setValue(encryptionMetadata);
    ps.setObject(6, jsonObject);
}
```

---

## 🐛 БАГ #2: Chat Key Не Сохраняется/Загружается После Перезагрузки

### Симптомы
```
🔒 [Сообщение зашифровано старым ключом и не может быть расшифровано. Удалите чат и начните заново.]
```

При каждом рестарте страницы:
- Генерируется **новый** chat key
- Старые сообщения невозможно расшифровать
- Приходится удалять чат и создавать заново

### Причина
**Frontend**: `SocialFloatingButton.tsx` - **chat key не загружается из сервера при инициализации**.

#### Проблемный flow:

1. **Первая загрузка** (когда чат создаётся):
   ```typescript
   // openChatWith() или sendMessageToUser()
   const chatKey = await encryption.generateChatKey();  // ✅ Генерируется
   const wrappedForMe = await encryption.wrapChatKey(chatKey, currentKeys.publicKey);
   
   // ✅ Сохраняется на сервер
   await http.post(endpoints.chatCreate, { wrappedKeyForMe, ... });
   
   // ✅ Кэшируется в памяти
   setChatKeys(prev => new Map(prev).set(chatId, chatKey));
   ```

2. **После перезагрузки страницы**:
   ```typescript
   // loadMessages() вызывается
   const chatKey = await ensureChatKey(chatId);
   
   // ensureChatKey() проверяет кэш
   if (chatKeys.has(chatId)) { /* кэш пустой после reload */ }
   
   // Пытается загрузить с сервера
   const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
   // ❌ ОШИБКА: Wrapped key есть на сервере, но НЕ загружается
   
   // ❌ Откат на generateAndSaveChatKey()
   // ❌ Генерируется НОВЫЙ ключ → старые сообщения не расшифровать
   ```

### Root Cause Analysis

#### Проблема в `ensureChatKey()`:
```typescript
// SocialFloatingButton.tsx:343-372
try {
    const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
    const chatKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
    setChatKeys(prev => new Map(prev).set(chatId, chatKey));
    return chatKey;
} catch (err: any) {
    // ❌ ПРОБЛЕМА: 404 означает "нет wrapped key"
    // Но возможно другая ошибка (network, auth, etc.)
    if (err?.response?.status === 404) {
        return await generateAndSaveChatKey(chatId);  // ❌ Генерируем новый!
    }
}
```

#### Дополнительная проблема в `generateAndSaveChatKey()`:
```typescript
// КРИТИЧЕСКАЯ ОШИБКА: Не проверяет существование wrapped key перед генерацией!
const chatKey = await encryption.generateChatKey();  // ❌ Всегда новый ключ
```

**Результат**: При каждой перезагрузке генерируется новый chat key → все старые сообщения теряются.

### Решение

#### 1. Исправить `ensureChatKey()` - добавить проверку существования wrapped key:
```typescript
const ensureChatKey = async (chatId: number): Promise<CryptoKey | null> => {
    // Проверяем кэш
    if (chatKeys.has(chatId)) {
        return chatKeys.get(chatId)!;
    }
    
    // ✅ Проверяем ключи шифрования
    let currentKeys = encryptionKeys;
    if (!currentKeys) {
        currentKeys = await encryption.unlockKeys();
        if (currentKeys) {
            setEncryptionKeys(currentKeys);
        } else {
            console.error('Failed to unlock encryption keys');
            return null;
        }
    }
    
    try {
        // ✅ Пытаемся загрузить существующий wrapped key
        const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
        
        if (data.wrappedKey) {
            // ✅ Unwrap существующий ключ
            const chatKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
            setChatKeys(prev => new Map(prev).set(chatId, chatKey));
            return chatKey;
        }
    } catch (err: any) {
        // ✅ ТОЛЬКО при 404 генерируем новый ключ
        if (err?.response?.status === 404) {
            console.log('No wrapped key found, generating new one...');
            return await generateAndSaveChatKey(chatId);
        }
        
        // ❌ Для других ошибок - не генерируем новый ключ!
        console.error('Failed to get wrapped key:', err);
        return null;
    }
    
    return null;
};
```

#### 2. Исправить `generateAndSaveChatKey()` - убрать дублирование:
```typescript
const generateAndSaveChatKey = async (chatId: number): Promise<CryptoKey | null> => {
    let currentKeys = encryptionKeys || await encryption.unlockKeys();
    if (!currentKeys) {
        console.error('Failed to unlock encryption keys');
        return null;
    }
    
    try {
        // ⚠️ ВАЖНО: Проверяем еще раз, нет ли wrapped key на сервере
        // (защита от race condition)
        try {
            const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
            if (data.wrappedKey) {
                console.log('Wrapped key already exists, using it instead of generating new');
                const existingKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
                setChatKeys(prev => new Map(prev).set(chatId, existingKey));
                return existingKey;
            }
        } catch (e) {
            // 404 = OK, можно генерировать
        }
        
        // ✅ Генерируем новый AES-256 ключ
        const chatKey = await encryption.generateChatKey();
        
        // ✅ Wrap для себя
        const wrappedForMe = await encryption.wrapChatKey(chatKey, currentKeys.publicKey);
        
        // ✅ Попытка wrap для собеседника (optional)
        const chat = chats.find(c => c.chatId === chatId);
        let recipientWrappedKey: string | null = null;
        
        if (chat) {
            try {
                const recipientKeys = await ensureRecipientKey(chat.participantId);
                if (recipientKeys) {
                    recipientWrappedKey = await encryption.wrapChatKey(chatKey, recipientKeys.encryptKey);
                }
            } catch (e) {
                console.warn('Could not wrap key for recipient:', e);
            }
        }
        
        // ✅ Сохраняем wrapped keys на сервер
        await http.post(endpoints.chatWrappedKeySave, {
            chatId,
            wrappedKey: wrappedForMe
        });
        
        if (recipientWrappedKey && chat) {
            await http.post(endpoints.chatWrappedKeySaveForParticipant, {
                chatId,
                participantId: chat.participantId,
                wrappedKey: recipientWrappedKey
            });
        }
        
        // ✅ Кэшируем
        setChatKeys(prev => new Map(prev).set(chatId, chatKey));
        return chatKey;
        
    } catch (err) {
        console.error('Failed to generate and save chat key:', err);
        return null;
    }
};
```

#### 3. Добавить предзагрузку chat keys при открытии чата:
```typescript
// В useEffect при выборе чата
useEffect(() => {
    if (!selectedChat || !isOpen) return;
    
    // ✅ Предзагрузить chat key перед загрузкой сообщений
    (async () => {
        const chatKey = await ensureChatKey(selectedChat);
        if (chatKey) {
            console.log('✅ Chat key loaded for chatId:', selectedChat);
            loadMessages(selectedChat, false);
        } else {
            console.error('❌ Failed to load chat key for chatId:', selectedChat);
            setMessages([{ 
                messageId: -1, 
                senderId: '', 
                encryptedContent: '[Не удалось загрузить ключ шифрования чата]',
                messageType: 'text',
                imagePath: null,
                createdAt: new Date().toISOString()
            }]);
        }
    })();
}, [selectedChat, isOpen]);
```

---

## 🔐 Дополнительные проблемы безопасности

### 3. Автоматическая генерация мастер-пароля небезопасна

**Текущая реализация**:
```typescript
// encryption.ts:deriveMasterPasswordFromUser()
const input = `architech-encryption-v1:${userId}:${serverSecret}`;
const hash = await crypto.subtle.digest('SHA-256', input);
```

**Проблема**: 
- Пароль детерминирован (всегда одинаковый для userId)
- Если украдут userId + serverSecret → все ключи скомпрометированы
- Нет защиты при краже токена/сессии

**Рекомендация**: 
- Запрашивать **настоящий пароль** от пользователя при первом входе
- Использовать PBKDF2/Argon2 для деривации ключа
- Хранить salt в localStorage (как сейчас)

---

## 📊 Приоритеты исправления

| Приоритет | Баг | Сложность | Время |
|-----------|-----|-----------|-------|
| **P0** | PostgreSQL JSONB encoding | Низкая | 5 мин |
| **P0** | Chat key не загружается | Средняя | 15 мин |
| P1 | Мастер-пароль автогенерация | Высокая | 2 часа |

---

## ✅ План исправлений

### Шаг 1: Исправить PostgreSQL encoding (БАГ #1)
- [ ] Изменить `ChatRepo.java:sendMessage()` использовать `setObject(Types.OTHER)`
- [ ] Протестировать отправку сообщений с metadata

### Шаг 2: Исправить chat key persistence (БАГ #2)
- [ ] Переписать `ensureChatKey()` с правильной обработкой ошибок
- [ ] Добавить double-check в `generateAndSaveChatKey()`
- [ ] Добавить предзагрузку chat key в useEffect

### Шаг 3: Тестирование
- [ ] Создать чат → отправить сообщение → перезагрузить страницу → проверить расшифровку
- [ ] Проверить что old messages расшифровываются
- [ ] Проверить что новые сообщения тоже работают

### Шаг 4: (Опционально) Улучшить безопасность
- [ ] Добавить UI для ввода мастер-пароля
- [ ] Реализовать PBKDF2 деривацию
- [ ] Добавить миграцию старых ключей

---

## 🎯 Выводы

**Оба бага - это проблемы реализации, не архитектуры**:
1. PostgreSQL encoding - простая ошибка типа данных
2. Chat key persistence - логическая ошибка в обработке загрузки ключей

После исправления система E2E шифрования будет работать корректно.
