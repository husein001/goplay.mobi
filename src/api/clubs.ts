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
  Zone,
} from './types';

/** Все player-facing вызовы клубного API в одном месте. */
export const clubApi = {
  // --- профиль (ядро) ---
  me: () => core.get<{ user: User }>('/auth/me'),

  // --- каталог клубов (бэкенд оборачивает в { clubs } / { club, zones }) ---
  listClubs: () =>
    club.get<{ clubs: Club[] }>('/discover', { auth: false }).then((r) => r.clubs ?? []),
  discover: (lat?: number, lng?: number) =>
    club
      .get<{ clubs: Club[] }>(
        `/discover${lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : ''}`,
        { auth: false },
      )
      .then((r) => r.clubs ?? []),
  getClub: (slug: string) =>
    club
      .get<{ club: ClubDetail; zones: Zone[] }>(`/public/${slug}`, { auth: false })
      .then((r) => ({ ...r.club, zones: r.zones ?? [] })),
  availability: (clubId: string) =>
    club.get<{ zones: { zone_id: string; seats_free: number }[] }>(
      `/availability?clubId=${clubId}`,
      { auth: false },
    ),

  // --- брони (бэкенд ждёт durationHours; ответы — { bookings } / { booking }) ---
  createBooking: (input: {
    clubId: string;
    zoneId?: string;
    startsAt: string;
    durationHours: number;
    contactPhone?: string;
  }) => club.post<{ booking: Booking }>('/bookings', input),
  myBookings: () =>
    club.get<{ bookings: Booking[] }>('/bookings/mine').then((r) => r.bookings ?? []),
  cancelBooking: (id: string) => club.post<{ booking: Booking }>(`/bookings/${id}/cancel-mine`),

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
