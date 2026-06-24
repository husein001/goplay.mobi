-- Phone + password auth for the mobile app (goplay.mobi).
-- Run once against the shared Postgres used by goplay.tj / goplaynet.
--
-- Makes steam_id optional (phone users have no Steam) and adds the columns
-- needed to log in by phone number with a password.

ALTER TABLE users ALTER COLUMN steam_id DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone           VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash   VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Уникальность номера (частичный индекс — несколько NULL допускаются).
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON users (phone) WHERE phone IS NOT NULL;

-- Хранилище одноразовых кодов. В проде можно заменить на Redis (см. otp-store.ts).
CREATE TABLE IF NOT EXISTS phone_otps (
  phone        VARCHAR(20) PRIMARY KEY,
  code_hash    VARCHAR(255) NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);
