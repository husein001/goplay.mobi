import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { HappyHour, Package, Wallet, WalletTransaction } from '@/api/types';
import { AUTH_STUB } from '@/config';
import { Badge, Card, Muted, Subtitle, Title } from '@/components/ui';
import { useClubEvent, type RealtimeNotification } from '@/realtime/RealtimeProvider';
import { colors, radius, spacing } from '@/theme/colors';

// Демо-наполнение, пока бэкенд недоступен (режим AUTH_STUB) — чтобы витрина не
// была пустой. Когда подключим реальный бэкенд (AUTH_STUB = false), эти запасные
// данные не используются.
const DEMO_BALANCE: Wallet = { balance: 250, currency: 'c' };
const DEMO_PACKAGES: Package[] = [
  { id: 'd1', name: 'Стандарт', hours: 5, price: 200, zone_name: 'Standart' },
  { id: 'd2', name: 'Прайм', hours: 10, price: 380, zone_name: 'Prime' },
  { id: 'd3', name: 'VIP', hours: 5, price: 350, zone_name: 'VIP' },
];
const DEMO_HAPPY: HappyHour[] = [
  { id: 'h1', title: 'Утренний разогрев', discount_percent: 30, starts_at: '08:00', ends_at: '12:00' },
  { id: 'h2', title: 'Ночной режим', discount_percent: 20, starts_at: '00:00', ends_at: '06:00' },
];

export default function WalletScreen() {
  return <WalletView />;
}

function WalletView() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [happy, setHappy] = useState<HappyHour[]>([]);

  const load = useCallback(async () => {
    const [w, t, p, h] = await Promise.all([
      clubApi.wallet().catch(() => null),
      clubApi.walletTransactions().catch(() => [] as WalletTransaction[]),
      clubApi.packages().catch(() => [] as Package[]),
      clubApi.happyHours().catch(() => [] as HappyHour[]),
    ]);
    setWallet(w ?? (AUTH_STUB ? DEMO_BALANCE : null));
    setTxns(Array.isArray(t) ? t : []);
    setPackages(p?.length ? p : AUTH_STUB ? DEMO_PACKAGES : []);
    setHappy(h?.length ? h : AUTH_STUB ? DEMO_HAPPY : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Живое обновление баланса: пополнение/списание/бонус/реферал/промокод.
  useClubEvent('notification', (n: RealtimeNotification) => {
    const t = n?.type ?? '';
    if (t.startsWith('wallet') || t.includes('topup') || t.includes('referral') || t.includes('promo')) load();
  });

  function buy(pkg: Package) {
    // Списание с баланса появится, когда бэкенд отдаст эндпоинт покупки.
    Alert.alert(pkg.name, 'Покупка пакета с баланса скоро будет доступна.');
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

          {packages.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Subtitle>Потратить на пакеты</Subtitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.packRow}
              >
                {packages.map((p) => (
                  <Pressable key={p.id} onPress={() => buy(p)} style={styles.packCard}>
                    <View style={styles.packTop}>
                      <Ionicons name="time" size={16} color={colors.primary} />
                      <Muted style={{ color: colors.text, fontWeight: '600' }}>{p.hours} ч</Muted>
                    </View>
                    <Subtitle numberOfLines={1}>{p.name}</Subtitle>
                    {!!p.zone_name && <Muted style={{ fontSize: 12 }}>{p.zone_name}</Muted>}
                    <Title style={styles.packPrice}>{p.price} c</Title>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {happy.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Subtitle>Счастливые часы</Subtitle>
              {happy.map((h) => (
                <Card key={h.id} style={styles.happyRow}>
                  <View style={styles.happyIcon}>
                    <Ionicons name="flash" size={18} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Muted style={{ color: colors.text, fontWeight: '600' }}>{h.title}</Muted>
                    {(h.starts_at || h.ends_at) && (
                      <Muted style={{ fontSize: 12 }}>
                        {h.starts_at ?? ''}{h.starts_at && h.ends_at ? ' – ' : ''}{h.ends_at ?? ''}
                      </Muted>
                    )}
                  </View>
                  <Badge label={`−${h.discount_percent}%`} tone="success" />
                </Card>
              ))}
            </View>
          )}

          {txns.length > 0 && <Subtitle style={{ marginTop: spacing.sm }}>История</Subtitle>}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
          <Muted style={{ marginTop: spacing.sm }}>Операций пока нет</Muted>
        </View>
      }
      renderItem={({ item }) => {
        const positive = item.amount > 0;
        return (
          <Card style={styles.txn}>
            <View style={[styles.txnIcon, { backgroundColor: positive ? `${colors.success}22` : `${colors.danger}22` }]}>
              <Ionicons name={txnIcon(item.type)} size={18} color={positive ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Muted style={{ color: colors.text }} numberOfLines={1}>{item.description || item.type}</Muted>
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

/** Иконка по типу операции кошелька. */
function txnIcon(type: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (/(topup|deposit|пополн)/.test(t)) return 'arrow-down';
  if (/(bonus|referral|promo|gift)/.test(t)) return 'gift';
  if (/(refund|возврат)/.test(t)) return 'refresh';
  return 'arrow-up';
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  balanceCard: { alignItems: 'center', paddingVertical: spacing.xl },
  balance: { fontSize: 36, marginTop: spacing.xs },
  packRow: { gap: spacing.md, paddingRight: spacing.lg },
  packCard: {
    width: 140,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  packTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  packPrice: { fontSize: 22, marginTop: spacing.xs, color: colors.primary },
  happyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  happyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}22`,
  },
  txn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});
