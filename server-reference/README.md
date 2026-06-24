# Бэкенд: вход по номеру телефона (drop-in для goplay.tj)

Мобильное приложение использует вход **по номеру + паролю** (см. `app/login.tsx`).
Этих эндпоинтов в goplay.tj пока нет — здесь лежит готовая реализация, которую
нужно перенести в backend, когда будем его трогать (сейчас goplay.tj не меняем).

## Что внутри
| Файл | Назначение |
|---|---|
| `migrations/20260624_phone_auth.sql` | колонки `phone`/`password_hash` в `users`, таблица `phone_otps`, `steam_id` → nullable |
| `phone-auth.router.ts` | Express-роутер: start / request-code / verify-code / set-password / login |
| `sms.ts` | интерфейс SMS-провайдера (console / OSON / Twilio) |

## Шаги интеграции (когда дойдут руки до бэкенда)
1. `npm i bcryptjs && npm i -D @types/bcryptjs`
2. Применить миграцию `20260624_phone_auth.sql` к общей БД.
3. Положить `sms.ts` → `backend/src/services/sms.ts`, `phone-auth.router.ts` →
   `backend/src/routes/phone-auth.ts`, поправить относительные импорты.
4. Смонтировать роутер:
   ```ts
   import phoneAuth from './routes/phone-auth';
   app.use('/api/auth/phone', phoneAuth);
   ```
5. Задать env: `SMS_PROVIDER`, креды провайдера, `JWT_SECRET` (тот же, что у игр).
6. Добавить `phone` и `password_hash` в тип `User` (`backend/src/types`).

## Контракт API (что ждёт мобилка)
```
POST /api/auth/phone/start        { phone }                 -> { registered }
POST /api/auth/phone/request-code { phone }                 -> { ok, resendIn }
POST /api/auth/phone/verify-code  { phone, code }           -> { verifyToken }
POST /api/auth/phone/set-password { verifyToken, password } -> { token, user }
POST /api/auth/phone/login        { phone, password }       -> { token, user }
```
Выдаваемый `token` — обычный JWT `generateToken(user.id, steam_id)`, поэтому он
сразу работает и с `/api/goplay-net/*`.

## Решения, которые нужны от тебя
1. **SMS-провайдер** — кто шлёт коды по Таджикистану? (OSON SMS / smsc.tj /
   Babilon / Twilio). От этого зависят креды и формат запроса в `sms.ts`.
2. **Где живёт этот бэкенд** — пока договорились «остаётся в goplay.tj».
3. Существующим Steam-игрокам можно потом разрешить **привязать телефон**
   (тот же verify-code → запись `phone`/`password_hash` к их userId).

> В проде вместо хранения OTP в Postgres удобно взять Redis (TTL из коробки).
> Текущая таблица `phone_otps` рабочая, но Redis снимает гонки при нескольких
> инстансах.
