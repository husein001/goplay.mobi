import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { clubApi } from '@/api/clubs';
import { authApi } from '@/api/auth';
import { Button, Card, Center, Muted, Subtitle, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

const PRIVACY_URL = 'https://goplay.tj/privacy';
const TERMS_URL = 'https://goplay.tj/terms';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const [promo, setPromo] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Удалить аккаунт?',
      'Аккаунт и связанные данные будут удалены без возможности восстановления. Баланс кошелька сгорит.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await authApi.deleteAccount();
              await signOut();
              Alert.alert('Аккаунт удалён', 'Ваш аккаунт и данные удалены.');
            } catch (e: any) {
              Alert.alert('Ошибка', e?.message || 'Не удалось удалить аккаунт');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <Center>
        <Muted>Загрузка…</Muted>
      </Center>
    );
  }

  if (!user) {
    return (
      <Center>
        <Ionicons name="person-circle-outline" size={56} color={colors.textMuted} />
        <Title style={{ marginTop: spacing.md }}>Вы не вошли</Title>
        <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.xl, textAlign: 'center' }}>
          Войдите по номеру телефона, чтобы пользоваться кошельком и бронями.
        </Muted>
        <Link href="/login" asChild>
          <Button title="Войти по номеру" />
        </Link>
      </Center>
    );
  }

  async function redeemPromo() {
    if (!promo.trim()) return;
    setRedeeming(true);
    try {
      const res = await clubApi.redeemPromo(promo.trim());
      Alert.alert('Промокод', res?.message || 'Применён');
      setPromo('');
    } catch (e: any) {
      Alert.alert('Промокод', e?.message || 'Не удалось применить');
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.head}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Subtitle numberOfLines={1}>{user.username}</Subtitle>
          <Muted>{user.phone || 'Аккаунт Goplay'}</Muted>
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Subtitle>Промокод</Subtitle>
        <View style={styles.promoRow}>
          <TextInput
            value={promo}
            onChangeText={setPromo}
            placeholder="Введите код"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={styles.input}
          />
        </View>
        <Button title="Применить" loading={redeeming} onPress={redeemPromo} />
      </Card>

      <Card style={{ gap: 0 }}>
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
          <Muted style={styles.linkText}>Политика конфиденциальности</Muted>
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
          <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
          <Muted style={styles.linkText}>Условия использования</Muted>
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Button title="Выйти" variant="outline" onPress={signOut} />
      <Button title="Удалить аккаунт" variant="danger" loading={deleting} onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  promoRow: { flexDirection: 'row', gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  linkText: { flex: 1, color: colors.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
});
