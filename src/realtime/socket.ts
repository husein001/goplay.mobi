import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config';

/**
 * Singleton-сокет к бэкенду Goplay. Сервер по JWT в handshake.auth.token сам
 * заводит клиента в комнату `user:<id>` и шлёт туда события (`notification`,
 * `seat:*` и т.д.). Путь сокета на бэке — `/api/socket.io`.
 */
let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  if (socket && currentToken === token) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  currentToken = token;
  socket = io(API_BASE_URL, {
    path: '/api/socket.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) { socket.disconnect(); socket = null; }
  currentToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
