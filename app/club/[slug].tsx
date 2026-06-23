import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { ClubDetail, Zone } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, Center, Muted, Subtitle, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

const DURATIONS = [60, 120, 180]; // минуты

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [clubData, setClubData] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneId, setZoneId] = useState<string | undefined>();
  const [duration, setDuration] = useState(60);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await clubApi.getClub(String(slug));
        setClubData(data);
        setZoneId(data.zones?.[0]?.id);
      } catch (e: any) {
        Alert.alert('Ошибка', e?.message || 'Не удалось загрузить клуб');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function book() {
    if (!clubData) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setBooking(true);
    try {
      await clubApi.createBooking({
        clubId: clubData.id,
        zoneId,
        startsAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        durationMinutes: duration,
      });
      Alert.alert('Бронь создана', 'Статус смотрите во вкладке «Брони».', [
        { text: 'OK', onPress: () => router.push('/(tabs)/bookings') },
      ]);
    } catch (e: any) {
      Alert.alert('Не удалось забронировать', e?.message || 'Попробуйте позже');
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <Center>
        <ActivityIndicator color={colors.primary} />
      </Center>
    );
  }

  if (!clubData) {
    return (
      <Center>
        <Muted>Клуб не найден</Muted>
      </Center>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: clubData.name }} />

      {clubData.cover_url ? (
        <Image source={{ uri: clubData.cover_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Ionicons name="game-controller" size={36} color={colors.textMuted} />
        </View>
      )}

      <View>
        <Title>{clubData.name}</Title>
        <Muted style={{ marginTop: spacing.xs }}>
          {[clubData.city, clubData.address].filter(Boolean).join(' · ') || 'Адрес уточняется'}
        </Muted>
        <View style={styles.metaRow}>
          {clubData.is_open != null && (
            <Badge label={clubData.is_open ? 'Открыт' : 'Закрыт'} tone={clubData.is_open ? 'success' : 'danger'} />
          )}
          {clubData.phone && <Muted>{clubData.phone}</Muted>}
        </View>
      </View>

      {clubData.description ? <Muted>{clubData.description}</Muted> : null}

      {clubData.zones && clubData.zones.length > 0 && (
        <Card style={{ gap: spacing.md }}>
          <Subtitle>Зона</Subtitle>
          {clubData.zones.map((z) => (
            <ZoneRow key={z.id} zone={z} selected={z.id === zoneId} onSelect={() => setZoneId(z.id)} />
          ))}
        </Card>
      )}

      <Card style={{ gap: spacing.md }}>
        <Subtitle>Длительность</Subtitle>
        <View style={styles.durations}>
          {DURATIONS.map((d) => {
            const active = d === duration;
            return (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[styles.durChip, active && styles.durChipActive]}
              >
                <Muted style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                  {d / 60} ч
                </Muted>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button title={user ? 'Забронировать' : 'Войти и забронировать'} loading={booking} onPress={book} />
    </ScrollView>
  );
}

function ZoneRow({ zone, selected, onSelect }: { zone: Zone; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable onPress={onSelect} style={[styles.zone, selected && styles.zoneActive]}>
      <View style={{ flex: 1 }}>
        <Muted style={{ color: colors.text, fontWeight: '600' }}>{zone.name}</Muted>
        {zone.seats_free != null && <Muted style={{ fontSize: 12 }}>Свободно: {zone.seats_free}</Muted>}
      </View>
      <Muted style={{ color: colors.text }}>{zone.price_per_hour} c/час</Muted>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.textMuted}
        style={{ marginLeft: spacing.sm }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  cover: { width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  durations: { flexDirection: 'row', gap: spacing.sm },
  durChip: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}11` },
});
