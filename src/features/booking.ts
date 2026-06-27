/**
 * Данные и хранилище для бронирования.
 *
 * - `loadBookableClubs` — клубы с зонами для выбора в форме брони. В режиме без
 *   бэкенда (`AUTH_STUB`) отдаёт демо-клубы, иначе тянет каталог + зоны с API.
 * - локальное хранилище броней (`AUTH_STUB`) — чтобы созданная бронь появлялась
 *   во вкладке «Брони», пока бэкенд недоступен. Когда подключим бэкенд
 *   (`AUTH_STUB = false`), используется реальный `clubApi`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clubApi } from '@/api/clubs';
import { AUTH_STUB } from '@/config';
import type { Booking, Zone } from '@/api/types';

export interface BookableClub {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  zones: Zone[];
}

const DEMO_CLUBS: BookableClub[] = [
  {
    id: 'c1',
    slug: 'goplay-center',
    name: 'Goplay Center',
    city: 'Душанбе',
    zones: [
      { id: 'z1', name: 'Standart', price_per_hour: 15, seats_free: 8 },
      { id: 'z2', name: 'Prime', price_per_hour: 25, seats_free: 4 },
      { id: 'z3', name: 'VIP', price_per_hour: 40, seats_free: 2 },
    ],
  },
  {
    id: 'c2',
    slug: 'goplay-arena',
    name: 'Goplay Arena',
    city: 'Душанбе',
    zones: [
      { id: 'z4', name: 'Standart', price_per_hour: 12, seats_free: 10 },
      { id: 'z5', name: 'Bootcamp', price_per_hour: 30, seats_free: 5 },
    ],
  },
];

export async function loadBookableClubs(): Promise<BookableClub[]> {
  if (!AUTH_STUB) {
    try {
      const list = await clubApi.listClubs();
      const detailed = await Promise.all(
        (list ?? []).slice(0, 12).map(async (c) => {
          const d = await clubApi.getClub(c.slug).catch(() => null);
          return { id: c.id, slug: c.slug, name: c.name, city: c.city ?? null, zones: d?.zones ?? [] };
        }),
      );
      if (detailed.length) return detailed;
    } catch {
      // бэкенд недоступен — ниже демо (в режиме эмуляции)
    }
  }
  return DEMO_CLUBS;
}

// --- локальное хранилище броней (только режим AUTH_STUB) ---

const BOOKINGS_KEY = 'goplay.stub.bookings';

export async function getLocalBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

export async function addLocalBooking(booking: Booking): Promise<void> {
  const list = await getLocalBookings();
  list.unshift(booking);
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
}

export async function cancelLocalBooking(id: string): Promise<void> {
  const list = await getLocalBookings();
  const next = list.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b));
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
}
