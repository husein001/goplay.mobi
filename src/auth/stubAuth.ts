/**
 * Локальная эмуляция телефонного входа (режим `AUTH_STUB`).
 *
 * Пока на бэкенде нет SMS-кредов, весь поток «номер → код → пароль» и вход по
 * паролю обслуживается прямо на устройстве:
 *   - ОТП статичный (`STUB_OTP`, по умолчанию 123456) и нужен только при
 *     регистрации; повторный вход — по номеру + паролю;
 *   - аккаунты (номер, пароль, профиль) лежат в AsyncStorage;
 *   - токен сессии — строка вида `stub:<phone>`.
 *
 * Когда появятся реальные креды — выставить `AUTH_STUB = false` в config.ts;
 * `authApi` вернётся к вызовам реального бэкенда, этот модуль перестанет
 * использоваться. Сигнатуры функций совпадают с `authApi`, чтобы делегирование
 * было прозрачным для экранов.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, getAuthToken } from '@/api/client';
import { STUB_OTP } from '@/config';
import type { User } from '@/api/types';

const ACCOUNTS_KEY = 'goplay.stub.accounts';
const TOKEN_PREFIX = 'stub:';

interface StubAccount {
  password: string;
  user: User;
}

type Accounts = Record<string, StubAccount>;

async function readAccounts(): Promise<Accounts> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Accounts) : {};
  } catch {
    return {};
  }
}

async function writeAccounts(accounts: Accounts): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function makeUser(phone: string): User {
  return { id: TOKEN_PREFIX + phone, phone, username: 'Игрок ' + phone.slice(-4), avatar: null };
}

function phoneFromToken(token: string | null): string | null {
  return token && token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
}

/** Зарегистрирован ли номер локально (есть аккаунт с паролем). */
export async function stubStart(phone: string): Promise<{ registered: boolean }> {
  const accounts = await readAccounts();
  return { registered: !!accounts[phone] };
}

/** «Отправка» кода — no-op: код всегда статичный. */
export async function stubRequestCode(phone: string): Promise<{ ok: true; resendIn: number }> {
  return { ok: true, resendIn: 60 };
}

/** Проверка кода: принимаем только статичный STUB_OTP. */
export async function stubVerifyCode(phone: string, code: string): Promise<{ verifyToken: string }> {
  if (code.trim() !== STUB_OTP) {
    throw new ApiError(400, `Неверный код (тестовый: ${STUB_OTP})`);
  }
  return { verifyToken: TOKEN_PREFIX + phone };
}

/** Задать пароль после подтверждения номера → создать аккаунт и сессию. */
export async function stubSetPassword(
  verifyToken: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const phone = phoneFromToken(verifyToken);
  if (!phone) throw new ApiError(401, 'Подтвердите номер заново');

  const accounts = await readAccounts();
  const user = accounts[phone]?.user ?? makeUser(phone);
  accounts[phone] = { password, user };
  await writeAccounts(accounts);

  return { token: TOKEN_PREFIX + phone, user };
}

/** Вход по номеру + паролю. */
export async function stubLogin(
  phone: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const accounts = await readAccounts();
  const account = accounts[phone];
  if (!account || account.password !== password) {
    throw new ApiError(401, 'Неверный номер или пароль');
  }
  return { token: TOKEN_PREFIX + phone, user: account.user };
}

/** Удалить аккаунт текущей сессии. */
export async function stubDeleteAccount(): Promise<{ ok: true }> {
  const phone = phoneFromToken(getAuthToken());
  if (phone) {
    const accounts = await readAccounts();
    delete accounts[phone];
    await writeAccounts(accounts);
  }
  return { ok: true };
}

/** Восстановить пользователя по токену сессии (для AuthContext). */
export async function stubGetUser(token: string | null): Promise<User | null> {
  const phone = phoneFromToken(token);
  if (!phone) return null;
  const accounts = await readAccounts();
  return accounts[phone]?.user ?? makeUser(phone);
}
