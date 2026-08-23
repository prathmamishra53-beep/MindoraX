import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── JWT auth middleware for ALL namespaces ──────────────────────────────
  const authMiddleware = (socket: any, next: any) => {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'fallback_secret') as { id: string };
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  };

  // ── /posts namespace — real-time comments & likes ──────────────────────
  const postsNS = io.of('/posts');
  postsNS.use(authMiddleware);
  postsNS.on('connection', (socket: any) => {
    console.log(`[Socket/posts] User ${socket.userId} connected`);

    socket.on('join-post', (postId: string) => {
      socket.join(`post:${postId}`);
    });

    socket.on('leave-post', (postId: string) => {
      socket.leave(`post:${postId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket/posts] User ${socket.userId} disconnected`);
    });
  });

  // ── /chat namespace — private messaging ────────────────────────────────
  const chatNS = io.of('/chat');
  chatNS.use(authMiddleware);
  chatNS.on('connection', (socket: any) => {
    console.log(`[Socket/chat] User ${socket.userId} connected`);

    // Each user joins their own inbox room
    socket.join(`inbox:${socket.userId}`);

    socket.on('typing', ({ to }: { to: string }) => {
      chatNS.to(`inbox:${to}`).emit('typing', { from: socket.userId });
    });

    socket.on('stop-typing', ({ to }: { to: string }) => {
      chatNS.to(`inbox:${to}`).emit('stop-typing', { from: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket/chat] User ${socket.userId} disconnected`);
    });
  });

  // ── /notifications namespace ─────────────────────────────────────────
  const notifsNS = io.of('/notifications');
  notifsNS.use(authMiddleware);
  notifsNS.on('connection', (socket: any) => {
    socket.join(`notif:${socket.userId}`);
    console.log(`[Socket/notif] User ${socket.userId} connected`);
    socket.on('disconnect', () => {
      console.log(`[Socket/notif] User ${socket.userId} disconnected`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
};
