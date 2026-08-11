import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { setAuthToken } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        setAuthToken(token);
        set({ token });
      },
      setLoading: (isLoading) => set({ isLoading }),
      login: (user, token) => {
        setAuthToken(token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'paralee-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
        state?.setLoading(false);
      },
    }
  )
);
