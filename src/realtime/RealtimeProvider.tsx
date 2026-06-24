import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/auth/AuthContext';
import { colors, radius, spacing } from '@/theme/colors';
import { connectSocket, disconnectSocket } from './socket';
import { registerPushToken, unregisterPushHandlers } from './push';

/** Уведомление, прилетающее в комнату user:<id> с бэкенда. */
export interface RealtimeNotification {
  id?: string;
  type?: string;
  title?: string;
  body?: string | null;
  created_at?: string;
  meta?: Record<string, unknown> | null;
}

const SocketCtx = createContext<Socket | null>(null);

/**
 * Подключает сокет, пока пользователь авторизован, регистрирует push-токен и
 * показывает живой in-app тост на входящие `notification`. Экраны подписываются
 * на конкретные события через `useClubEvent`.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toast, setToast] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      unregisterPushHandlers();
      setSocket(null);
      return;
    }
    const s = connectSocket(token);
    setSocket(s);

    const onNotif = (n: RealtimeNotification) => {
      if (n && (n.title || n.body)) setToast(n);
    };
    s.on('notification', onNotif);

    // Push-токен устройства (no-op в Expo Go без поддержки — безопасно).
    registerPushToken().catch(() => {});

    return () => { s.off('notification', onNotif); };
  }, [token]);

  // Авто-скрытие тоста.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <SocketCtx.Provider value={socket}>
      {children}
      {toast && <NotificationToast notif={toast} onClose={() => setToast(null)} />}
    </SocketCtx.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketCtx);
}

/** Подписка экрана на realtime-событие. Хендлер всегда «свежий» (через ref). */
export function useClubEvent(event: string, handler: (...args: any[]) => void): void {
  const socket = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!socket) return;
    const h = (...args: any[]) => ref.current(...args);
    socket.on(event, h);
    return () => { socket.off(event, h); };
  }, [socket, event]);
}

function NotificationToast({ notif, onClose }: { notif: RealtimeNotification; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  }, [slide]);

  return (
    <Animated.View
      style={[styles.toastWrap, { top: insets.top + spacing.sm, transform: [{ translateY: slide }] }]}
    >
      <Pressable style={styles.toast} onPress={onClose}>
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          {!!notif.title && <Text style={styles.title} numberOfLines={1}>{notif.title}</Text>}
          {!!notif.body && <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 1000 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  title: { color: colors.text, fontWeight: '700', fontSize: 14 },
  body: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
