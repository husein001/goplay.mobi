import { club, core } from './client';
import type {
  Booking,
  Club,
  ClubDetail,
  ClubNotification,
  ClubWallet,
  TopupRequest,
  User,
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

  // --- кошелёк (баланс ОТДЕЛЬНЫЙ на каждый клуб) ---
  // Один вызов отдаёт балансы по всем клубам + историю операций.
  wallet: (clubId?: string) =>
    club.get<{ wallets: ClubWallet[]; transactions: WalletTransaction[] }>(
      `/wallet${clubId ? `?clubId=${clubId}` : ''}`,
    ),
  // Заявка на пополнение «издалека»/из чата: кассир клуба одобряет, деньги
  // оплачиваются наличными (в т.ч. «в долг» — при выходе). Онлайн-оплаты нет.
  requestTopup: (clubId: string, amount: number, note?: string) =>
    club.post<{ request: TopupRequest }>('/wallet/topup-request', { clubId, amount, note }),
  myTopupRequests: () => club.get<{ requests: TopupRequest[] }>('/wallet/topup-requests'),

  // --- QR: вход на ПК ---
  unlockSeat: (token: string) => club.post<{ ok: true; seat?: string }>('/unlock', { token }),

  // Реферал/промокоды отключены на запуск (баланс по клубам делает их неоднозначными).

  // --- уведомления ---
  notifications: () => club.get<ClubNotification[]>('/notifications'),
  markRead: (id: string) => club.post<{ ok: true }>(`/notifications/${id}/read`),
  markAllRead: () => club.post<{ ok: true }>('/notifications/read-all'),
};
