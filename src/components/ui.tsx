import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { colors, radius, spacing } from '@/theme/colors';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Title({ style, ...rest }: TextProps) {
  return <Text style={[styles.title, style]} {...rest} />;
}

export function Subtitle({ style, ...rest }: TextProps) {
  return <Text style={[styles.subtitle, style]} {...rest} />;
}

export function Muted({ style, ...rest }: TextProps) {
  return <Text style={[styles.muted, style]} {...rest} />;
}

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const isOutline = variant === 'outline';
  const bg =
    variant === 'danger' ? colors.danger : isOutline ? 'transparent' : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        isOutline && styles.btnOutline,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.btnText, isOutline && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const map = {
    default: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  } as const;
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: `${c}22`, borderColor: `${c}55` }]}>
      <Text style={[styles.badgeText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  btn: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnOutline: { borderWidth: 1, borderColor: colors.primary },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
