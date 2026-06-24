# Goplay Mobi 📱

Мобильное приложение **киберклубов Goplay** для **App Store** и **Google Play**.
Сюда переезжают все фичи, связанные с клубами: каталог клубов, брони, вход на ПК
по **QR**, кошелёк, промокоды, рефералка, пуш-уведомления.

> `goplay.tj` остаётся продуктом про **игры и сообщество**. Клубный бэкенд
> (`goplaynet`) пока живёт в репозитории `goplay.tj` и монтируется на
> `/api/goplay-net`; приложение ходит туда по сети. Вынос самого бэкенда —
> отдельная задача.

## Стек

- **Expo (SDK 52) + React Native + TypeScript** — один код на iOS и Android,
  тот же язык, что и весь стек Goplay (бэкенд/веб/админка/агент).
- **expo-router** — файловая навигация.
- **expo-camera** — сканер QR.
- **expo-secure-store** — JWT в keychain/keystore.
- **Вход по номеру телефона** — SMS-код один раз, затем пароль (см.
  `app/login.tsx` + `server-reference/` для бэкенда).
- **EAS Build** — сборка `.ipa`/`.aab`, в том числе iOS без Mac.

## Структура

```
app/                       # экраны (expo-router)
  _layout.tsx              # root: провайдеры, навигация
  login.tsx                # вход по номеру: телефон → SMS-код → пароль
  club/[slug].tsx          # клуб + бронирование
  (tabs)/
    index.tsx              # каталог клубов
    map.tsx                # клубы на карте (геолокация + react-native-maps)
    bookings.tsx           # мои брони
    scan.tsx               # QR-сканер (вход на ПК)
    wallet.tsx             # кошелёк + пополнение
    profile.tsx            # профиль, промокод, выход
src/
  config.ts                # API base URL (expo.extra.apiBaseUrl)
  api/                     # client.ts, clubs.ts, types.ts
  auth/                    # AuthContext, secure-store
  components/              # ui.tsx, RequireAuth
  theme/                   # палитра
server-reference/          # готовый бэкенд входа по телефону (для goplay.tj)
```

## Запуск

```bash
npm install
npx expo install --fix     # выровнять версии нативных модулей под SDK
npm start                  # затем 'i' (iOS) или 'a' (Android)
```

API по умолчанию — `https://goplay.tj`. Бэкенд разнесён по неймспейсам:
`/api/*` — ядро (профиль), `/api/goplay-net` — клубы (общий с десктоп .exe),
`/api/mobi` — вход по телефону и прочее mobi-only.

### Переменные окружения (EAS secrets / env при сборке)

| Переменная | Назначение |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Ключ Google Maps для **Android** (вкладка «Карта»). iOS использует Apple Maps, ключ не нужен. Подставляется в `app.config.js`. |
| `API_BASE_URL` | Переопределить бэкенд (по умолчанию `https://goplay.tj`). |

```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <ключ>
```

## Сборка в сторы (EAS)

```bash
npm i -g eas-cli
eas login
eas build --profile production --platform android   # .aab для Play
eas build --profile production --platform ios        # .ipa для App Store
eas submit --platform android
eas submit --platform ios
```

## Заметки по ревью сторов

- **Apple 3.1.1 (IAP):** пополнение кошелька открываем во внешнем браузере
  (`Linking.openURL` по ссылке от бэкенда) — внутри приложения только трата
  баланса. Так проходим без обязательного IAP.
- **Apple 4.2 (Minimum Functionality):** это нативное приложение, а не обёртка —
  нативная камера/QR, secure-store, пуши. (Старую Capacitor-обёртку из
  `goplay.tj/mobile` заменяет именно этот репозиторий.)
- **Deep links:** `applinks:goplay.tj` (iOS) и App Links на `/clubs` (Android)
  уже прописаны в `app.json` — QR-ссылка может открывать приложение.

## TODO

- [ ] Пуш-уведомления (expo-notifications + FCM/APNs); токен слать на бэкенд.
- [x] Карта клубов (react-native-maps + expo-location) — вкладка «Карта».
      На Android для прода нужен Google Maps API key (`android.config.googleMaps.apiKey`).
- [ ] Реалтайм статусов броней через socket.io-client.
- [x] **Бэкенд входа по телефону** — реализован в goplay.tj в неймспейсе
      `backend/src/mobi` (`/api/mobi/auth/phone/*`), SMS-провайдер OSON.
      Для прода задать env: `SMS_PROVIDER=oson`, `OSON_LOGIN`, `OSON_HASH`, `OSON_SENDER`.
      Папка `server-reference/` оставлена как исходный референс (уже внедрено).
- [ ] Привязка телефона к существующим Steam-аккаунтам.
- [ ] Когда `goplaynet` вынесут из goplay.tj — переключить `apiBaseUrl`.
