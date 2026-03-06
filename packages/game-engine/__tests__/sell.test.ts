import { describe, it, expect } from 'vitest';
import { handleSellItems } from '../src/sell';
import { InvalidActionError } from '../src/errors';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    item_500: {
      id: 'item_500', name: 'Small Item', deck: 'TREASURE', type: 'EQUIPMENT',
      description: 'Worth 500 gold', value: 500, effects: [],
    },
    item_1000: {
      id: 'item_1000', name: 'Medium Item', deck: 'TREASURE', type: 'EQUIPMENT',
      description: 'Worth 1000 gold', value: 1000, effects: [],
    },
    item_1500: {
      id: 'item_1500', name: 'Big Item', deck: 'TREASURE', type: 'EQUIPMENT',
      description: 'Worth 1500 gold', value: 1500, effects: [],
    },
  };
}

describe('Sell Items', () => {
  const cardDb = buildCardDb();

  it('sells items for 2500 gold → +2 levels', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', level: 3, hand: ['item_1000', 'item_1500'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next, events] = handleSellItems(state, 'p1', ['item_1000', 'item_1500'], cardDb);

    expect(next.players['p1'].level).toBe(5); // 3 + 2
    expect(next.players['p1'].hand).toEqual([]);
    expect(next.discardTreasure).toContain('item_1000');
    expect(next.discardTreasure).toContain('item_1500');
    expect(events.some(e => e.type === 'ITEMS_SOLD' && e.goldTotal === 2500 && e.levelsGained === 2)).toBe(true);
    expect(events.some(e => e.type === 'LEVEL_CHANGED')).toBe(true);
  });

  it('cannot sell to reach level 10', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', level: 9, hand: ['item_1000'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    expect(() => handleSellItems(state, 'p1', ['item_1000'], cardDb))
      .toThrow(InvalidActionError);
  });

  it('cannot sell during combat', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', hand: ['item_500'] }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    expect(() => handleSellItems(state, 'p1', ['item_500'], cardDb))
      .toThrow(InvalidActionError);
  });
});
