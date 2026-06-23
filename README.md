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
- **react-native-webview** — Steam-вход (перехват `/auth/callback?token=`).
- **EAS Build** — сборка `.ipa`/`.aab`, в том числе iOS без Mac.

## Структура

```
app/                       # экраны (expo-router)
  _layout.tsx              # root: провайдеры, навигация
  login.tsx                # Steam-вход через WebView
  club/[slug].tsx          # клуб + бронирование
  (tabs)/
    index.tsx              # каталог клубов
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
```

## Запуск

```bash
npm install
npx expo install --fix     # выровнять версии нативных модулей под SDK
npm start                  # затем 'i' (iOS) или 'a' (Android)
```

API по умолчанию — `https://goplay.tj`. Поменять: `expo.extra.apiBaseUrl`
в `app.json` или env при сборке.

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
- [ ] Карта клубов (react-native-maps) для вкладки «Клубы».
- [ ] Реалтайм статусов броней через socket.io-client.
- [ ] Когда `goplaynet` вынесут из goplay.tj — переключить `apiBaseUrl` и
      добавить app-scheme редирект в Steam-входе.
