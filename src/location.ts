import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Центр Душанбе — фолбэк, если геолокация недоступна или отклонена. */
export const DUSHANBE: Coords = { lat: 38.5598, lng: 68.787 };

/**
 * Запрашивает разрешение и возвращает координаты устройства.
 * Возвращает `null`, если пользователь отказал или произошла ошибка —
 * вызывающий код в этом случае показывает клубы вокруг дефолтной точки.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
