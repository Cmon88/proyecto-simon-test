import { create } from 'zustand';
import { api, User } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: (() => {
    const raw = localStorage.getItem('simon.user');
    return raw ? (JSON.parse(raw) as User) : null;
  })(),
  token: localStorage.getItem('simon.token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
      localStorage.setItem('simon.token', res.token);
      localStorage.setItem('simon.user', JSON.stringify(res.user));
      set({ token: res.token, user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem('simon.token');
    localStorage.removeItem('simon.user');
    disconnectSocket();
    set({ token: null, user: null });
  },

  hydrate: async () => {
    if (!localStorage.getItem('simon.token')) return;
    try {
      const u = await api.get<User>('/api/auth/me');
      localStorage.setItem('simon.user', JSON.stringify(u));
      set({ user: u });
    } catch {
      // token invalid; the api helper will redirect
    }
  },
}));
