import { describe, it, expect, vi } from 'vitest';
import { handleReconnect, handleDisconnect, applyDisconnectedTimeout } from '../src/game/reconnect';
import type { GameState, PlayerState, EquippedItems } from '@munchkin/shared';
import type { WsClient } from '../src/ws/ws-client';

function createEquipped(): EquippedItems {
  return { head: null, body: null, feet: null, hand: null, twoHands: null, extras: [] };
}

function createPlayer(id: string, connected = true): PlayerState {
  return {
    id, name: id, level: 1, gender: 'MALE', race: null, classes: [],
    hand: [], equipped: createEquipped(), carried: [], curses: [], isConnected: connected,
  };
}

function createState(): GameState {
  return {
    id: 'game-1', phase: 'KICK_DOOR', turn: 1, activePlayerId: 'p1',
    playerOrder: ['p1', 'p2'],
    players: {
      p1: createPlayer('p1'),
      p2: createPlayer('p2'),
    },
    doorDeck: [], treasureDeck: [],
    discardDoor: [], discardTreasure: [],
    combat: null, pendingActions: [], log: [], winner: null,
  };
}

function mockClient(playerId: string): WsClient {
  return {
    playerId,
    roomId: 'room-1',
    send: vi.fn(),
    isAlive: true,
    ping: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  } as any;
}

describe('Reconnect', () => {
  it('reconnected player receives FULL_SYNC', () => {
    const state = createState();
    state.players['p1'].isConnected = false;

    const client = mockClient('p1');
    const clients = new Map<string, WsClient>();
    clients.set('p2', mockClient('p2'));

    handleReconnect(client, state, {}, clients);

    expect(state.players['p1'].isConnected).toBe(true);
    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FULL_SYNC' })
    );
  });

  it('disconnect marks player offline and notifies others', () => {
    const state = createState();
    const p2Client = mockClient('p2');
    const clients = new Map<string, WsClient>();
    clients.set('p2', p2Client);

    handleDisconnect('p1', state, clients);

    expect(state.players['p1'].isConnected).toBe(false);
    expect(p2Client.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PLAYER_LEFT' })
    );
  });

  it('timeout removes pending actions for disconnected player', () => {
    const state = createState();
    state.pendingActions = [
      { type: 'CHOOSE_MONSTER_TO_CLONE', playerId: 'p1', timeoutMs: 30000, options: [] },
    ];

    const result = applyDisconnectedTimeout(state, 'p1');
    expect(result.pendingActions).toHaveLength(0);
  });
});
