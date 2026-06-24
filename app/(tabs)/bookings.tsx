import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { Booking, BookingStatus } from '@/api/types';
import { Badge, Button, Card, Center, Muted, Subtitle } from '@/components/ui';
import { RequireAuth } from '@/components/RequireAuth';
import { useClubEvent, type RealtimeNotification } from '@/realtime/RealtimeProvider';
import { colors, spacing } from '@/theme/colors';

const STATUS_TONE: Record<BookingStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'success',
  seated: 'success',
  completed: 'default',
  cancelled: 'danger',
  no_show: 'danger',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  seated: 'За ПК',
  completed: 'Завершена',
  cancelled: 'Отменена',
  no_show: 'Не пришёл',
};

export default function BookingsScreen() {
  return (
    <RequireAuth>
      <BookingsList />
    </RequireAuth>
  );
}

function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await clubApi.myBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      // оставляем пусто
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Живое обновление: бронь поменяла статус (подтверждена/посадили/отменена).
  useClubEvent('notification', (n: RealtimeNotification) => {
    if (typeof n?.type === 'string' && n.type.startsWith('booking')) load();
  });

  async function cancel(b: Booking) {
    Alert.alert('Отменить бронь?', `${b.club_name ?? 'Клуб'} · ${formatWhen(b.starts_at)}`, [
      { text: 'Назад', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: async () => {
          try {
            await clubApi.cancelBooking(b.id);
            load();
          } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Не удалось отменить');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Center>
        <Muted>Загружаем брони…</Muted>
      </Center>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={
        <Center>
          <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
          <Muted style={{ marginTop: spacing.md }}>У вас пока нет броней</Muted>
        </Center>
      }
      renderItem={({ item }) => {
        const canCancel = item.status === 'pending' || item.status === 'confirmed';
        return (
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Subtitle numberOfLines={1} style={{ flex: 1 }}>
                {item.club_name ?? 'Клуб'}
              </Subtitle>
              <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
            </View>
            <Muted>
              {formatWhen(item.starts_at)} · {item.duration_minutes} мин
              {item.zone_name ? ` · ${item.zone_name}` : ''}
              {item.seat_label ? ` · место ${item.seat_label}` : ''}
            </Muted>
            {item.total_amount != null && <Muted>Сумма: {item.total_amount} c</Muted>}
            {canCancel && (
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Отменить бронь" variant="outline" onPress={() => cancel(item)} />
              </View>
            )}
          </Card>
        );
      }}
    />
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
