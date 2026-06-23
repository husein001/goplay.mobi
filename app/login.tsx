import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { router } from 'expo-router';
import { API_URL } from '@/config';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/colors';
import { Center, Muted } from '@/components/ui';

/**
 * Steam-вход без изменений на бэкенде: открываем `/api/auth/steam` в WebView,
 * сервер после успешной авторизации редиректит на
 * `${FRONTEND_URL}/auth/callback?token=JWT`. Перехватываем этот переход,
 * достаём token из query и закрываем экран.
 *
 * TODO(backend): когда goplaynet вынесем — добавить редирект на app-scheme
 * (`goplay://auth/callback`) и перейти на expo-web-browser AuthSession.
 */
const STEAM_LOGIN_URL = `${API_URL}/auth/steam`;
const CALLBACK_MATCH = '/auth/callback';

export default function LoginScreen() {
  const { signInWithToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  async function onNav(nav: WebViewNavigation) {
    if (handled.current) return;
    const url = nav.url || '';
    if (!url.includes(CALLBACK_MATCH)) return;

    const token = extractToken(url);
    if (!token) return;

    handled.current = true;
    setBusy(true);
    try {
      await signInWithToken(token);
      router.back();
    } catch {
      handled.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      <WebView
        source={{ uri: STEAM_LOGIN_URL }}
        onNavigationStateChange={onNav}
        incognito
        startInLoadingState
        renderLoading={() => (
          <Center>
            <ActivityIndicator color={colors.primary} />
          </Center>
        )}
      />
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Muted style={{ marginTop: 12 }}>Входим…</Muted>
        </View>
      )}
    </View>
  );
}

function extractToken(url: string): string | null {
  const m = url.match(/[?&]token=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
