/**
 * Источник данных для центра уведомлений. Тянет с бэкенда (`clubApi.notifications`),
 * а в режиме без бэкенда (`AUTH_STUB`) отдаёт демо-набор, чтобы экран и бейдж в
 * шапке не были пустыми. Когда подключим бэкенд (`AUTH_STUB = false`) —
 * демо-данные не используются.
 */
import { clubApi } from '@/api/clubs';
import { AUTH_STUB } from '@/config';
import type { ClubNotification } from '@/api/types';

const DEMO: ClubNotification[] = [
  {
    id: 'n1',
    title: 'Бронь подтверждена',
    body: 'Standart · сегодня в 18:00',
    read: false,
    created_at: '2026-06-27T15:10:00',
  },
  {
    id: 'n2',
    title: 'Бонус зачислен',
    body: '+50 c за приглашённого друга',
    read: false,
    created_at: '2026-06-27T12:30:00',
  },
  {
    id: 'n3',
    title: 'Счастливые часы',
    body: 'Скидка 30% утром, 08:00–12:00',
    read: true,
    created_at: '2026-06-26T09:00:00',
  },
];

export async function fetchNotifications(): Promise<ClubNotification[]> {
  try {
    const list = await clubApi.notifications();
    if (Array.isArray(list) && list.length) return list;
  } catch {
    // бэкенд недоступен — ниже отдадим демо (в режиме эмуляции)
  }
  return AUTH_STUB ? DEMO : [];
}
