# Goplay — хендовер для новой сессии

Документ переносит весь контекст из предыдущей сессии. Новая сессия должна
стартовать со **scope, включающим `husein001/goplay.mobi`** (и при желании
`goplay.tj`, `goplay.exe`, `net.goplay.tj`).

Ветка разработки во всех репо: **`claude/three-projects-ecosystem-pjlhy9`**.

---

## 1. Что за проект и цель

Экосистема из трёх проектов:
- **goplay.tj** — игры + сообщество (матчмейкинг, MMR, Steam-вход, socket.io).
  Внутри него живёт модуль **киберклубов** (`backend/src/goplaynet/`, фронт
  `/clubs/*`, и старая Capacitor-обёртка `/mobile`).
- **goplay.exe** — отдельный проект (Windows-приложение клуба).
- **net.goplay.tj** — отдельный проект (лендинг).

**Задача пользователя:** вынести всё, что связано с **киберклубом**, в отдельное
**мобильное приложение `goplay.mobi`** для App Store и Google Play. goplay.tj
должен остаться «только игры и сообщество».

### Решения, которые УЖЕ приняты (не пересматривать без спроса)
1. **Стек мобилки — Expo (React Native + TypeScript).** НЕ Flutter, НЕ Capacitor.
   Причина: переиспользование TS-стека, EAS Build (iOS без Mac).
2. **Вход в мобилке — по номеру телефона + пароль** (НЕ Steam). Первый раз —
   SMS-код для подтверждения номера, затем пользователь задаёт пароль; далее
   вход номер+пароль.
3. **Бэкенд киберклуба пока ОСТАЁТСЯ в goplay.tj** (монтируется на
   `/api/goplay-net`). Мобилка ходит туда по сети. Вынос бэкенда — отдельная
   будущая задача (там сцепка общей таблицы `users` и socket.io с играми).
4. **goplay.tj сейчас НЕ ТРОГАЕМ вообще** — на нём проводят игры/турниры.
   Никаких коммитов в goplay.tj. Чистка клубного модуля из goplay.tj —
   отдельная задача «потом».

### Открытые вопросы (нужен ответ пользователя)
- **SMS-провайдер** для отправки кодов по Таджикистану: OSON SMS / smsc.tj /
  Babilon / Twilio? От этого зависит реализация `sms.ts` на бэкенде.

---

## 2. Состояние репозиториев (на момент хендовера)

| Репо | Ветка `claude/three-projects-ecosystem-pjlhy9` |
|---|---|
| **goplay.mobi** | каркас приложения запушен (commit `e6b19fc`). **Коммит входа по телефону `bff8389` НЕ запушен** (см. ниже). |
| **goplay.tj** | НЕ трогали. Ветка = `main`. |
| **goplay.exe** | НЕ трогали. Ветка = `main`. |
| **net.goplay.tj** | НЕ трогали. Ветка = `main`. |

### ⚠️ Первое, что нужно сделать в новой сессии
На GitHub в `goplay.mobi` НЕТ изменений входа по телефону. Варианты привести
репо в актуальное состояние:
- **Если пользователь успел запушить `goplay-mobi-phone-auth.bundle`** — репо уже
  актуально, ничего не делать.
- **Иначе** — переприменить изменения входа по телефону (полностью описаны в
  разделе 4). Это: новый `app/login.tsx`, `src/api/auth.ts`, правки текстов,
  удаление `react-native-webview`, папка `server-reference/`.

Проверить можно так: если в репо есть файл `src/api/auth.ts` и папка
`server-reference/` — значит phone-auth уже на месте.

---

## 3. Что уже построено в goplay.mobi (каркас, commit e6b19fc)

Expo SDK 52, expo-router, TypeScript. `npx tsc --noEmit` проходит чисто.

