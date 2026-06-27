import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { clubApi } from '@/api/clubs';
import { Button, Center, Muted, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

export default function ScanScreen() {
  return <Scanner />;
}

function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  // Сбрасываем блокировку при возврате на экран.
  useEffect(() => {
    if (isFocused) locked.current = false;
  }, [isFocused]);

  if (!permission) {
    return (
      <Center>
        <Muted>Проверяем камеру…</Muted>
      </Center>
    );
  }

  if (!permission.granted) {
    return (
      <Center>
        <Title style={{ textAlign: 'center' }}>Доступ к камере</Title>
        <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.xl, textAlign: 'center' }}>
          Камера нужна, чтобы сканировать QR-код на ПК и войти в сессию.
        </Muted>
        <Button title="Разрешить камеру" onPress={requestPermission} />
      </Center>
    );
  }

  async function onScan(token: string) {
    if (locked.current || busy) return;
    locked.current = true;
    setBusy(true);
    try {
      const res = await clubApi.unlockSeat(extractToken(token));
      Alert.alert('Готово', res?.seat ? `ПК разблокирован: ${res.seat}` : 'ПК разблокирован', [
        { text: 'OK', onPress: () => (locked.current = false) },
      ]);
    } catch (e: any) {
      Alert.alert('Не вышло', e?.message || 'Неверный или просроченный QR', [
        { text: 'Ещё раз', onPress: () => (locked.current = false) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)}
        />
      )}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Muted style={styles.hint}>Наведите на QR-код у ПК</Muted>
      </View>
    </View>
  );
}

/** QR может быть «голым» токеном или ссылкой вида …/clubs/seat?token=XXX. */
function extractToken(raw: string): string {
  const m = raw.match(/[?&]token=([^&#]+)/);
  if (m) return decodeURIComponent(m[1]);
  return raw.trim();
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  hint: { marginTop: spacing.lg, color: '#fff', backgroundColor: '#0008', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
});
