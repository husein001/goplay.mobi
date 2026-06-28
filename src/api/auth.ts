import { mobi } from './client';
import type { User } from './types';

/**
 * Авторизация по номеру телефона (реальный бэкенд, без SMS-кредов).
 *
 * Поток:
 *  1. start(phone)     → зарегистрирован ли номер
 *  2a. зарегистрирован → login(phone, password)
 *  2b. новый           → register(phone, username, password)
 *
 * Эндпоинты (неймспейс /api/mobi):
 *   POST /auth/phone/start     { phone }                        -> { registered }
 *   POST /auth/phone/register  { phone, username, password }    -> { token, user }
 *   POST /auth/phone/login     { phone, password }              -> { token, user }
 *   GET  /auth/phone/me                                         -> { user }
 *   PATCH /auth/phone/profile  { username }                     -> { user }
 *   POST /auth/phone/password  { currentPassword, newPassword } -> { ok }
 */
export const authApi = {
  start: (phone: string) =>
    mobi.post<{ registered: boolean }>('/auth/phone/start', { phone }, { auth: false }),

  register: (phone: string, username: string, password: string) =>
    mobi.post<{ token: string; user: User }>('/auth/phone/register', { phone, username, password }, { auth: false }),

  login: (phone: string, password: string) =>
    mobi.post<{ token: string; user: User }>('/auth/phone/login', { phone, password }, { auth: false }),

  me: () => mobi.get<{ user: User }>('/auth/phone/me'),

  updateProfile: (username: string) =>
    mobi.patch<{ user: User }>('/auth/phone/profile', { username }),

  changePassword: (currentPassword: string, newPassword: string) =>
    mobi.post<{ ok: true }>('/auth/phone/password', { currentPassword, newPassword }),

  /** Удалить собственный аккаунт (требование App Store / Google Play). */
  deleteAccount: () => mobi.del<{ ok: true }>('/account'),
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

/** Базовая проверка: + и 11–15 цифр. */
export function isValidPhone(phone: string): boolean {
  return /^\+\d{11,15}$/.test(phone);
}