```
app/
  _layout.tsx              # root: провайдеры (AuthProvider), Stack-навигация
  login.tsx                # экран входа (в каркасе был Steam; заменён — см. р.4)
  club/[slug].tsx          # экран клуба + бронирование (зона, длительность)
  (tabs)/
    _layout.tsx            # таб-навигация: Клубы/Брони/Скан/Кошелёк/Профиль
    index.tsx              # каталог клубов (FlatList, pull-to-refresh)
    bookings.tsx           # мои брони (список, отмена)
    scan.tsx               # QR-сканер входа на ПК (expo-camera)
    wallet.tsx             # кошелёк + пополнение (внешний браузер, Apple 3.1.1)
    profile.tsx            # профиль, промокод, выход
src/
  config.ts                # API_BASE_URL = https://goplay.tj; CLUB_API_URL=/api/goplay-net
  api/client.ts            # типизированный fetch (core=/api, club=/api/goplay-net), Bearer
  api/clubs.ts             # clubApi: clubs/bookings/wallet/unlock/promo/referral/...
  api/types.ts             # типы (User, Club, Booking, Wallet, ...)
  auth/AuthContext.tsx     # сессия: signInWithToken / signOut / refresh, secure-store
  auth/storage.ts          # JWT в expo-secure-store
  components/ui.tsx        # Card/Button/Title/Muted/Badge/Center
  components/RequireAuth.tsx  # гейт «нужен вход» для защищённых вкладок
  theme/colors.ts          # тёмная палитра (#0d0e16 / #171a24, primary #6c5ce7)
assets/                    # icon/splash (скопированы из старого /mobile)
app.json                   # scheme=goplay, bundleId tj.goplay.mobi, deep links, плагины
eas.json                   # профили EAS build
```

### Клубный API, на который завязана мобилка (player-facing, /api/goplay-net)
```
GET  /                      список клубов
GET  /public/:slug          клуб (детали, зоны, игры)
GET  /discover?lat&lng      клубы рядом
GET  /availability?clubId   доступность зон
POST /bookings              создать бронь (optionalAuth)
GET  /bookings/mine         мои брони (auth)
POST /bookings/:id/cancel-mine
GET  /wallet                баланс (auth)
POST /wallet/topup          пополнение (auth)
POST /unlock                разблокировать ПК по QR-токену (auth)
GET  /packages /happy-hours /referral /notifications /promocodes/redeem
```

### Формат JWT (важно для совместимости)
`generateToken(userId, steamId)` → `jwt.sign({ userId, steamId }, JWT_SECRET, {expiresIn:'90d'})`.
`authMiddleware` валидирует и кладёт `req.user={userId,steamId}`. Тот же токен
работает и для `/api/auth/*`, и для `/api/goplay-net/*`. Секрет — `JWT_SECRET`.

---

## 4. Изменение «вход по телефону» (commit bff8389 — НЕ запушен)

### Мобильная часть (готова в коммите)
- **`app/login.tsx`** — переписан как пошаговый стейт-машина:
  `phone` → (`password` если номер зарегистрирован) ИЛИ (`code` → `newPassword`
  если новый). Есть «Забыли пароль?» (через код), таймер повторной отправки,
  валидация, нормализация номера к `+992...`.
- **`src/api/auth.ts`** — `authApi`: `start / requestCode / verifyCode /
  setPassword / login` + `normalizePhone` / `isValidPhone`.
- **`src/api/types.ts`** — в `User` добавлены `phone?`, `steam_id?` nullable.
- Убран Steam-WebView вход и зависимость **`react-native-webview`**.
- Тексты «Войти через Steam» → «Войти по номеру» (RequireAuth, profile).
- **`tsconfig.json`** — добавлен `"exclude": ["node_modules","server-reference"]`.

### Контракт API (его ждёт мобилка от бэкенда)
```
POST /api/auth/phone/start        { phone }                 -> { registered }
POST /api/auth/phone/request-code { phone }                 -> { ok, resendIn }
POST /api/auth/phone/verify-code  { phone, code }           -> { verifyToken }
POST /api/auth/phone/set-password { verifyToken, password } -> { token, user }
POST /api/auth/phone/login        { phone, password }       -> { token, user }
```

