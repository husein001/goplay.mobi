/**
 * Phone + password authentication router.
 *
 * Drop-in for goplay.tj backend. When integrating, place this under
 * `backend/src/routes/phone-auth.ts`, fix the relative imports below to match,
 * and mount it next to the Steam routes:
 *
 *     import phoneAuth from './routes/phone-auth';
 *     app.use('/api/auth/phone', phoneAuth);
 *
 * Reuses the existing JWT (`generateToken`) so issued tokens работают и с
 * `/api/auth/*`, и с `/api/goplay-net/*` без изменений в authMiddleware.
 *
 * Requires: `npm i bcryptjs` (+ `@types/bcryptjs`). jsonwebtoken уже есть.
 * Run migration: migrations/20260624_phone_auth.sql
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- imports relative to backend/src/routes/ after integration ---
import { query, queryOne } from '../config/database';
import { generateToken } from '../middleware/auth.middleware';
import { User } from '../types';
import { getSmsSender } from '../services/sms'; // move sms.ts to backend/src/services/

const router = Router();
const sms = getSmsSender();

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_S = 60;
const MAX_ATTEMPTS = 5;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// ----------------------------- helpers -----------------------------

function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) {
    if (d.startsWith('992')) d = '+' + d;
    else if (d.length === 9) d = '+992' + d;
    else d = '+' + d;
  }
  return d;
}

function validPhone(p: string): boolean {
  return /^\+\d{11,15}$/.test(p);
}

function genCode(): string {
  // 6 цифр, без crypto-overkill — достаточно для SMS-OTP с rate-limit/TTL.
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findUserByPhone(phone: string): Promise<User | null> {
  return queryOne<User>('SELECT * FROM users WHERE phone = $1', [phone]);
}

async function createPhoneUser(phone: string): Promise<User> {
  // Минимальный аккаунт без Steam. mmr=1000 — дефолтный сид (подгоните под
  // реальные NOT NULL/DEFAULT вашей схемы users).
  const username = 'Игрок ' + phone.slice(-4);
  const rows = await query<User>(
    `INSERT INTO users (phone, username, mmr) VALUES ($1, $2, 1000) RETURNING *`,
    [phone, username],
  );
  return rows[0];
}

function issueVerifyToken(phone: string): string {
  return jwt.sign({ phone, purpose: 'phone_verify' }, JWT_SECRET, { expiresIn: '10m' });
}

function readVerifyToken(token: string): string | null {
  try {
    const d = jwt.verify(token, JWT_SECRET) as { phone?: string; purpose?: string };
    return d.purpose === 'phone_verify' && d.phone ? d.phone : null;
  } catch {
    return null;
  }
}

// ----------------------------- routes -----------------------------

/** Зарегистрирован ли номер (есть аккаунт с заданным паролем). */
router.post('/start', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  if (!validPhone(phone)) return res.status(400).json({ error: 'Некорректный номер' });
  const user = await findUserByPhone(phone);
  res.json({ registered: !!(user && user.password_hash) });
});

/** Отправить SMS-код. Rate-limit по последней отправке. */
router.post('/request-code', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  if (!validPhone(phone)) return res.status(400).json({ error: 'Некорректный номер' });

  const existing = await queryOne<{ last_sent_at: string }>(
    'SELECT last_sent_at FROM phone_otps WHERE phone = $1',
    [phone],
  );
  if (existing) {
    const elapsed = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_S) {
      return res.status(429).json({ error: 'Подождите перед повторной отправкой' });
    }
  }

  const code = genCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await query(
    `INSERT INTO phone_otps (phone, code_hash, attempts, last_sent_at, expires_at)
     VALUES ($1, $2, 0, NOW(), $3)
     ON CONFLICT (phone) DO UPDATE
       SET code_hash = $2, attempts = 0, last_sent_at = NOW(), expires_at = $3`,
    [phone, codeHash, expiresAt],
  );

  try {
    await sms.send(phone, `Код входа Goplay: ${code}`);
  } catch (e) {
    console.error('SMS send failed', e);
    return res.status(502).json({ error: 'Не удалось отправить SMS' });
  }

  res.json({ ok: true, resendIn: RESEND_COOLDOWN_S });
});

/** Проверить код → выдать короткоживущий verifyToken. */
router.post('/verify-code', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!validPhone(phone) || code.length < 4) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  const otp = await queryOne<{ code_hash: string; attempts: number; expires_at: string }>(
    'SELECT code_hash, attempts, expires_at FROM phone_otps WHERE phone = $1',
    [phone],
  );
  if (!otp) return res.status(400).json({ error: 'Запросите код заново' });
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Код просрочен' });
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Слишком много попыток' });
  }

  const ok = await bcrypt.compare(code, otp.code_hash);
  if (!ok) {
    await query('UPDATE phone_otps SET attempts = attempts + 1 WHERE phone = $1', [phone]);
    return res.status(400).json({ error: 'Неверный код' });
  }

  await query('DELETE FROM phone_otps WHERE phone = $1', [phone]);
  res.json({ verifyToken: issueVerifyToken(phone) });
});

/** Задать пароль после подтверждения номера → выдать сессионный JWT. */
router.post('/set-password', async (req: Request, res: Response) => {
  const phone = readVerifyToken(String(req.body?.verifyToken || ''));
  const password = String(req.body?.password || '');
  if (!phone) return res.status(401).json({ error: 'Подтвердите номер заново' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль не короче 6 символов' });

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await findUserByPhone(phone);
  if (user) {
    user = await queryOne<User>(
      `UPDATE users SET password_hash = $2, phone_verified_at = NOW() WHERE id = $1 RETURNING *`,
      [user.id, passwordHash],
    );
  } else {
    user = await createPhoneUser(phone);
    user = await queryOne<User>(
      `UPDATE users SET password_hash = $2, phone_verified_at = NOW() WHERE id = $1 RETURNING *`,
      [user!.id, passwordHash],
    );
  }

  const token = generateToken(user!.id, user!.steam_id || '');
  res.json({ token, user: publicUser(user!) });
});

/** Вход по номеру + паролю. */
router.post('/login', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!validPhone(phone) || !password) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  const user = await findUserByPhone(phone);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Неверный номер или пароль' });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Неверный номер или пароль' });

  const token = generateToken(user.id, user.steam_id || '');
  res.json({ token, user: publicUser(user) });
});

function publicUser(u: User) {
  return {
    id: u.id,
    phone: u.phone,
    username: u.username,
    avatar: (u as any).avatar_url ?? null,
    steam_id: u.steam_id ?? null,
  };
}

export default router;
