import { core } from './client';
import type { User } from './types';

/**
 * Авторизация по номеру телефона.
 *
 * Поток:
 *  1. start(phone)          → зарегистрирован ли номер
 *  2a. зарегистрирован      → login(phone, password)
 *  2b. новый / сброс пароля → requestCode(phone) → verifyCode → setPassword
 *
 * Эндпоинты бэкенда (пока не реализованы в goplay.tj — см. server-reference/):
 *   POST /api/auth/phone/start         { phone }                  -> { registered }
 *   POST /api/auth/phone/request-code  { phone }                  -> { ok, resendIn }
 *   POST /api/auth/phone/verify-code   { phone, code }            -> { verifyToken }
 *   POST /api/auth/phone/set-password  { verifyToken, password }  -> { token, user }
 *   POST /api/auth/phone/login         { phone, password }        -> { token, user }
 */
export const authApi = {
  start: (phone: string) =>
    core.post<{ registered: boolean }>('/auth/phone/start', { phone }, { auth: false }),

  requestCode: (phone: string) =>
    core.post<{ ok: true; resendIn: number }>('/auth/phone/request-code', { phone }, { auth: false }),

  verifyCode: (phone: string, code: string) =>
    core.post<{ verifyToken: string }>('/auth/phone/verify-code', { phone, code }, { auth: false }),

  setPassword: (verifyToken: string, password: string) =>
    core.post<{ token: string; user: User }>(
      '/auth/phone/set-password',
      { verifyToken, password },
      { auth: false },
    ),

  login: (phone: string, password: string) =>
    core.post<{ token: string; user: User }>('/auth/phone/login', { phone, password }, { auth: false }),
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
