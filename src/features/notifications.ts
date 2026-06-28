/**
 * Источник данных для центра уведомлений — реальный бэкенд (`clubApi.notifications`).
 * Без мок-данных: при ошибке/пустом ответе возвращаем пустой список.
 */
import { clubApi } from '@/api/clubs';
import type { ClubNotification } from '@/api/types';

export async function fetchNotifications(): Promise<ClubNotification[]> {
  return clubApi.notifications().catch(() => [] as ClubNotification[]);
}
