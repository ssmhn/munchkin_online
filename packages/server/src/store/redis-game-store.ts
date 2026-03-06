import Redis from 'ioredis';
import type { GameState } from '@munchkin/shared';

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

const CAS_SCRIPT = `
local key = KEYS[1]
local expectedVersion = ARGV[1]
local newValue = ARGV[2]
local newVersion = ARGV[3]
local ttl = tonumber(ARGV[4])

local current = redis.call('GET', key)
if current == false then
  return 0
end

local parsed = cjson.decode(current)
if tostring(parsed.version) ~= expectedVersion then
  return 0
end

redis.call('SET', key, newValue, 'EX', ttl)
return 1
`;

export interface StoredGameState {
  version: number;
  state: GameState;
}

export class RedisGameStore {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async getState(gameId: string): Promise<StoredGameState | null> {
    const raw = await this.redis.get(`game:${gameId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGameState;
  }

  async setState(gameId: string, state: GameState, version: number = 1): Promise<void> {
    const stored: StoredGameState = { version, state };
    await this.redis.set(`game:${gameId}`, JSON.stringify(stored), 'EX', TTL_SECONDS);
  }

  async compareAndSet(
    gameId: string,
    expectedVersion: number,
    newState: GameState
  ): Promise<boolean> {
    const newVersion = expectedVersion + 1;
    const stored: StoredGameState = { version: newVersion, state: newState };
    const result = await this.redis.eval(
      CAS_SCRIPT,
      1,
      `game:${gameId}`,
      String(expectedVersion),
      JSON.stringify(stored),
      String(newVersion),
      String(TTL_SECONDS)
    );
    return result === 1;
  }

  async deleteState(gameId: string): Promise<void> {
    await this.redis.del(`game:${gameId}`);
  }
}
