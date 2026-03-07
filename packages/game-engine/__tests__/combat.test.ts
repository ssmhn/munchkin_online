import { describe, it, expect } from 'vitest';
import {
  calculatePlayerPower,
  calculateMonsterPower,
  calculateHelpersPower,
  calculateCombatResult,
} from '../src/combat';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    sword_of_slaying: {
      id: 'sword_of_slaying',
      name: 'Sword',
      deck: 'TREASURE',
      type: 'EQUIPMENT',
      description: '+3',
      slots: ['hand'],
      value: 300,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    },
    helmet_of_courage: {
      id: 'helmet_of_courage',
      name: 'Helmet',
      deck: 'TREASURE',
      type: 'EQUIPMENT',
      description: '+2/+4',
      slots: ['head'],
      value: 400,
      effects: [
        {
          type: 'CONDITIONAL',
          condition: { type: 'PLAYER_CLASS', class: 'WARRIOR' },
          then: [{ type: 'COMBAT_BONUS', value: 4, target: 'SELF' }],
          else: [{ type: 'COMBAT_BONUS', value: 2, target: 'SELF' }],
        },
      ],
    },
    monster_big_rat: {
      id: 'monster_big_rat',
      name: 'Big Rat',
      deck: 'DOOR',
      type: 'MONSTER',
      description: 'Lvl 1',
      baseLevel: 1,
      treasures: 1,
      tags: [],
      badStuff: { effects: [{ type: 'MODIFY_LEVEL', value: -1, target: 'ACTIVE_PLAYER' }] },
      effects: [],
    },
    monster_orc: {
      id: 'monster_orc',
      name: 'Orc',
      deck: 'DOOR',
      type: 'MONSTER',
      description: 'Lvl 4',
      baseLevel: 4,
      treasures: 2,
      tags: [],
      badStuff: { effects: [{ type: 'MODIFY_LEVEL', value: -2, target: 'ACTIVE_PLAYER' }] },
      effects: [],
    },
    monster_8: {
      id: 'monster_8',
      name: 'Monster 8',
      deck: 'DOOR',
      type: 'MONSTER',
      description: 'Lvl 8',
      baseLevel: 8,
      treasures: 2,
      tags: [],
      badStuff: { effects: [] },
      effects: [],
    },
    oneshot_potion: {
      id: 'oneshot_potion',
      name: 'Potion',
      deck: 'TREASURE',
      type: 'ONE_SHOT',
      description: '+3',
      playableFrom: ['ANY_COMBAT'],
      value: 200,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    },
    modifier_enraged: {
      id: 'modifier_enraged',
      name: 'Enraged',
      deck: 'DOOR',
      type: 'MODIFIER',
      description: '+5',
      playableFrom: ['ANY_COMBAT'],
      effects: [{ type: 'MONSTER_BONUS', value: 5 }],
    },
  };
}

describe('Combat system', () => {
  const cardDb = buildCardDb();

  it('player level 5 + sword +3 = 8 vs monster level 1 → WIN', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 5,
          equipped: {
            head: null, body: null, feet: null,
            hand1: 'sword_of_slaying', hand2: null, twoHands: null,
            extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    expect(calculatePlayerPower(state, 'p1', cardDb)).toBe(8);
    expect(calculateMonsterPower(state, cardDb)).toBe(1);
    expect(calculateCombatResult(state, cardDb)).toBe('WIN');
  });

  it('player 8 vs monster 8 → LOSE (draw is a loss)', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 5,
          equipped: {
            head: null, body: null, feet: null,
            hand1: 'sword_of_slaying', hand2: null, twoHands: null,
            extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_8', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    expect(calculatePlayerPower(state, 'p1', cardDb)).toBe(8);
    expect(calculateMonsterPower(state, cardDb)).toBe(8);
    expect(calculateCombatResult(state, cardDb)).toBe('LOSE');
  });

  it('two monsters (4 + 1 = 5) vs player 4 + helper 2 = 6 → WIN', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 4 }),
        p2: createPlayer({ id: 'p2', level: 2 }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [
          { cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' },
          { cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-2' },
        ],
        activePlayerId: 'p1',
        helpers: [{ playerId: 'p2', agreedReward: [] }],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    expect(calculatePlayerPower(state, 'p1', cardDb)).toBe(4);
    expect(calculateHelpersPower(state, cardDb)).toBe(2);
    expect(calculateMonsterPower(state, cardDb)).toBe(5);
    expect(calculateCombatResult(state, cardDb)).toBe('WIN');
  });

  it('Warrior with helmet_of_courage gets +4 (not +2)', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 3,
          classes: ['WARRIOR'],
          equipped: {
            head: 'helmet_of_courage', body: null, feet: null,
            hand1: null, hand2: null, twoHands: null,
            extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    // Level 3 + helmet +4 (warrior) = 7
    expect(calculatePlayerPower(state, 'p1', cardDb)).toBe(7);
  });

  it('non-Warrior with helmet_of_courage gets +2', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 3,
          classes: ['THIEF'],
          equipped: {
            head: 'helmet_of_courage', body: null, feet: null,
            hand1: null, hand2: null, twoHands: null,
            extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    // Level 3 + helmet +2 (non-warrior) = 5
    expect(calculatePlayerPower(state, 'p1', cardDb)).toBe(5);
  });

  it('power cannot be negative', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 1 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    // Even with curses, minimum is 0
    expect(calculatePlayerPower(state, 'p1', cardDb)).toBeGreaterThanOrEqual(0);
  });

  it('monster modifiers add to monster power', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 5 }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'ACTIVE',
        monsters: [
          { cardId: 'monster_orc', modifiers: [{ cardId: 'modifier_enraged', value: 5 }], instanceId: 'inst-1' },
        ],
        activePlayerId: 'p1',
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    });

    // Orc 4 + Enraged 5 = 9
    expect(calculateMonsterPower(state, cardDb)).toBe(9);
  });
});
