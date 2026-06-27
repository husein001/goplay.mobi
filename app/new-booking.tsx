import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { clubApi } from '@/api/clubs';
import type { Booking } from '@/api/types';
import { AUTH_STUB } from '@/config';
import { addLocalBooking, loadBookableClubs, type BookableClub } from '@/features/booking';
import { Button, Center, Muted, Subtitle } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

const TIME_SLOTS = ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const DURATIONS = [
  { minutes: 60, label: '1 ч' },
  { minutes: 120, label: '2 ч' },
  { minutes: 180, label: '3 ч' },
  { minutes: 300, label: '5 ч' },
];

export default function NewBookingScreen() {
  const [clubs, setClubs] = useState<BookableClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string>();
  const [zoneId, setZoneId] = useState<string>();
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [time, setTime] = useState<string>('18:00');
  const [duration, setDuration] = useState<number>(120);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await loadBookableClubs();
      setClubs(list);
      setClubId(list[0]?.id);
      setZoneId(list[0]?.zones[0]?.id);
      setLoading(false);
    })();
  }, []);

  const club = useMemo(() => clubs.find((c) => c.id === clubId), [clubs, clubId]);
  const zone = useMemo(() => club?.zones.find((z) => z.id === zoneId), [club, zoneId]);
  const price = zone ? Math.round((zone.price_per_hour * duration) / 60) : null;

  function pickClub(id: string) {
    setClubId(id);
    const c = clubs.find((x) => x.id === id);
    setZoneId(c?.zones[0]?.id);
  }

  async function submit() {
    if (!club || !zone) {
      Alert.alert('Бронь', 'Выберите клуб и зону');
      return;
    }
    const base = new Date();
    if (day === 'tomorrow') base.setDate(base.getDate() + 1);
    const [h, m] = time.split(':').map(Number);
    base.setHours(h, m, 0, 0);
    const startsAt = base.toISOString();

    setBusy(true);
    try {
      if (AUTH_STUB) {
        const booking: Booking = {
          id: 'local-' + Date.now(),
          club_id: club.id,
          club_name: club.name,
          zone_id: zone.id,
          zone_name: zone.name,
          starts_at: startsAt,
          duration_minutes: duration,
          status: 'confirmed',
          total_amount: price ?? undefined,
          created_at: new Date().toISOString(),
        };
        await addLocalBooking(booking);
      } else {
        await clubApi.createBooking({
          clubId: club.id,
          zoneId: zone.id,
          startsAt,
          durationMinutes: duration,
        });
      }
      Alert.alert('Готово', 'Бронь создана', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось создать бронь');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Center>
        <Muted>Загружаем клубы…</Muted>
      </Center>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Клуб">
        <View style={styles.wrap}>
          {clubs.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === clubId} onPress={() => pickClub(c.id)} />
          ))}
        </View>
      </Section>

      {!!club?.zones.length && (
        <Section title="Зона">
          <View style={styles.wrap}>
            {club.zones.map((z) => (
              <Chip
                key={z.id}
                label={`${z.name} · ${z.price_per_hour} c/ч`}
                selected={z.id === zoneId}
                onPress={() => setZoneId(z.id)}
              />
            ))}
          </View>
        </Section>
      )}

      <Section title="Когда">
        <View style={styles.wrap}>
          <Chip label="Сегодня" selected={day === 'today'} onPress={() => setDay('today')} />
          <Chip label="Завтра" selected={day === 'tomorrow'} onPress={() => setDay('tomorrow')} />
        </View>
        <View style={[styles.wrap, { marginTop: spacing.sm }]}>
          {TIME_SLOTS.map((t) => (
            <Chip key={t} label={t} selected={t === time} onPress={() => setTime(t)} />
          ))}
        </View>
      </Section>

      <Section title="Сколько">
        <View style={styles.wrap}>
          {DURATIONS.map((d) => (
            <Chip
              key={d.minutes}
              label={d.label}
              selected={d.minutes === duration}
              onPress={() => setDuration(d.minutes)}
            />
          ))}
        </View>
      </Section>

      {price != null && (
        <View style={styles.total}>
          <Muted>Итого</Muted>
          <Subtitle style={{ color: colors.text }}>{price} c</Subtitle>
        </View>
      )}

      <Button title="Забронировать" loading={busy} onPress={submit} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Subtitle>{title}</Subtitle>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipActive]}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
