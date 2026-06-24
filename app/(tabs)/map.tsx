import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { Club } from '@/api/types';
import { Badge, Button, Center, Muted, Subtitle } from '@/components/ui';
import { DUSHANBE, getCurrentCoords, type Coords } from '@/location';
import { colors, radius, spacing } from '@/theme/colors';

const DELTA = 0.06; // ~6-7 км по высоте — обзор города

/**
 * Карта клубов. Центрируется на геопозиции пользователя (если разрешено),
 * иначе на Душанбе. Маркеры — клубы с координатами; тап по карточке маркера
 * ведёт на экран клуба.
 *
 * Примечание: react-native-maps требует dev-build (не работает в Expo Go на
 * новой архитектуре). Для Android в проде нужен Google Maps API key в app.json
 * (`android.config.googleMaps.apiKey`); iOS использует Apple Maps без ключа.
 */
export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [hasLocation, setHasLocation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const here = await getCurrentCoords();
      setHasLocation(here != null);
      const center = here ?? DUSHANBE;
      setCoords(center);
      const data = await clubApi.discover(center.lat, center.lng);
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

  const recenter = useCallback(() => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lng, latitudeDelta: DELTA, longitudeDelta: DELTA },
      400,
    );
  }, [coords]);

  if (loading) {
    return (
      <Center>
        <Muted>Загружаем карту…</Muted>
      </Center>
    );
  }

  if (error) {
    return (
      <Center>
        <Ionicons name="map-outline" size={40} color={colors.textMuted} />
        <Muted style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>{error}</Muted>
        <Button title="Повторить" onPress={load} />
      </Center>
    );
  }

  const center = coords ?? DUSHANBE;
  const initialRegion: Region = {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: DELTA,
    longitudeDelta: DELTA,
  };
  const withCoords = clubs.filter((c) => c.lat != null && c.lng != null);

  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        style={styles.fill}
        initialRegion={initialRegion}
        showsUserLocation={hasLocation}
        showsMyLocationButton={false}
      >
        {withCoords.map((club) => (
          <Marker
            key={club.id}
            coordinate={{ latitude: club.lat as number, longitude: club.lng as number }}
            pinColor={colors.primary}
          >
            <Callout tooltip onPress={() => router.push(`/club/${club.slug}`)}>
              <View style={styles.callout}>
                <Subtitle numberOfLines={1}>{club.name}</Subtitle>
                <Muted numberOfLines={1} style={{ marginTop: 2 }}>
                  {[club.city, club.address].filter(Boolean).join(' · ') || 'Адрес уточняется'}
                </Muted>
                <View style={styles.calloutMeta}>
                  {club.is_open != null && (
                    <Badge
                      label={club.is_open ? 'Открыт' : 'Закрыт'}
                      tone={club.is_open ? 'success' : 'danger'}
                    />
                  )}
                  {club.distance_km != null && <Muted>{club.distance_km.toFixed(1)} км</Muted>}
                </View>
                <Muted style={styles.calloutCta}>Открыть клуб ›</Muted>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {hasLocation && (
        <Pressable style={styles.recenter} onPress={recenter} hitSlop={8}>
          <Ionicons name="locate" size={22} color={colors.text} />
        </Pressable>
      )}

      {withCoords.length === 0 && (
        <View style={styles.emptyBanner} pointerEvents="none">
          <Muted>Клубы рядом без координат на карте</Muted>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  callout: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    width: 220,
  },
  calloutMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  calloutCta: { color: colors.primary, marginTop: spacing.sm, fontWeight: '600' },
  recenter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
  emptyBanner: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
