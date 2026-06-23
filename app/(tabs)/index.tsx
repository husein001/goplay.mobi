import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { Club } from '@/api/types';
import { Badge, Card, Center, Muted, Subtitle } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

export default function ClubsScreen() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await clubApi.listClubs();
      setClubs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить клубы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Center>
        <Muted>Загружаем клубы…</Muted>
      </Center>
    );
  }

  return (
    <FlatList
      data={clubs}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={
        <Center>
          <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
          <Muted style={{ marginTop: spacing.md }}>{error || 'Клубов пока нет'}</Muted>
        </Center>
      }
      renderItem={({ item }) => <ClubRow club={item} />}
    />
  );
}

function ClubRow({ club }: { club: Club }) {
  return (
    <Link href={`/club/${club.slug}`} asChild>
      <Pressable>
        <Card style={styles.card}>
          {club.cover_url ? (
            <Image source={{ uri: club.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Ionicons name="game-controller" size={28} color={colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Subtitle numberOfLines={1}>{club.name}</Subtitle>
            <Muted numberOfLines={1} style={{ marginTop: 2 }}>
              {[club.city, club.address].filter(Boolean).join(' · ') || 'Адрес уточняется'}
            </Muted>
            <View style={styles.metaRow}>
              {club.is_open != null && (
                <Badge label={club.is_open ? 'Открыт' : 'Закрыт'} tone={club.is_open ? 'success' : 'danger'} />
              )}
              {club.price_from != null && <Muted>от {club.price_from} c/час</Muted>}
              {club.distance_km != null && <Muted>{club.distance_km.toFixed(1)} км</Muted>}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cover: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
