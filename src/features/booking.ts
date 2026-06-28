/**
 * Данные для формы бронирования: список клубов с зонами (реальный бэкенд).
 * Никаких мок-данных — если каталог пуст или недоступен, возвращаем пустой список.
 */
import { clubApi } from '@/api/clubs';
import type { Zone } from '@/api/types';

export interface BookableClub {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  zones: Zone[];
}

export async function loadBookableClubs(): Promise<BookableClub[]> {
  const list = await clubApi.listClubs().catch(() => []);
  const detailed = await Promise.all(
    list.slice(0, 12).map(async (c) => {
      const d = await clubApi.getClub(c.slug).catch(() => null);
      return { id: c.id, slug: c.slug, name: c.name, city: c.city ?? null, zones: d?.zones ?? [] };
    }),
  );
  // Для брони нужны зоны (цена/выбор) — клубы без зон не показываем.
  return detailed.filter((c) => c.zones.length > 0);
}
