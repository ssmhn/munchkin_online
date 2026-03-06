import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface Room {
  id: string;
  players: { id: string; name: string }[];
  phase: 'WAITING' | 'PLAYING';
  maxPlayers: number;
}

export interface LobbyConfig {
  jwtSecret: string;
  maxPlayers?: number;
}

export function createLobbyRoutes(config: LobbyConfig) {
  const rooms = new Map<string, Room>();
  const maxPlayers = config.maxPlayers ?? 6;

  function registerRoutes(app: FastifyInstance) {
    app.post('/lobby/rooms', async (_req, reply) => {
      const roomId = crypto.randomUUID().slice(0, 8);
      const room: Room = {
        id: roomId,
        players: [],
        phase: 'WAITING',
        maxPlayers,
      };
      rooms.set(roomId, room);
      return reply.code(201).send({ roomId });
    });

    app.get('/lobby/rooms', async (_req, reply) => {
      const list = Array.from(rooms.values())
        .filter(r => r.phase === 'WAITING')
        .map(r => ({
          id: r.id,
          playerCount: r.players.length,
          maxPlayers: r.maxPlayers,
        }));
      return reply.send({ rooms: list });
    });

    app.post<{ Params: { id: string }; Body: { playerName?: string } }>(
      '/lobby/rooms/:id/join',
      async (req, reply) => {
        const room = rooms.get(req.params.id);
        if (!room) {
          return reply.code(404).send({ error: 'Room not found' });
        }

        if (room.phase !== 'WAITING') {
          return reply.code(400).send({ error: 'Game already started' });
        }

        if (room.players.length >= room.maxPlayers) {
          return reply.code(400).send({ error: 'Room is full' });
        }

        const playerId = crypto.randomUUID().slice(0, 8);
        const playerName = (req.body as any)?.playerName || `Player ${room.players.length + 1}`;

        room.players.push({ id: playerId, name: playerName });

        const token = jwt.sign(
          { playerId, roomId: room.id, playerName },
          config.jwtSecret
        );

        return reply.send({ token, playerId, roomId: room.id });
      }
    );
  }

  return { registerRoutes, rooms };
}
