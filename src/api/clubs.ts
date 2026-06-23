import { club, core } from './client';
import type {
  Booking,
  Club,
  ClubDetail,
  ClubNotification,
  HappyHour,
  Package,
  ReferralInfo,
  User,
  Wallet,
  WalletTransaction,
} from './types';

/** Все player-facing вызовы клубного API в одном месте. */
export const clubApi = {
  // --- профиль (ядро) ---
  me: () => core.get<{ user: User }>('/auth/me'),

  // --- каталог клубов ---
  listClubs: () => club.get<Club[]>('/', { auth: false }),
  discover: (lat?: number, lng?: number) =>
    club.get<Club[]>(
      `/discover${lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ''}`,
      { auth: false },
    ),
  getClub: (slug: string) => club.get<ClubDetail>(`/public/${slug}`, { auth: false }),
  availability: (clubId: string) =>
    club.get<{ zones: { zone_id: string; seats_free: number }[] }>(
      `/availability?clubId=${clubId}`,
      { auth: false },
    ),

  // --- брони ---
  createBooking: (input: {
    clubId: string;
    zoneId?: string;
    startsAt: string;
    durationMinutes: number;
    contactPhone?: string;
  }) => club.post<{ booking: Booking }>('/bookings', input),
  myBookings: () => club.get<Booking[]>('/bookings/mine'),
  cancelBooking: (id: string) => club.post<{ ok: true }>(`/bookings/${id}/cancel-mine`),

  // --- кошелёк ---
  wallet: () => club.get<Wallet>('/wallet'),
  walletTransactions: () => club.get<WalletTransaction[]>('/wallet?history=1'),
  topup: (amount: number) => club.post<{ url?: string; balance?: number }>('/wallet/topup', { amount }),

  // --- QR: вход на ПК ---
  unlockSeat: (token: string) => club.post<{ ok: true; seat?: string }>('/unlock', { token }),

  // --- бонусы ---
  packages: () => club.get<Package[]>('/packages', { auth: false }),
  happyHours: () => club.get<HappyHour[]>('/happy-hours', { auth: false }),
  referral: () => club.get<ReferralInfo>('/referral'),
  redeemReferral: (code: string) => club.post<{ ok: true }>('/referral/redeem', { code }),
  redeemPromo: (code: string) => club.post<{ ok: true; message?: string }>('/promocodes/redeem', { code }),

  // --- уведомления ---
  notifications: () => club.get<ClubNotification[]>('/notifications'),
  markRead: (id: string) => club.post<{ ok: true }>(`/notifications/${id}/read`),
  markAllRead: () => club.post<{ ok: true }>('/notifications/read-all'),
};
