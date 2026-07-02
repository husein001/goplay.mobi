import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { ClubWallet, TopupRequest, WalletTransaction } from '@/api/types';
import { Badge, Button, Card, Center, Muted, Subtitle, Title } from '@/components/ui';
import { useClubEvent, type RealtimeNotification } from '@/realtime/RealtimeProvider';
import { colors, radius, spacing } from '@/theme/colors';

const CUR = 'смн';

export default function WalletScreen() {
  const [wallets, setWallets] = useState<ClubWallet[]>([]);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<ClubWallet | null>(null); // клуб для запроса пополнения

  const load = useCallback(async () => {
    const [w, r] = await Promise.all([
      clubApi.wallet().catch(() => null),
      clubApi.myTopupRequests().catch(() => ({ requests: [] as TopupRequest[] })),
    ]);
    setWallets(w?.wallets ?? []);
    setTxns(w?.transactions ?? []);
    setRequests(r?.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Живое обновление: пополнение/списание/долг/заявка.
  useClubEvent('notification', (n: RealtimeNotification) => {
    const t = n?.type ?? '';
    if (t.startsWith('wallet') || t.includes('topup') || t.includes('session') || t.includes('shop')) load();
  });

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const totalOwed = useMemo(() => wallets.reduce((s, w) => s + (w.owed || 0), 0), [wallets]);

  if (loading) {
    return <Center><ActivityIndicator color={colors.primary} /></Center>;
  }

  return (
    <>
      <FlatList
        data={txns}
        keyExtractor={(t) => t.id}
        onRefresh={refresh}
        refreshing={refreshing}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <Subtitle>Баланс по клубам</Subtitle>

            {wallets.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
                <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
                  У вас пока нет баланса ни в одном клубе. Пополните баланс на стойке клуба
                  или запросите пополнение, когда откроете сессию.
                </Muted>
              </Card>
            ) : (
              wallets.map((w) => (
                <Card key={w.club_id} style={styles.walletCard}>
                  <View style={styles.walletTop}>
                    <View style={{ flex: 1 }}>
                      <Muted numberOfLines={1}>{w.club_name}</Muted>
                      <Title style={styles.balance}>{fmt(w.balance)} {CUR}</Title>
                    </View>
                    <Ionicons name="business" size={22} color={colors.primary} />
                  </View>

                  <View style={styles.walletMeta}>
                    {w.owed > 0 && (
                      <Badge label={`Долг: ${fmt(w.owed)} ${CUR} — оплата при выходе`} tone="warning" />
                    )}
                    {w.bonus_minutes > 0 && (
                      <Badge label={`Бонус: ${w.bonus_minutes} мин`} tone="success" />
                    )}
                  </View>

                  <Button
                    title="Запросить пополнение"
                    variant="outline"
                    onPress={() => setTarget(w)}
                  />
                </Card>
              ))
            )}

            {totalOwed > 0 && (
              <Muted style={styles.owedHint}>
                <Ionicons name="information-circle" size={13} color={colors.warning} />{' '}
                Долг — это пополнения «в долг»: деньги уже на балансе, но их нужно оплатить
                наличными при выходе из клуба.
              </Muted>
            )}

            {pending.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Subtitle>Заявки на пополнение</Subtitle>
                {pending.map((r) => (
                  <Card key={r.id} style={styles.reqRow}>
                    <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Muted style={{ color: colors.text }}>{fmt(r.amount)} {CUR}</Muted>
                      <Muted style={{ fontSize: 12 }}>Ждёт подтверждения кассиром</Muted>
                    </View>
                    <Badge label="В обработке" tone="warning" />
                  </Card>
                ))}
              </View>
            )}

            <Subtitle style={{ marginTop: spacing.sm }}>История операций</Subtitle>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            <Muted style={{ marginTop: spacing.sm }}>Операций пока нет</Muted>
          </View>
        }
        renderItem={({ item }) => <TxnRow txn={item} clubName={clubName(wallets, item.club_id)} />}
      />

      <TopupRequestModal
        wallet={target}
        onClose={() => setTarget(null)}
        onDone={async () => { setTarget(null); await load(); }}
      />
    </>
  );
}

function TxnRow({ txn, clubName }: { txn: WalletTransaction; clubName: string }) {
  const positive = txn.amount > 0;
  const deferred = txn.type === 'topup' && !txn.settled;
  // Списания сессии схлопнуты бэкендом в одну строку — показываем длительность.
  const meta = (txn as any).meta;
  const durMin = meta?.aggregated && meta?.from && meta?.to
    ? Math.max(1, Math.round((new Date(meta.to).getTime() - new Date(meta.from).getTime()) / 60000))
    : null;
  return (
    <Card style={styles.txn}>
      <View style={[styles.txnIcon, { backgroundColor: positive ? `${colors.success}22` : `${colors.danger}22` }]}>
        <Ionicons name={txnIcon(txn.type)} size={18} color={positive ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Muted style={{ color: colors.text }} numberOfLines={1}>
            {txnLabel(txn.type)}{durMin ? ` · ${durMin} мин` : ''}
          </Muted>
          {deferred && <Badge label="в долг" tone="warning" />}
        </View>
        <Muted style={{ fontSize: 12 }} numberOfLines={1}>
          {clubName ? `${clubName} · ` : ''}{new Date(txn.created_at).toLocaleString('ru-RU')}
        </Muted>
      </View>
      <Muted style={{ color: positive ? colors.success : colors.danger, fontWeight: '700' }}>
        {positive ? '+' : ''}{fmt(txn.amount)} {CUR}
      </Muted>
    </Card>
  );
}

function TopupRequestModal({
  wallet, onClose, onDone,
}: { wallet: ClubWallet | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (wallet) { setAmount(''); setNote(''); } }, [wallet]);

  async function submit() {
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) { Alert.alert('Пополнение', 'Введите сумму больше 0'); return; }
    if (!wallet) return;
    setBusy(true);
    try {
      await clubApi.requestTopup(wallet.club_id, n, note.trim() || undefined);
      Alert.alert('Заявка отправлена', `Кассир «${wallet.club_name}» пополнит баланс на ${fmt(n)} ${CUR}.`);
      onDone();
    } catch (e: any) {
      Alert.alert('Пополнение', e?.message || 'Не удалось отправить заявку');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!wallet} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Subtitle>Запросить пополнение</Subtitle>
          <Muted>{wallet?.club_name}. Кассир подтвердит и зачислит наличными.</Muted>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={`Сумма, ${CUR}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
            autoFocus
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Комментарий (необязательно)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Button title="Отправить заявку" loading={busy} onPress={submit} />
          <Button title="Отмена" variant="outline" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function clubName(wallets: ClubWallet[], clubId: string): string {
  return wallets.find((w) => w.club_id === clubId)?.club_name ?? '';
}

function txnLabel(type: string): string {
  switch (type) {
    case 'topup': return 'Пополнение';
    case 'session_charge': return 'Игровая сессия';
    case 'shop_purchase': return 'Покупка в баре';
    case 'refund': return 'Возврат';
    case 'bonus': return 'Бонус';
    case 'referral': return 'Реферальная награда';
    default: return 'Операция';
  }
}

function txnIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'topup': return 'arrow-down';
    case 'bonus':
    case 'referral': return 'gift';
    case 'refund': return 'refresh';
    case 'shop_purchase': return 'fast-food';
    default: return 'game-controller';
  }
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  walletCard: { gap: spacing.md },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  balance: { fontSize: 30, marginTop: spacing.xs },
  walletMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  owedHint: { fontSize: 12, lineHeight: 17 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  txn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
