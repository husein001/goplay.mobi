import { mobi } from './client';
import type { User } from './types';
import { AUTH_STUB } from '@/config';
import {
  stubStart,
  stubRequestCode,
  stubVerifyCode,
  stubSetPassword,
  stubLogin,
  stubDeleteAccount,
} from '@/auth/stubAuth';

/**
 * Авторизация по номеру телефона.
 *
 * Поток:
 *  1. start(phone)          → зарегистрирован ли номер
 *  2a. зарегистрирован      → login(phone, password)
 *  2b. новый / сброс пароля → requestCode(phone) → verifyCode → setPassword
 *
 * Эндпоинты бэкенда — неймспейс mobi (backend/src/mobi, префикс /api/mobi):
 *   POST /api/mobi/auth/phone/start         { phone }                  -> { registered }
 *   POST /api/mobi/auth/phone/request-code  { phone }                  -> { ok, resendIn }
 *   POST /api/mobi/auth/phone/verify-code   { phone, code }            -> { verifyToken }
 *   POST /api/mobi/auth/phone/set-password  { verifyToken, password }  -> { token, user }
 *   POST /api/mobi/auth/phone/login         { phone, password }        -> { token, user }
 */
/**
 * При `AUTH_STUB` весь телефонный вход обслуживается локально (см. stubAuth.ts):
 * бэкенд `/api/mobi/auth/phone/*` не вызывается, ОТП статичный. Поставьте
 * `AUTH_STUB = false` в config.ts, когда появятся реальные SMS-креды.
 */
export const authApi = {
  start: (phone: string) =>
    AUTH_STUB
      ? stubStart(phone)
      : mobi.post<{ registered: boolean }>('/auth/phone/start', { phone }, { auth: false }),

  requestCode: (phone: string) =>
    AUTH_STUB
      ? stubRequestCode(phone)
      : mobi.post<{ ok: true; resendIn: number }>('/auth/phone/request-code', { phone }, { auth: false }),

  verifyCode: (phone: string, code: string) =>
    AUTH_STUB
      ? stubVerifyCode(phone, code)
      : mobi.post<{ verifyToken: string }>('/auth/phone/verify-code', { phone, code }, { auth: false }),

  setPassword: (verifyToken: string, password: string) =>
    AUTH_STUB
      ? stubSetPassword(verifyToken, password)
      : mobi.post<{ token: string; user: User }>(
          '/auth/phone/set-password',
          { verifyToken, password },
          { auth: false },
        ),

  login: (phone: string, password: string) =>
    AUTH_STUB
      ? stubLogin(phone, password)
      : mobi.post<{ token: string; user: User }>('/auth/phone/login', { phone, password }, { auth: false }),

  /** Удалить собственный аккаунт (требование App Store / Google Play). */
  deleteAccount: () =>
    AUTH_STUB ? stubDeleteAccount() : mobi.del<{ ok: true }>('/account'),
};

/** Нормализуем ввод к формату +992XXXXXXXXX (Таджикистан по умолчанию). */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) {
    if (d.startsWith('992')) d = '+' + d;
    else if (d.length === 9) d = '+992' + d; // локальный номер без кода
    else d = '+' + d;
  }
  return d;
}

/** Базовая проверка: +992 и 9 цифр (всего 13 символов). */
export function isValidPhone(phone: string): boolean {
  return /^\+\d{11,15}$/.test(phone);
}
