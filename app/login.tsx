import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi, isValidPhone, normalizePhone } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Muted, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/colors';

type Step = 'phone' | 'password' | 'register';

export default function LoginScreen() {
  const { signInWithToken } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+992');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.message : fallback);
  }

  // Шаг 1 — номер. Узнаём, зарегистрирован ли он: да → пароль, нет → регистрация.
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
      setStep(registered ? 'password' : 'register');
    } catch (e) {
      fail(e, 'Не удалось проверить номер');
    } finally {
      setBusy(false);
    }
  }

  // Вход существующего: номер + пароль.
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
    } catch (e) {
      fail(e, 'Неверный номер или пароль');
    } finally {
      setBusy(false);
    }
  }

  // Регистрация: имя + пароль (без SMS). Логин — номер.
  async function submitRegister() {
    if (username.trim().length < 2) {
      setError('Введите имя (от 2 символов)');
      return;
    }
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
      const { token } = await authApi.register(phone, username.trim(), password);
      await signInWithToken(token);
    } catch (e) {
      fail(e, 'Не удалось зарегистрироваться');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError(null);
    setPassword('');
    setConfirm('');
    setStep('phone');
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Image source={require('../assets/logo-goplay.png')} style={{ width: 244, height: 48 }} resizeMode="contain" />
        </View>

        {step === 'phone' && (
          <>
            <Title style={styles.h}>Вход по номеру</Title>
            <Muted style={styles.sub}>Введите номер телефона — он же будет вашим логином.</Muted>
            <Field value={phone} onChangeText={setPhone} placeholder="+992 90 123 45 67" keyboardType="phone-pad" autoFocus icon="call" />
            <Button title="Продолжить" loading={busy} onPress={submitPhone} />
          </>
        )}

        {step === 'password' && (
          <>
            <Title style={styles.h}>С возвращением</Title>
            <Muted style={styles.sub}>{phone}</Muted>
            <Field value={password} onChangeText={setPassword} placeholder="Пароль" secureTextEntry autoFocus icon="lock-closed" />
            <Button title="Войти" loading={busy} onPress={loginWithPassword} />
          </>
        )}

        {step === 'register' && (
          <>
            <Title style={styles.h}>Регистрация</Title>
            <Muted style={styles.sub}>{phone} · придумайте имя и пароль. Логин — ваш номер.</Muted>
            <Field value={username} onChangeText={setUsername} placeholder="Ваше имя" icon="person" autoFocus />
            <Field value={password} onChangeText={setPassword} placeholder="Пароль (от 6 символов)" secureTextEntry icon="lock-closed" />
            <Field value={confirm} onChangeText={setConfirm} placeholder="Повторите пароль" secureTextEntry icon="lock-closed" />
            <Button title="Зарегистрироваться" loading={busy} onPress={submitRegister} />
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
        style={styles.input}
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
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.xs },
});
