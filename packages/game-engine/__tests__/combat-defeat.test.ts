import { describe, it, expect } from 'vitest';
import { handleRunAwayFull } from '../src/combat-defeat';
import { createGameState, createPlayer, createDefaultEquipped } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    monster_big_rat: {
      id: 'monster_big_rat', name: 'Big Rat', deck: 'DOOR', type: 'MONSTER',
      description: 'Lvl 1', baseLevel: 1, treasures: 1, tags: [],
      badStuff: {
        description: 'Lose 1 level',
        effects: [{ type: 'MODIFY_LEVEL', value: -1, target: 'ACTIVE_PLAYER' }],
      },
      effects: [],
    },
    monster_plutonium_dragon: {
      id: 'monster_plutonium_dragon', name: 'Plutonium Dragon', deck: 'DOOR', type: 'MONSTER',
      description: 'Lvl 20', baseLevel: 20, treasures: 5, tags: ['DRAGON'],
      badStuff: {
        description: 'Die',
        effects: [
          { type: 'REMOVE_EQUIPMENT', slot: 'ALL', target: 'ACTIVE_PLAYER' },
          { type: 'DISCARD_HAND', count: 'ALL', target: 'ACTIVE_PLAYER' },
          { type: 'SET_LEVEL', value: 1, target: 'ACTIVE_PLAYER' },
        ],
      },
      effects: [],
    },
    race_halfling: {
      id: 'race_halfling', name: 'Halfling', deck: 'DOOR', type: 'RACE',
      description: '+1 escape', playableFrom: ['ANYTIME'],
      effects: [{ type: 'ESCAPE_BONUS', value: 1 }],
      triggers: [],
    },
  };
}

describe('Run Away / Bad Stuff', () => {
  const cardDb = buildCardDb();

  it('diceRoll=2 vs Rat → fail → lose 1 level', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 5 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RUN_ATTEMPT',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    const [next, events] = handleRunAwayFull(state, 'p1', 2, cardDb);

    expect(next.players['p1'].level).toBe(4);
    expect(events.some(e => e.type === 'RUN_ATTEMPTED' && !e.success)).toBe(true);
    expect(events.some(e => e.type === 'BAD_STUFF_APPLIED')).toBe(true);
    expect(next.combat).toBeNull();
  });

  it('diceRoll=5 → successful escape → combat cleared', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 5 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RUN_ATTEMPT',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    const [next, events] = handleRunAwayFull(state, 'p1', 5, cardDb);

    expect(next.players['p1'].level).toBe(5); // No level loss
    expect(events.some(e => e.type === 'RUN_ATTEMPTED' && e.success)).toBe(true);
    expect(next.combat).toBeNull();
    expect(next.phase).toBe('END_TURN');
  });

  it('diceRoll=1 vs Dragon → death: level=1, no equipment, no hand', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 5,
          hand: ['card_a', 'card_b'],
          equipped: {
            head: 'helmet_1',
            body: 'armor_1',
            feet: null,
            leftHand: null,
            rightHand: 'sword_1',
            twoHands: null,
            extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RUN_ATTEMPT',
        monsters: [{ cardId: 'monster_plutonium_dragon', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    const [next, events] = handleRunAwayFull(state, 'p1', 1, cardDb);

    expect(next.players['p1'].level).toBe(1);
    expect(next.players['p1'].equipped.head).toBeNull();
    expect(next.players['p1'].equipped.body).toBeNull();
    expect(next.players['p1'].equipped.rightHand).toBeNull();
    expect(next.players['p1'].hand).toHaveLength(0);
    expect(next.discardTreasure).toContain('helmet_1');
    expect(next.discardTreasure).toContain('armor_1');
    expect(next.discardTreasure).toContain('sword_1');
  });

  it('Halfling gets +1 escape bonus', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 5, race: 'HALFLING' }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RUN_ATTEMPT',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    // diceRoll 4 + 1 (halfling bonus) = 5 >= 5 → success
    const [next, events] = handleRunAwayFull(state, 'p1', 4, cardDb);

    expect(events.some(e => e.type === 'RUN_ATTEMPTED' && e.success)).toBe(true);
    expect(next.players['p1'].level).toBe(5); // No level loss
  });
});
