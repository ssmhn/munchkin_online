import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { createLobbyRoutes } from '../src/lobby/lobby-routes';

const JWT_SECRET = 'test-lobby-secret';

describe('Lobby HTTP API', () => {
  const app = Fastify();
  const lobby = createLobbyRoutes({ jwtSecret: JWT_SECRET, maxPlayers: 6 });

  beforeAll(async () => {
    lobby.registerRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /lobby/rooms creates a room', async () => {
    const res = await app.inject({ method: 'POST', url: '/lobby/rooms' });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomId).toBeDefined();
    expect(typeof body.roomId).toBe('string');
  });

  it('7th join returns 400 (max 6 players)', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/lobby/rooms' });
    const { roomId } = createRes.json();

    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/lobby/rooms/${roomId}/join`,
        payload: { playerName: `P${i + 1}` },
      });
      expect(res.statusCode).toBe(200);
    }

    const res7 = await app.inject({
      method: 'POST',
      url: `/lobby/rooms/${roomId}/join`,
      payload: { playerName: 'P7' },
    });
    expect(res7.statusCode).toBe(400);
    expect(res7.json().error).toBe('Room is full');
  });

  it('JWT contains playerId and roomId', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/lobby/rooms' });
    const { roomId } = createRes.json();

    const joinRes = await app.inject({
      method: 'POST',
      url: `/lobby/rooms/${roomId}/join`,
      payload: { playerName: 'Alice' },
    });

    const { token } = joinRes.json();
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    expect(decoded.playerId).toBeDefined();
    expect(decoded.roomId).toBe(roomId);
    expect(decoded.playerName).toBe('Alice');
  });
});
