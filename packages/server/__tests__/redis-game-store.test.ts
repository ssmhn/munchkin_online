import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { RedisGameStore } from '../src/store/redis-game-store';
import type { GameState } from '@munchkin/shared';

function createMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    phase: 'WAITING',
    turn: 1,
    activePlayerId: 'p1',
    playerOrder: ['p1'],
    players: {},
    doorDeck: [],
    treasureDeck: [],
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [],
    winner: null,
    ...overrides,
  };
}

describe('RedisGameStore', () => {
  let redis: Redis;
  let store: RedisGameStore;

  beforeAll(() => {
    redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
    store = new RedisGameStore(redis);
    return redis.connect();
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.del('game:test-1');
  });

  it('setState + getState returns the same state', async () => {
    const state = createMinimalState({ id: 'test-1' });
    await store.setState('test-1', state, 1);

    const stored = await store.getState('test-1');
    expect(stored).not.toBeNull();
    expect(stored!.version).toBe(1);
    expect(stored!.state.id).toBe('test-1');
    expect(stored!.state.phase).toBe('WAITING');
  });

  it('getState returns null for non-existent game', async () => {
    const stored = await store.getState('nonexistent');
    expect(stored).toBeNull();
  });

  it('compareAndSet succeeds with correct version', async () => {
    const state = createMinimalState({ id: 'test-1' });
    await store.setState('test-1', state, 1);

    const newState = createMinimalState({ id: 'test-1', phase: 'KICK_DOOR' });
    const success = await store.compareAndSet('test-1', 1, newState);
    expect(success).toBe(true);

    const stored = await store.getState('test-1');
    expect(stored!.version).toBe(2);
    expect(stored!.state.phase).toBe('KICK_DOOR');
  });

  it('compareAndSet fails with wrong version', async () => {
    const state = createMinimalState({ id: 'test-1' });
    await store.setState('test-1', state, 1);

    const newState = createMinimalState({ id: 'test-1', phase: 'KICK_DOOR' });
    const success = await store.compareAndSet('test-1', 99, newState);
    expect(success).toBe(false);

    // State unchanged
    const stored = await store.getState('test-1');
    expect(stored!.version).toBe(1);
    expect(stored!.state.phase).toBe('WAITING');
  });
});
