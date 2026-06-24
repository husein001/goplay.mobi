import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, isValidPhone, normalizePhone } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Muted, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

type Step = 'phone' | 'password' | 'code' | 'newPassword';

export default function LoginScreen() {
  const { signInWithToken } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+992');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Таймер повторной отправки кода.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.message : fallback);
  }

  async function submitPhone() {
    const p = normalizePhone(phone);
    if (!isValidPhone(p)) {
      setError('Введите корректный номер телефона');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { registered } = await authApi.start(p);
      setPhone(p);
      if (registered) {
        setStep('password');
      } else {
        await sendCode(p);
      }
    } catch (e) {
      fail(e, 'Не удалось проверить номер');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(p: string) {
    const { resendIn } = await authApi.requestCode(p);
    setResendIn(resendIn || 60);
    setCode('');
    setStep('code');
  }

  async function loginWithPassword() {
    if (!password) {
      setError('Введите пароль');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { token } = await authApi.login(phone, password);
      await signInWithToken(token);
      router.back();
    } catch (e) {
      fail(e, 'Неверный номер или пароль');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(value?: string) {
    const c = (value ?? code).trim();
    if (c.length < 4) return;
    setError(null);
    setBusy(true);
    try {
      const { verifyToken } = await authApi.verifyCode(phone, c);
      setVerifyToken(verifyToken);
      setPassword('');
      setConfirm('');
      setStep('newPassword');
    } catch (e) {
      fail(e, 'Неверный или просроченный код');
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    if (password.length < 6) {
      setError('Пароль не короче 6 символов');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { token } = await authApi.setPassword(verifyToken, password);
      await signInWithToken(token);
      router.back();
    } catch (e) {
      fail(e, 'Не удалось сохранить пароль');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (resendIn > 0) return;
    setBusy(true);
    try {
      await sendCode(phone);
    } catch (e) {
      fail(e, 'Не удалось отправить код');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError(null);
    if (step === 'password' || step === 'code') setStep('phone');
    else if (step === 'newPassword') setStep('code');
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Ionicons name="game-controller" size={40} color={colors.primary} />
        </View>

        {step === 'phone' && (
          <>
            <Title style={styles.h}>Вход по номеру</Title>
            <Muted style={styles.sub}>Введите номер телефона — пришлём SMS с кодом подтверждения.</Muted>
            <Field
              value={phone}
              onChangeText={setPhone}
              placeholder="+992 90 123 45 67"
              keyboardType="phone-pad"
              autoFocus
              icon="call"
            />
            <Button title="Продолжить" loading={busy} onPress={submitPhone} />
          </>
        )}

        {step === 'password' && (
          <>
            <Title style={styles.h}>С возвращением</Title>
            <Muted style={styles.sub}>{phone}</Muted>
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="Пароль"
              secureTextEntry
              autoFocus
              icon="lock-closed"
            />
            <Button title="Войти" loading={busy} onPress={loginWithPassword} />
            <Pressable onPress={resend} style={styles.linkBtn}>
              <Text style={styles.link}>Забыли пароль?</Text>
            </Pressable>
          </>
        )}

        {step === 'code' && (
          <>
            <Title style={styles.h}>Введите код</Title>
            <Muted style={styles.sub}>Отправили SMS на {phone}</Muted>
            <Field
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 6);
                setCode(digits);
                if (digits.length === 6) submitCode(digits);
              }}
              placeholder="• • • • • •"
              keyboardType="number-pad"
              autoFocus
              icon="keypad"
              center
            />
            <Button title="Подтвердить" loading={busy} onPress={() => submitCode()} />
            <Pressable onPress={resend} disabled={resendIn > 0} style={styles.linkBtn}>
              <Text style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
                {resendIn > 0 ? `Отправить код повторно (${resendIn})` : 'Отправить код повторно'}
              </Text>
            </Pressable>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <Title style={styles.h}>Придумайте пароль</Title>
            <Muted style={styles.sub}>Им вы будете входить в следующий раз.</Muted>
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="Новый пароль"
              secureTextEntry
              autoFocus
              icon="lock-closed"
            />
            <Field
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Повторите пароль"
              secureTextEntry
              icon="lock-closed"
            />
            <Button title="Сохранить и войти" loading={busy} onPress={submitNewPassword} />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {step !== 'phone' && (
          <Pressable onPress={back} style={styles.linkBtn}>
            <Text style={styles.link}>← Назад</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'phone-pad' | 'number-pad' | 'default';
  autoFocus?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  center?: boolean;
}) {
  return (
    <View style={styles.field}>
      {props.icon && <Ionicons name={props.icon} size={20} color={colors.textMuted} />}
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoFocus={props.autoFocus}
        autoCapitalize="none"
        style={[styles.input, props.center && { textAlign: 'center', letterSpacing: 6 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md, flexGrow: 1, justifyContent: 'center' },
  logo: { alignSelf: 'center', marginBottom: spacing.lg },
  h: { textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: spacing.md },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, height: '100%' },
  linkBtn: { alignSelf: 'center', paddingVertical: spacing.sm },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  linkDisabled: { color: colors.textMuted },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.xs },
});
