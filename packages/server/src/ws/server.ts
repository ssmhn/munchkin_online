import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import jwt from 'jsonwebtoken';
import { WsClient } from './ws-client';
import { MessageRouter } from './message-router';

export interface ServerConfig {
  port: number;
  jwtSecret: string;
}

export interface JwtPayload {
  playerId: string;
  roomId: string;
}

export function createServer(config: ServerConfig) {
  const app = Fastify({ logger: false });
  const router = new MessageRouter();

  app.register(websocket);

  app.register(async (fastify) => {
    fastify.get('/game/:roomId', { websocket: true }, (socket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || (req.headers.authorization?.replace('Bearer ', ''));

      if (!token) {
        socket.close(4001, 'Missing JWT token');
        return;
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      } catch {
        socket.close(4001, 'Invalid JWT token');
        return;
      }

      const client = new WsClient(socket, payload.playerId, payload.roomId);

      socket.on('message', (data: Buffer) => {
        router.route(client, data.toString());
      });

      socket.on('close', () => {
        // Connection cleanup handled by GameRoom
      });
    });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    // Heartbeat logic will be managed per-room
  }, 30000);

  app.addHook('onClose', () => {
    clearInterval(heartbeatInterval);
  });

  return { app, router };
}
