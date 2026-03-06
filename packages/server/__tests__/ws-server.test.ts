import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { createServer } from '../src/ws/server';

const JWT_SECRET = 'test-secret-key';
const PORT = 9876;

function makeToken(payload: { playerId: string; roomId: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

function connectWs(path: string, token?: string): Promise<WebSocket> {
  const url = token
    ? `ws://127.0.0.1:${PORT}${path}?token=${token}`
    : `ws://127.0.0.1:${PORT}${path}`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    ws.once('message', (data: Buffer) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.on('close', (code: number, reason: Buffer) => {
      resolve({ code, reason: reason.toString() });
    });
  });
}

describe('WebSocket Server', () => {
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    server = createServer({ port: PORT, jwtSecret: JWT_SECRET });
    await server.app.listen({ port: PORT, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await server.app.close();
  });

  it('rejects connection without JWT', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/game/room1`);
    const { code } = await waitForClose(ws);
    expect(code).toBe(4001);
  });

  it('accepts connection with valid JWT', async () => {
    const token = makeToken({ playerId: 'p1', roomId: 'room1' });
    const ws = await connectWs('/game/room1', token);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('sends ERROR for invalid JSON, keeps connection alive', async () => {
    const token = makeToken({ playerId: 'p1', roomId: 'room1' });
    const ws = await connectWs('/game/room1', token);

    ws.send('not valid json {{{');
    const msg = await waitForMessage(ws);

    expect(msg.type).toBe('ERROR');
    expect(msg.payload.code).toBe('INVALID_JSON');
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('responds to PING with PONG', async () => {
    const token = makeToken({ playerId: 'p1', roomId: 'room1' });
    const ws = await connectWs('/game/room1', token);

    ws.send(JSON.stringify({ type: 'PING' }));
    const msg = await waitForMessage(ws);

    expect(msg.type).toBe('PONG');
    ws.close();
  });
});
