import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { club } from '@/api/client';

/**
 * Push-уведомления (системные, приходят при закрытом приложении).
 *
 * Сервер шлёт push через Expo Push API по токену, сохранённому здесь
 * (POST /device-token). Реальная доставка в нативном билде требует ключа FCM
 * (Android) / APNs (iOS) в EAS — сам код от этого не зависит. В Expo Go / на
 * эмуляторе токена может не быть: такие случаи мягко пропускаем (try/catch).
 */
let listeners: Array<{ remove: () => void }> = [];
let handlerSet = false;

function ensureHandler(): void {
  if (handlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  } catch {
    /* ignore */
  }
}

/** Запросить разрешение, получить Expo push-токен и отправить его на бэкенд. */
export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // эмулятор/web — токена нет
  ensureHandler();

  let granted = false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    }
  } catch {
    return;
  }
  if (!granted) return;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Goplay',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch {
      /* ignore */
    }
  }

  let token: string | null = null;
  try {
    const res = await Notifications.getExpoPushTokenAsync();
    token = res?.data ?? null;
  } catch {
    token = null;
  }
  if (!token) return;

  try {
    await club.post('/device-token', { token, platform: Platform.OS });
  } catch {
    /* не критично */
  }

  // Тап по системному пушу (навигацию по типу можно добавить позже).
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {});
    listeners.push(sub);
  } catch {
    /* ignore */
  }
}

export function unregisterPushHandlers(): void {
  listeners.forEach((l) => {
    try { l.remove(); } catch { /* ignore */ }
  });
  listeners = [];
}
