import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { ClubNotification } from '@/api/types';
import { fetchNotifications } from '@/features/notifications';
import { useClubEvent } from '@/realtime/RealtimeProvider';
import { Card, Muted, Subtitle } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

export default function NotificationsScreen() {
  const [items, setItems] = useState<ClubNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await fetchNotifications();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Прилетело новое уведомление по сокету — подтягиваем список.
  useClubEvent('notification', load);

  const unread = items.filter((n) => !n.read).length;

  function markOne(n: ClubNotification) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    clubApi.markRead(n.id).catch(() => {});
  }

  function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    clubApi.markAllRead().catch(() => {});
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        unread > 0 ? (
          <View style={styles.head}>
            <Muted>{unread} непрочитанных</Muted>
            <Pressable onPress={markAll} hitSlop={6}>
              <Muted style={styles.action}>Прочитать всё</Muted>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !loading ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
            <Muted style={{ marginTop: spacing.sm }}>Уведомлений нет</Muted>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => markOne(item)}>
          <Card style={[styles.row, !item.read && styles.unread]}>
            <View style={styles.icon}>
              <Ionicons name={iconFor(item.title)} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Subtitle numberOfLines={1} style={!item.read ? undefined : { color: colors.textMuted }}>
                {item.title}
              </Subtitle>
              {!!item.body && (
                <Muted numberOfLines={2} style={{ marginTop: 2 }}>
                  {item.body}
                </Muted>
              )}
              <Muted style={{ fontSize: 12, marginTop: 2 }}>{formatTime(item.created_at)}</Muted>
            </View>
            {!item.read && <View style={styles.dot} />}
          </Card>
        </Pressable>
      )}
    />
  );
}

function iconFor(title: string): keyof typeof Ionicons.glyphMap {
  const t = (title || '').toLowerCase();
  if (/(брон|booking)/.test(t)) return 'calendar';
  if (/(бонус|друг|реферал|gift|промо)/.test(t)) return 'gift';
  if (/(час|скидк|happy|акци)/.test(t)) return 'flash';
  return 'notifications';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  action: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  unread: { borderColor: colors.primary, borderWidth: 1 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}22`,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});
