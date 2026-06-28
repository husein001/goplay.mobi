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
 * Локальная эмуляция входа отключена — приложение работает с реальным бэкендом
 * `/api/mobi/auth/phone/*`. Регистрация без SMS: номер + имя + пароль; вход —
 * номер + пароль. SMS-OTP не используется (нет кредов), поэтому мок не нужен.
 */
export const AUTH_STUB = false;

/** Статичный код подтверждения для режима `AUTH_STUB`. */
export const STUB_OTP = '123456';
