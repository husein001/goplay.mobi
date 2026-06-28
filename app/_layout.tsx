import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';
import { colors } from '@/theme/colors';

/**
 * Навигация под гейтом авторизации. Пока сессия не восстановлена — спиннер.
 * Дальше через `Stack.Protected` показываем либо приватную зону (вкладки +
 * профиль), либо экран входа. Гость никуда не попадает (полный гейт).
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'Профиль' }} />
        <Stack.Screen name="notifications" options={{ title: 'Уведомления' }} />
        <Stack.Screen name="new-booking" options={{ title: 'Новая бронь' }} />
        <Stack.Screen name="chat" options={{ title: 'Чат с админом' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RealtimeProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </RealtimeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
