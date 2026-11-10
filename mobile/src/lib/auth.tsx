import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';
import { api, getToken, setToken, type User } from './api';

const ONBOARDED_KEY = 'yako.onboarded';

type AuthState = {
  ready: boolean;
  user: User | null;
  onboarded: boolean;
  finishOnboarding: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ data: User }>('/me');
      setUser(res.data);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setOnboarded((await storage.get(ONBOARDED_KEY)) === '1');
      if (await getToken()) await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const value = useMemo<AuthState>(() => ({
    ready,
    user,
    onboarded,
    finishOnboarding: async () => {
      await storage.set(ONBOARDED_KEY, '1');
      setOnboarded(true);
    },
    signIn: async (token, u) => {
      await setToken(token);
      setUser(u);
    },
    signOut: async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch {}
      await setToken(null);
      setUser(null);
    },
    refresh,
  }), [ready, user, onboarded, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}
