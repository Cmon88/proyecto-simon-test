import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = localStorage.getItem('simon.token');
  if (socket && socket.connected && (socket.auth as any)?.token === token) return socket;

  if (socket) socket.disconnect();
  socket = io(WS_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
