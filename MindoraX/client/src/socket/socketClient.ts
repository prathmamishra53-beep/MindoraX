import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_API_URL;

let postsSocket: Socket | null = null;
let chatSocket: Socket | null = null;

export const connectSockets = (token: string) => {
  if (postsSocket?.connected) postsSocket.disconnect();
  if (chatSocket?.connected) chatSocket.disconnect();

  postsSocket = io(`${SERVER_URL}/posts`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  chatSocket = io(`${SERVER_URL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  postsSocket.on('connect', () => console.log('[Socket/posts] connected'));
  chatSocket.on('connect', () => console.log('[Socket/chat] connected'));
  postsSocket.on('connect_error', (e) => console.warn('[Socket/posts] error', e.message));
  chatSocket.on('connect_error', (e) => console.warn('[Socket/chat] error', e.message));
};

export const disconnectSockets = () => {
  postsSocket?.disconnect();
  chatSocket?.disconnect();
  postsSocket = null;
  chatSocket = null;
};

export const getPostsSocket = () => postsSocket;
export const getChatSocket = () => chatSocket;
