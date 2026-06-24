import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View } from 'react-native';
import { clubApi } from '@/api/clubs';
import type { Wallet, WalletTransaction } from '@/api/types';
import { Button, Card, Center, Muted, Subtitle, Title } from '@/components/ui';
import { RequireAuth } from '@/components/RequireAuth';
import { useClubEvent, type RealtimeNotification } from '@/realtime/RealtimeProvider';
import { colors, spacing } from '@/theme/colors';

const PRESETS = [50, 100, 200, 500];

export default function WalletScreen() {
  return (
    <RequireAuth>
      <WalletView />
    </RequireAuth>
  );
}

function WalletView() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([
        clubApi.wallet(),
        clubApi.walletTransactions().catch(() => [] as WalletTransaction[]),
      ]);
      setWallet(w);
      setTxns(Array.isArray(t) ? t : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Живое обновление баланса: пополнение/списание/бонус/реферал/промокод.
  useClubEvent('notification', (n: RealtimeNotification) => {
    const t = n?.type ?? '';
    if (t.startsWith('wallet') || t.includes('topup') || t.includes('referral') || t.includes('promo')) load();
  });

  async function topup(amount: number) {
    setBusy(amount);
    try {
      const res = await clubApi.topup(amount);
      // Apple Guideline 3.1.1: пополнение цифрового кошелька выносим во внешний
      // браузер. Если бэкенд вернул платёжную ссылку — открываем её в Safari.
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        Alert.alert('Готово', 'Баланс обновлён');
        load();
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось пополнить');
    } finally {
      setBusy(null);
    }
  }

  return (
    <FlatList
      data={txns}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: spacing.lg }}>
          <Card style={styles.balanceCard}>
            <Muted>Кошелёк Goplay</Muted>
            <Title style={styles.balance}>
              {wallet ? `${wallet.balance} ${wallet.currency || 'c'}` : '—'}
            </Title>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <Subtitle>Пополнить</Subtitle>
            <View style={styles.presets}>
              {PRESETS.map((a) => (
                <View key={a} style={{ flex: 1 }}>
                  <Button title={`${a}`} variant="outline" loading={busy === a} onPress={() => topup(a)} />
                </View>
              ))}
            </View>
            <Muted style={{ fontSize: 12 }}>
              Оплата откроется во внешнем браузере (требование App Store).
            </Muted>
          </Card>

          {txns.length > 0 && <Subtitle style={{ marginTop: spacing.sm }}>История</Subtitle>}
        </View>
      }
      ListEmptyComponent={
        <Center>
          <Muted>Операций пока нет</Muted>
        </Center>
      }
      renderItem={({ item }) => {
        const positive = item.amount > 0;
        return (
          <Card style={styles.txn}>
            <View style={{ flex: 1 }}>
              <Muted style={{ color: colors.text }}>{item.description || item.type}</Muted>
              <Muted style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleString('ru-RU')}</Muted>
            </View>
            <Muted style={{ color: positive ? colors.success : colors.danger, fontWeight: '700' }}>
              {positive ? '+' : ''}
              {item.amount} c
            </Muted>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  balanceCard: { alignItems: 'center', paddingVertical: spacing.xl },
  balance: { fontSize: 36, marginTop: spacing.xs },
  presets: { flexDirection: 'row', gap: spacing.sm },
  txn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
