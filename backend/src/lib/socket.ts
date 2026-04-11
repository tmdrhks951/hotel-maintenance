import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '@/config/env';

// TODO: STEP 2+에서 실제 이벤트(알림, 상태 업데이트 등) 연결

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

export function getSocketServer(): SocketServer | null {
  return io;
}
