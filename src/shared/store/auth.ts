import { create } from 'zustand';


type User = { id: string; username: string; email?: string };


type State = {
user: User | null;
accessToken: string | null;
refreshToken: string | null;
};


type Actions = {
setTokens: (a: string, r: string) => void;
setUser: (u: User | null) => void;
logout: () => void;
loadFromStorage: () => void;
};


export const authStore = create<State &     Actions>((set, get) => ({
user: null,
accessToken: null,
refreshToken: null,
setTokens: (a, r) => {
set({ accessToken: a, refreshToken: r });
localStorage.setItem('tokens', JSON.stringify({ a, r }));
},
setUser: (u) => set({ user: u }),
logout: () => {
set({ user: null, accessToken: null, refreshToken: null });
localStorage.removeItem('tokens');
},
loadFromStorage: () => {
const raw = localStorage.getItem('tokens');
if (!raw) return;
try { const { a, r } = JSON.parse(raw); set({ accessToken: a, refreshToken: r }); } catch {}
}
}));