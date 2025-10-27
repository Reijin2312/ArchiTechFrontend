import { create } from 'zustand';

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
  clear: () => set({ user: null, accessToken: null }),
}));
