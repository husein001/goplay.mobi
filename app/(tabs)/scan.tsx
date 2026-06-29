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

  async function onScan(raw: string) {
    if (locked.current || busy) return;
    locked.current = true;
    setBusy(true);
    try {
      const seat = extractSeat(raw);
      if (!seat) {
        throw new Error('Это не QR-код Goplay. Наведите на код на экране ПК.');
      }
      const res = await clubApi.unlockSeat(seat);
      const name = res?.session?.pc_name;
      if (res?.session?.awaiting_funds) {
        // Сел за ПК, но баланс пуст: место занято, экран ПК показывает пакеты/тариф.
        // Разблокируется автоматически, как только баланс пополнят.
        Alert.alert(
          'Пополните баланс',
          'Вы заняли место, но баланс пуст. Пополните счёт — ПК разблокируется автоматически. Можно запросить пополнение в «Кошельке» или у кассира.',
          [{ text: 'Понятно', onPress: () => (locked.current = false) }],
        );
      } else {
        Alert.alert('Готово', name ? `ПК разблокирован: ${name}` : 'ПК разблокирован', [
          { text: 'OK', onPress: () => (locked.current = false) },
        ]);
      }
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

/**
 * QR у ПК кодирует ссылку вида …/clubs/seat?p=<pcId>&n=<nonce>.
 * Достаём оба параметра — бэкенд /unlock ждёт { pcId, nonce }.
 * Возвращаем null, если это не наш QR (нет обоих параметров).
 */
function extractSeat(raw: string): { pcId: string; nonce: string } | null {
  const get = (key: string) => {
    const m = raw.match(new RegExp(`[?&]${key}=([^&#]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  };
  const pcId = get('p') || get('pcId');
  const nonce = get('n') || get('nonce');
  return pcId && nonce ? { pcId, nonce } : null;
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
