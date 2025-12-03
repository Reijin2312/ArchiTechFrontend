import { create } from "zustand";

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
    // Clear all caches on logout for security
    set({ user: null, accessToken: null });
    // Note: Chat key caches in SocialFloatingButton will be cleared on WebSocket disconnect
  },
}));