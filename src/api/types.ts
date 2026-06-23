/**
 * Типы клубного API (зеркало бэкенда goplaynet). Держим вручную, пока бэкенд
 * не вынесен в общий пакет типов. Покрывают только player-facing эндпоинты,
 * которые использует мобильное приложение.
 */

export interface User {
  id: string;
  steam_id?: string;
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

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface Booking {
  id: string;
  club_id: string;
  club_name?: string;
  zone_id?: string | null;
  zone_name?: string | null;
  pc_id?: string | null;
  seat_label?: string | null;
  starts_at: string;
  duration_minutes: number;
  status: BookingStatus;
  total_amount?: number;
  created_at: string;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  created_at: string;
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
