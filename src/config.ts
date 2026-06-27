import Constants from 'expo-constants';

/**
 * Базовый URL бэкенда Goplay. Клубный API пока живёт в репозитории goplay.tj
 * и монтируется на `/api/goplay-net` (миграция самого бэкенда — отдельная
 * задача). Меняется через `expo.extra.apiBaseUrl` в app.json или env при сборке.
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://goplay.tj';

/** Корень REST-ядра (auth, профиль). */
export const API_URL = `${API_BASE_URL}/api`;

/** Клубный модуль (киберклубы, брони, кошелёк, QR) — общий с десктоп .exe. */
export const CLUB_API_URL = `${API_BASE_URL}/api/goplay-net`;

/** Неймспейс мобильного приложения (вход по телефону и др. mobi-only эндпоинты). */
export const MOBI_API_URL = `${API_BASE_URL}/api/mobi`;

/**
 * Временная локальная эмуляция входа, пока нет SMS-кредов на бэкенде.
 * При `true` весь телефонный вход (start/код/пароль) обслуживается локально
 * (`src/auth/stubAuth.ts`), ОТП — статичный `STUB_OTP`, аккаунты хранятся на
 * устройстве. Когда появятся реальные креды — поставить `false`, и вернутся
 * вызовы реального бэкенда `/api/mobi/auth/phone/*`.
 */
export const AUTH_STUB = true;

/** Статичный код подтверждения для режима `AUTH_STUB`. */
export const STUB_OTP = '123456';
