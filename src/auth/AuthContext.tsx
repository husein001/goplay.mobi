import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthToken } from '@/api/client';
import { authApi } from '@/api/auth';
import type { User } from '@/api/types';
import { clearToken, loadToken, saveToken } from './storage';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Сохранить JWT, полученный из Steam-callback, и подтянуть профиль. */
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback(async (t: string | null) => {
    setToken(t);
    setAuthToken(t);
    if (!t) {
      setUser(null);
      return;
    }
    try {
      // Профиль игрока, вошедшего по телефону: mobi-эндпоинт /auth/phone/me
      // возвращает { user }. (Ядровой /api/auth/me отдаёт плоский объект без
      // обёртки и для телефонных юзеров не годится — из-за этого вход «молча» падал.)
      const { user } = await authApi.me();
      if (!user) throw new Error('no user');
      setUser(user);
    } catch {
      // Токен протух — выходим.
      await clearToken();
      setToken(null);
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  // Восстановление сессии при старте.
  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      await applyToken(stored);
      setLoading(false);
    })();
  }, [applyToken]);

  const signInWithToken = useCallback(
    async (t: string) => {
      await saveToken(t);
      await applyToken(t);
    },
    [applyToken],
  );

  const signOut = useCallback(async () => {
    await clearToken();
    await applyToken(null);
  }, [applyToken]);

  const refresh = useCallback(async () => {
    if (token) await applyToken(token);
  }, [token, applyToken]);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, signInWithToken, signOut, refresh }),
    [user, token, loading, signInWithToken, signOut, refresh],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
