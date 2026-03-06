import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('authToken'),
  loading: true,

  setAuth: (token, user) => {
    localStorage.setItem('authToken', token);
    set({ token, user, loading: false });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ token: null, user: null, loading: false });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }

    try {
      const res = await fetch('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { user } = await res.json();
        set({ user, loading: false });
      } else {
        localStorage.removeItem('authToken');
        set({ token: null, user: null, loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },
}));