### Бэкенд-пакет (готов, лежит в `server-reference/`, в goplay.tj НЕ внедрён)
- `migrations/20260624_phone_auth.sql` — `users.phone`, `users.password_hash`,
  `phone_verified_at`, `steam_id` → nullable, таблица `phone_otps`.
- `phone-auth.router.ts` — Express-роутер всех 5 эндпоинтов. bcrypt для пароля
  и кода, verifyToken — короткоживущий JWT (`purpose:'phone_verify'`), rate-limit
  и TTL на OTP. Выдаёт `generateToken(user.id, steam_id||'')`.
- `sms.ts` — интерфейс `SmsSender` + реализации console/OSON/Twilio (env-выбор).
- `README.md` — шаги интеграции в goplay.tj.

### Состояние БД (важно для бэкенда)
Сейчас `users` завязана на `steam_id` (NOT NULL), полей `phone`/`password_hash`
нет. Поэтому phone-auth требует миграции (она в пакете). `createUser` существующий
сеет MMR из Steam-сигналов — для phone-юзеров отдельный минимальный insert
(в роутере есть `createPhoneUser`, mmr=1000, подогнать под NOT NULL схемы).

---

## 5. Ограничение прошлой сессии (почему понадобился переезд)

Прошлая сессия имела scope только на `goplay.exe / goplay.tj / net.goplay.tj`.
Egress-прокси сессии **подставляет GitHub-креды сессии на любой запрос к
github.com** (проверено: запрос к api без токена возвращает `login: husein001`),
поэтому пуш в `goplay.mobi` давал `403 "Resource not accessible by integration"`
— персональный токен игнорировался. Вывод: чтобы пушить в `goplay.mobi`, он
должен быть в **scope сессии**. Новая сессия с этим scope решает проблему — пуш
пойдёт без токенов.

---

## 6. Что осталось сделать (бэклог)

1. **[mobi] Догрузить phone-auth в репо** (если не запушен bundle) — раздел 2.
2. **[решение] Выбрать SMS-провайдера** (Таджикистан) и дописать `sms.ts`.
3. **[backend, позже] Внедрить `server-reference/` в goplay.tj** — миграция +
   роутер + env. Только когда можно трогать goplay.tj (не во время игр).
4. **[mobi] Привязка телефона к существующим Steam-аккаунтам** (тот же verify-code
   → запись phone/password_hash к userId).
5. **[mobi] Пуши** (expo-notifications + FCM/APNs), карта клубов (react-native-maps),
   realtime статусов броней (socket.io-client). См. TODO в README мобилки.
6. **[goplay.tj, позже] Чистка** — удалить `/clubs/*`, `/mobile`, клубные
   компоненты из веба goplay.tj. Отдельной веткой, без мерджа, влить после игр.
7. **[mobi] Сборка в сторы** — `eas build -p android/ios`, `eas submit`.

---

## 7. Kickoff-промпт для новой сессии

> Продолжаем проект из хендовера. Контекст: переносим киберклуб из goplay.tj в
> отдельное мобильное приложение **goplay.mobi** (Expo + TS), вход **по номеру
> телефона + пароль**. goplay.tj НЕ трогаем (там игры), бэкенд клуба пока остаётся
> в goplay.tj. Ветка: `claude/three-projects-ecosystem-pjlhy9`.
>
> Сначала проверь состояние репо goplay.mobi: если в нём нет `src/api/auth.ts` и
> папки `server-reference/` — переприменить изменение «вход по телефону» (детали
> в HANDOFF.md, раздел 4). Если есть — всё актуально.
>
> Затем продолжаем по бэклогу (раздел 6). Мой ответ по SMS-провайдеру: <вписать>.
