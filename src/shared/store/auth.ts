import { create } from 'zustand';
import { clearAllKeys } from '@/shared/lib/encryption';

export type User = { id: string; username: string; email?: string };

type State = { user: User | null; accessToken: string | null };
type Actions = {
  setAuth: (u: User | null, a: string | null) => void;
  clear: () => void;
};

export const authStore = create<State & Actions>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (u, a) => set({ user: u, accessToken: a }),
  clear: () => {
    // 🔒 ИСПРАВЛЕНО: Очищаем все ключи шифрования при logout
    clearAllKeys().catch(err => console.error('Failed to clear encryption keys:', err));
    
    // Очищаем старые небезопасные данные из localStorage
    localStorage.removeItem('chat_private_key');
    localStorage.removeItem('chat_sign_private_key');
    
    set({ user: null, accessToken: null });
  },
}));
