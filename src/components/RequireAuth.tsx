import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { Button, Center, Muted, Title } from './ui';
import { colors, spacing } from '@/theme/colors';

/** Оборачивает экран, требующий входа. Гость видит CTA «Войти через Steam». */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center>
        <ActivityIndicator color={colors.primary} />
      </Center>
    );
  }

  if (!user) {
    return (
      <Center>
        <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
        <Title style={{ marginTop: spacing.lg, textAlign: 'center' }}>Нужен вход</Title>
        <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.xl, textAlign: 'center' }}>
          Войдите через Steam, чтобы бронировать места, пополнять кошелёк и сканировать QR.
        </Muted>
        <Link href="/login" asChild>
          <Button title="Войти через Steam" />
        </Link>
      </Center>
    );
  }

  return <>{children}</>;
}
