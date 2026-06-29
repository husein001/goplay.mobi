import { club, core } from './client';
import type {
  Booking,
  Club,
  ClubDetail,
  ChatMessage,
  ChatThread,
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
  // QR у ПК кодирует ссылку …/clubs/seat?p=<pcId>&n=<nonce>. Бэкенд /unlock
  // ждёт именно { pcId, nonce } — стартует сессию с кошелька клуба.
  unlockSeat: (seat: { pcId: string; nonce: string }) =>
    club.post<{
      session: { id: string; pc_name?: string; club_id: string; awaiting_funds?: boolean };
      wallet: { balance?: number } | null;
    }>('/unlock', seat),

  // --- чат с админом (доступен при открытой сессии) ---
  myChat: () => club.get<{ active: boolean; thread: ChatThread | null; messages: ChatMessage[] }>('/chat/my'),
  sendChatMessage: (text: string) =>
    club.post<{ message: ChatMessage }>('/chat/my/message', { text }),

  // Реферал/промокоды отключены на запуск (баланс по клубам делает их неоднозначными).

  // --- уведомления (бэкенд оборачивает в { notifications, unread }) ---
  notifications: () =>
    club.get<{ notifications: ClubNotification[]; unread: number }>('/notifications').then((r) => r.notifications ?? []),
  markRead: (id: string) => club.post<{ ok: true }>(`/notifications/${id}/read`),
  markAllRead: () => club.post<{ ok: true }>('/notifications/read-all'),
};
