import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchNotifications } from '@/features/notifications';
import { useClubEvent } from '@/realtime/RealtimeProvider';
import { colors, spacing } from '@/theme/colors';

// После входа клиент сразу попадает на QR-сканер — это основная страница.
export const unstable_settings = { initialRouteName: 'scan' };

/** Колокольчик уведомлений с бейджем непрочитанных. */
function NotificationsBell() {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    const list = await fetchNotifications();
    setUnread(list.filter((n) => !n.read).length);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useClubEvent('notification', refresh);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      style={styles.bell}
      accessibilityRole="button"
      accessibilityLabel="Уведомления"
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Иконка профиля в шапке (профиль вынесен из вкладок в стек-роут). */
function ProfileButton() {
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      hitSlop={8}
      style={{ paddingHorizontal: spacing.md }}
      accessibilityRole="button"
      accessibilityLabel="Профиль"
    >
      <Ionicons name="person-circle-outline" size={26} color={colors.text} />
    </Pressable>
  );
}

/** Центральная приподнятая кнопка «Скан» — главное действие клиента. */
function ScanTabButton({ onPress, accessibilityState }: any) {
  const focused = !!accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      style={styles.scanButton}
      accessibilityRole="button"
      accessibilityLabel="Скан"
    >
      <View style={styles.scanCircle}>
        <Ionicons name="qr-code" size={28} color="#fff" />
      </View>
      <Text style={[styles.scanLabel, focused && styles.scanLabelActive]}>Скан</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <View style={styles.headerRight}>
            <NotificationsBell />
            <ProfileButton />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Брони',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Скан',
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Кошелёк',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  bell: { paddingHorizontal: spacing.sm },
  badge: {
    position: 'absolute',
    top: -2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scanButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -20,
    marginBottom: 2,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  scanLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  scanLabelActive: { color: colors.primary },
});
