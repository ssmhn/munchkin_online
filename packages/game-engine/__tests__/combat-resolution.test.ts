import { describe, it, expect } from 'vitest';
import { resolveCombatVictory } from '../src/combat-resolution';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    monster_orc: {
      id: 'monster_orc', name: 'Orc', deck: 'DOOR', type: 'MONSTER',
      description: 'Lvl 4', baseLevel: 4, treasures: 2, tags: [],
      badStuff: { effects: [] }, effects: [],
    },
    monster_big_rat: {
      id: 'monster_big_rat', name: 'Big Rat', deck: 'DOOR', type: 'MONSTER',
      description: 'Lvl 1', baseLevel: 1, treasures: 3, tags: [],
      badStuff: { effects: [] }, effects: [],
    },
    race_elf: {
      id: 'race_elf', name: 'Elf', deck: 'DOOR', type: 'RACE',
      description: 'Helper victory = +1 level',
      playableFrom: ['ANYTIME'],
      effects: [],
      triggers: [
        {
          event: 'ON_HELPER_VICTORY',
          effects: [{ type: 'MODIFY_LEVEL', value: 1, target: 'SELF' }],
        },
      ],
    },
  };
}

describe('resolveCombatVictory', () => {
  const cardDb = buildCardDb();

  it('victory over 2 monsters gives +2 levels and 5 treasures', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 3 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RESOLVING',
        monsters: [
          { cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' },
          { cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-2' },
        ],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
      treasureDeck: ['t1', 't2', 't3', 't4', 't5', 't6'],
    });

    const [next, events] = resolveCombatVictory(state, cardDb);

    // +2 levels (one per monster)
    expect(next.players['p1'].level).toBe(5);

    // 2 + 3 = 5 treasures drawn
    expect(next.players['p1'].hand).toHaveLength(5);

    // Combat cleared
    expect(next.combat).toBeNull();

    // Events
    expect(events.some(e => e.type === 'COMBAT_WON')).toBe(true);
    expect(events.some(e => e.type === 'LEVEL_CHANGED')).toBe(true);
    expect(events.some(e => e.type === 'CARDS_DRAWN')).toBe(true);

    // Phase after combat
    expect(next.phase).toBe('AFTER_COMBAT');
  });

  it('Elf helper gets +1 level on victory', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 3, race: null }),
        p2: createPlayer({ id: 'p2', level: 2, race: 'ELF' }),
      },
      combat: {
        phase: 'RESOLVING',
        monsters: [
          { cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' },
        ],
        activePlayerId: 'p1',
        helpers: [{ playerId: 'p2', agreedReward: [] }],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
      treasureDeck: ['t1', 't2', 't3'],
    });

    const [next, events] = resolveCombatVictory(state, cardDb);

    // Elf helper gets +1 level from ON_HELPER_VICTORY trigger
    expect(next.players['p2'].level).toBe(3);

    // Active player gets +1 level from kill
    expect(next.players['p1'].level).toBe(4);
  });

  it('player at level 9 defeating monster reaches level 10 and wins', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 9 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RESOLVING',
        monsters: [
          { cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' },
        ],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
      treasureDeck: ['t1', 't2', 't3'],
    });

    const [next, events] = resolveCombatVictory(state, cardDb);

    expect(next.players['p1'].level).toBe(10);
    expect(next.winner).toBe('p1');
    expect(next.phase).toBe('END_GAME');
    expect(events.some(e => e.type === 'GAME_WON')).toBe(true);
  });

  it('monsters go to discard after combat', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 5 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RESOLVING',
        monsters: [
          { cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' },
        ],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
      treasureDeck: ['t1', 't2'],
      discardDoor: [],
    });

    const [next] = resolveCombatVictory(state, cardDb);
    expect(next.discardDoor).toContain('monster_orc');
  });
});
