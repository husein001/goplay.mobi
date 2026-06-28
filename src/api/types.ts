/**
 * Типы клубного API (зеркало бэкенда goplaynet). Держим вручную, пока бэкенд
 * не вынесен в общий пакет типов. Покрывают только player-facing эндпоинты,
 * которые использует мобильное приложение.
 */

export interface User {
  id: string;
  steam_id?: string | null;
  phone?: string | null;
  username: string;
  avatar?: string | null;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  address?: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  price_from?: number | null;
  is_open?: boolean;
  distance_km?: number | null;
}

export interface Zone {
  id: string;
  name: string;
  price_per_hour: number;
  seats_total?: number;
  seats_free?: number;
}

export interface ClubDetail extends Club {
  description?: string | null;
  phone?: string | null;
  zones?: Zone[];
  photos?: string[];
  games?: Game[];
}

export interface Game {
  id: string;
  name: string;
  icon_url?: string | null;
}

// Зеркало бэкенда (booking.model): pending | confirmed | cancelled | done | no_show.
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done' | 'no_show';

export interface Booking {
  id: string;
  club_id: string;
  club_name?: string;
  zone_id?: string | null;
  zone_name?: string | null;
  pc_id?: string | null;
  pc_label?: string | null;
  starts_at: string;
  duration_hours: number;
  status: BookingStatus;
  estimated_total?: number;
  created_at: string;
}

/** Кошелёк игрока В КОНКРЕТНОМ КЛУБЕ (баланс отдельный на каждый клуб). */
export interface ClubWallet {
  user_id: string;
  club_id: string;
  club_name: string;
  club_slug: string | null;
  balance: number;
  bonus_minutes: number;
  /** Несведённые пополнения «в долг» — к оплате при выходе. */
  owed: number;
}

export interface WalletTransaction {
  id: string;
  club_id: string;
  type: string;
  amount: number;
  balance_after: number;
  /** Для пополнений: получены ли деньги (false = «в долг», оплата при выходе). */
  settled: boolean;
  settled_at?: string | null;
  ref_type?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface TopupRequest {
  id: string;
  club_id: string;
  amount: number;
  note: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  resolved_at?: string | null;
}

export interface Package {
  id: string;
  name: string;
  hours: number;
  price: number;
  zone_name?: string | null;
}

export interface HappyHour {
  id: string;
  title: string;
  discount_percent: number;
  starts_at?: string;
  ends_at?: string;
}

export interface ClubNotification {
  id: string;
  title: string;
  body?: string | null;
  read: boolean;
  created_at: string;
}

export interface ReferralInfo {
  code: string;
  invited_count: number;
  reward_total: number;
}
