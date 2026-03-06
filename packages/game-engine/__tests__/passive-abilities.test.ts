import { describe, it, expect } from 'vitest';
import { resolveCombatVictory } from '../src/combat-resolution';
import { handleRunAwayFull } from '../src/combat-defeat';
import { handleEquipItemFull } from '../src/equipment';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    monster_big_rat: {
      id: 'monster_big_rat', name: 'Big Rat', deck: 'DOOR', type: 'MONSTER',
      description: 'A big rat', level: 1, treasures: 1, badStuff: [],
      effects: [{ type: 'COMBAT_BONUS', value: 1, target: 'SELF' }],
    },
    race_elf: {
      id: 'race_elf', name: 'Elf', deck: 'DOOR', type: 'RACE',
      description: 'Elf race',
      effects: [],
      triggers: [
        { event: 'ON_HELPER_VICTORY', effects: [{ type: 'MODIFY_LEVEL', value: 1, target: 'SELF' }] },
      ],
    },
    race_halfling: {
      id: 'race_halfling', name: 'Halfling', deck: 'DOOR', type: 'RACE',
      description: 'Halfling race',
      effects: [{ type: 'ESCAPE_BONUS', value: 1 }],
    },
    race_dwarf: {
      id: 'race_dwarf', name: 'Dwarf', deck: 'DOOR', type: 'RACE',
      description: 'Dwarf race',
      effects: [{ type: 'APPLY_STATUS', status: 'EXTRA_BIG_ITEM' }],
    },
    big_item_1: {
      id: 'big_item_1', name: 'Big Item 1', deck: 'TREASURE', type: 'EQUIPMENT',
      description: 'A big item', slots: ['body'], isBig: true, value: 400,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    },
    big_item_2: {
      id: 'big_item_2', name: 'Big Item 2', deck: 'TREASURE', type: 'EQUIPMENT',
      description: 'Another big item', slots: ['head'], isBig: true, value: 400,
      effects: [{ type: 'COMBAT_BONUS', value: 2, target: 'SELF' }],
    },
  };
}

describe('Passive Race/Class Abilities', () => {
  const cardDb = buildCardDb();

  it('Elf gets +1 level when helping to victory (ON_HELPER_VICTORY)', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 3 }),
        p2: createPlayer({ id: 'p2', level: 2, race: 'ELF' }),
      },
      combat: {
        phase: 'RESOLVING',
        monsters: [{ cardId: 'monster_big_rat', modifiers: [], instanceId: 'inst-1' }],
        activePlayerId: 'p1',
        helpers: [{ playerId: 'p2', agreedReward: [] }],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
      treasureDeck: ['t1'],
    });

    const [next, events] = resolveCombatVictory(state, cardDb);
    expect(next.players['p2'].level).toBe(3); // 2 + 1 from trigger
    expect(events.some(e => e.type === 'LEVEL_CHANGED' && e.playerId === 'p2')).toBe(true);
  });

  it('Halfling gets escape bonus (+1 to dice roll)', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', level: 1, race: 'HALFLING' }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: {
        phase: 'RUN_ATTEMPT',
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

    // Dice roll 4 + Halfling bonus 1 = 5 → success
    const [next, events] = handleRunAwayFull(state, 'p1', 4, cardDb);
    expect(events.some(e => e.type === 'RUN_ATTEMPTED' && e.success === true)).toBe(true);
  });

  it('Dwarf can equip second Big item (EXTRA_BIG_ITEM)', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({
          id: 'p1',
          race: 'DWARF',
          equipped: {
            head: null, body: 'big_item_1', feet: null,
            leftHand: null, rightHand: null, twoHands: null,
            extras: [],
          },
          hand: ['big_item_2'],
        }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next] = handleEquipItemFull(state, 'p1', 'big_item_2', cardDb);
    expect(next.players['p1'].equipped.head).toBe('big_item_2');
  });
});
