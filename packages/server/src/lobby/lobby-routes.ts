import type { FastifyInstance, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface RoomPlayer {
  id: string;
  userId: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  players: RoomPlayer[];
  phase: 'WAITING' | 'PLAYING';
  maxPlayers: number;
  adminUserId: string;
  isPublic: boolean;
  passwordHash: string | null;
}

export interface Invite {
  token: string;
  roomId: string;
  expiresAt: number;
  used: boolean;
}

export interface LobbyConfig {
  jwtSecret: string;
  maxPlayers?: number;
}

interface AuthPayload {
  userId: string;
  email: string;
  name: string;
}

function extractUser(req: FastifyRequest, jwtSecret: string): AuthPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function createLobbyRoutes(config: LobbyConfig) {
  const rooms = new Map<string, Room>();
  const invites = new Map<string, Invite>();
  const maxPlayers = config.maxPlayers ?? 6;

  function registerRoutes(app: FastifyInstance) {
    // Create room
    app.post<{ Body: { name?: string; isPublic?: boolean; password?: string } }>(
      '/lobby/rooms',
      async (req, reply) => {
        const user = extractUser(req, config.jwtSecret);
        if (!user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const body = req.body as any || {};
        const roomId = crypto.randomUUID().slice(0, 8);
        const password = body.password || null;

        const room: Room = {
          id: roomId,
          name: body.name || `Room ${roomId}`,
          players: [],
          phase: 'WAITING',
          maxPlayers,
          adminUserId: user.userId,
          isPublic: body.isPublic !== false,
          passwordHash: password ? hashPassword(password) : null,
        };
        rooms.set(roomId, room);

        // Auto-join admin
        const playerId = crypto.randomUUID().slice(0, 8);
        room.players.push({ id: playerId, userId: user.userId, name: user.name });

        const gameToken = jwt.sign(
          { playerId, roomId: room.id, playerName: user.name },
          config.jwtSecret
        );

        return reply.code(201).send({ roomId, token: gameToken, playerId });
      }
    );

    // List rooms (only public + WAITING rooms, no password in response)
    app.get('/lobby/rooms', async (req, reply) => {
      const list = Array.from(rooms.values())
        .filter(r => r.phase === 'WAITING' && r.isPublic)
        .map(r => ({
          id: r.id,
          name: r.name,
          playerCount: r.players.length,
          maxPlayers: r.maxPlayers,
          hasPassword: r.passwordHash !== null,
          adminName: r.players.find(p => p.userId === r.adminUserId)?.name ?? 'Unknown',
        }));
      return reply.send({ rooms: list });
    });

    // Join room
    app.post<{ Params: { id: string }; Body: { password?: string; inviteToken?: string } }>(
      '/lobby/rooms/:id/join',
      async (req, reply) => {
        const user = extractUser(req, config.jwtSecret);
        if (!user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

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

        // Already in room?
        if (room.players.some(p => p.userId === user.userId)) {
          const existing = room.players.find(p => p.userId === user.userId)!;
          const gameToken = jwt.sign(
            { playerId: existing.id, roomId: room.id, playerName: existing.name },
            config.jwtSecret
          );
          return reply.send({ token: gameToken, playerId: existing.id, roomId: room.id });
        }

        const body = req.body as any || {};

        // Check invite token first (bypasses password)
        let inviteUsed = false;
        if (body.inviteToken) {
          const invite = invites.get(body.inviteToken);
          if (invite && invite.roomId === room.id && !invite.used && invite.expiresAt > Date.now()) {
            invite.used = true;
            inviteUsed = true;
          } else if (body.inviteToken) {
            return reply.code(403).send({ error: 'Invalid or expired invite' });
          }
        }

        // Check password if room has one and no valid invite
        if (room.passwordHash && !inviteUsed) {
          if (!body.password) {
            return reply.code(403).send({ error: 'Password required' });
          }
          if (hashPassword(body.password) !== room.passwordHash) {
            return reply.code(403).send({ error: 'Wrong password' });
          }
        }

        const playerId = crypto.randomUUID().slice(0, 8);
        room.players.push({ id: playerId, userId: user.userId, name: user.name });

        const gameToken = jwt.sign(
          { playerId, roomId: room.id, playerName: user.name },
          config.jwtSecret
        );

        return reply.send({ token: gameToken, playerId, roomId: room.id });
      }
    );

    // Get room details
    app.get<{ Params: { id: string } }>(
      '/lobby/rooms/:id',
      async (req, reply) => {
        const room = rooms.get(req.params.id);
        if (!room) {
          return reply.code(404).send({ error: 'Room not found' });
        }

        const user = extractUser(req, config.jwtSecret);

        return reply.send({
          id: room.id,
          name: room.name,
          phase: room.phase,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          hasPassword: room.passwordHash !== null,
          isPublic: room.isPublic,
          isAdmin: user ? room.adminUserId === user.userId : false,
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            isAdmin: p.userId === room.adminUserId,
          })),
        });
      }
    );

    // Admin: kick player
    app.delete<{ Params: { id: string; playerId: string } }>(
      '/lobby/rooms/:id/players/:playerId',
      async (req, reply) => {
        const user = extractUser(req, config.jwtSecret);
        if (!user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const room = rooms.get(req.params.id);
        if (!room) {
          return reply.code(404).send({ error: 'Room not found' });
        }

        if (room.adminUserId !== user.userId) {
          return reply.code(403).send({ error: 'Only admin can kick players' });
        }

        const targetIdx = room.players.findIndex(p => p.id === req.params.playerId);
        if (targetIdx === -1) {
          return reply.code(404).send({ error: 'Player not found' });
        }

        // Can't kick yourself
        if (room.players[targetIdx].userId === user.userId) {
          return reply.code(400).send({ error: 'Cannot kick yourself' });
        }

        room.players.splice(targetIdx, 1);
        return reply.send({ ok: true });
      }
    );

    // Admin: create invite link
    app.post<{ Params: { id: string } }>(
      '/lobby/rooms/:id/invite',
      async (req, reply) => {
        const user = extractUser(req, config.jwtSecret);
        if (!user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const room = rooms.get(req.params.id);
        if (!room) {
          return reply.code(404).send({ error: 'Room not found' });
        }

        if (room.adminUserId !== user.userId) {
          return reply.code(403).send({ error: 'Only admin can create invites' });
        }

        const inviteToken = crypto.randomUUID();
        const invite: Invite = {
          token: inviteToken,
          roomId: room.id,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          used: false,
        };
        invites.set(inviteToken, invite);

        return reply.code(201).send({
          inviteToken,
          inviteUrl: `/join/${room.id}?invite=${inviteToken}`,
          expiresIn: 300,
        });
      }
    );

    // Validate invite token (public endpoint for client to check)
    app.get<{ Params: { id: string }; Querystring: { token: string } }>(
      '/lobby/rooms/:id/invite/validate',
      async (req, reply) => {
        const token = (req.query as any).token;
        if (!token) {
          return reply.code(400).send({ valid: false, error: 'Missing token' });
        }

        const invite = invites.get(token);
        if (!invite || invite.roomId !== req.params.id || invite.used || invite.expiresAt <= Date.now()) {
          return reply.send({ valid: false });
        }

        const room = rooms.get(req.params.id);
        return reply.send({
          valid: true,
          roomName: room?.name ?? 'Unknown',
        });
      }
    );

    // Cleanup expired invites periodically
    setInterval(() => {
      const now = Date.now();
      Array.from(invites.entries()).forEach(([token, invite]) => {
        if (invite.expiresAt <= now || invite.used) {
          invites.delete(token);
        }
      });
    }, 60000);
  }

  function listRooms() {
    return Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      phase: r.phase,
      playerCount: r.players.length,
      adminName: r.players.find(p => p.userId === r.adminUserId)?.name ?? 'Unknown',
    }));
  }

  return { registerRoutes, rooms, invites, listRooms };
}
