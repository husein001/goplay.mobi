import { API_URL, CLUB_API_URL, MOBI_API_URL } from '@/config';

/**
 * Тонкий типизированный fetch-клиент. Токен держим в модульной переменной,
 * чтобы не таскать его через каждый вызов; AuthProvider обновляет его при
 * логине/логауте.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** auth = true добавляет Bearer-токен; по умолчанию true. */
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e: any) {
    throw new ApiError(0, e?.message || 'Нет соединения с сервером');
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Ошибка ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Запрос к ядру (auth, профиль): /api/... */
export const core = {
  get: <T>(path: string, o?: RequestOptions) => request<T>(API_URL, path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    request<T>(API_URL, path, { ...o, method: 'POST', body }),
};

/** Запрос к клубному модулю: /api/goplay-net/... */
export const club = {
  get: <T>(path: string, o?: RequestOptions) => request<T>(CLUB_API_URL, path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    request<T>(CLUB_API_URL, path, { ...o, method: 'POST', body }),
};

/** Запрос к mobi-неймспейсу: /api/mobi/... (вход по телефону и т.д.) */
export const mobi = {
  get: <T>(path: string, o?: RequestOptions) => request<T>(MOBI_API_URL, path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    request<T>(MOBI_API_URL, path, { ...o, method: 'POST', body }),
};
