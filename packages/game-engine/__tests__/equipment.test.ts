import { describe, it, expect } from 'vitest';
import { handleEquipItemFull, InvalidActionError } from '../src/index';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    sword_of_slaying: {
      id: 'sword_of_slaying', name: 'Sword', deck: 'TREASURE', type: 'EQUIPMENT',
      description: '+3', slots: ['hand'], value: 300,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    },
    shield: {
      id: 'shield', name: 'Shield', deck: 'TREASURE', type: 'EQUIPMENT',
      description: '+2', slots: ['hand'], value: 400,
      effects: [{ type: 'COMBAT_BONUS', value: 2, target: 'SELF' }],
    },
    two_handed_sword: {
      id: 'two_handed_sword', name: 'Two-Handed Sword', deck: 'TREASURE', type: 'EQUIPMENT',
      description: '+4', slots: ['twoHands'], value: 600, isBig: true,
      effects: [{ type: 'COMBAT_BONUS', value: 4, target: 'SELF' }],
    },
    big_armor: {
      id: 'big_armor', name: 'Big Armor', deck: 'TREASURE', type: 'EQUIPMENT',
      description: '+3', slots: ['body'], value: 600, isBig: true,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    },
    small_helmet: {
      id: 'small_helmet', name: 'Small Helmet', deck: 'TREASURE', type: 'EQUIPMENT',
      description: '+1', slots: ['head'], value: 200,
      effects: [{ type: 'COMBAT_BONUS', value: 1, target: 'SELF' }],
    },
    class_warrior: {
      id: 'class_warrior', name: 'Warrior', deck: 'DOOR', type: 'CLASS',
      description: 'Ignore weapon restrictions',
      effects: [{ type: 'APPLY_STATUS', status: 'IGNORE_WEAPON_RESTRICTIONS', target: 'SELF' }],
    },
    race_dwarf: {
      id: 'race_dwarf', name: 'Dwarf', deck: 'DOOR', type: 'RACE',
      description: 'Extra big item',
      effects: [{ type: 'APPLY_STATUS', status: 'EXTRA_BIG_ITEM', target: 'SELF' }],
    },
  };
}

describe('Equipment system', () => {
  const cardDb = buildCardDb();

  it('equip hand item from hand → slot filled, hand shrinks', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', hand: ['sword_of_slaying'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next, events] = handleEquipItemFull(state, 'p1', 'sword_of_slaying', cardDb);

    expect(next.players['p1'].equipped.hand1).toBe('sword_of_slaying');
    expect(next.players['p1'].hand).not.toContain('sword_of_slaying');
    expect(events.some(e => e.type === 'ITEM_EQUIPPED')).toBe(true);
  });

  it('cannot equip two items in same slot', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({
          id: 'p1',
          hand: ['sword_of_slaying'],
          equipped: {
            head: null, body: null, feet: null,
            hand1: 'other_sword', hand2: 'shield_2', twoHands: null, extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    expect(() => handleEquipItemFull(state, 'p1', 'sword_of_slaying', cardDb))
      .toThrow(InvalidActionError);
  });

  it('two-handed weapon blocks both hand slots', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', hand: ['shield', 'two_handed_sword'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    // Equip two-handed first
    const [s1] = handleEquipItemFull(state, 'p1', 'two_handed_sword', cardDb);
    expect(s1.players['p1'].equipped.twoHands).toBe('two_handed_sword');

    // Now try shield → should fail
    expect(() => handleEquipItemFull(s1, 'p1', 'shield', cardDb))
      .toThrow(InvalidActionError);
  });

  it('cannot carry more than 1 Big item normally', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({
          id: 'p1',
          hand: ['big_armor'],
          equipped: {
            head: null, body: null, feet: null,
            hand1: null, hand2: null, twoHands: 'two_handed_sword', extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    expect(() => handleEquipItemFull(state, 'p1', 'big_armor', cardDb))
      .toThrow('Cannot carry more Big items');
  });

  it('Dwarf can equip second Big item', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({
          id: 'p1',
          race: 'DWARF',
          hand: ['big_armor'],
          equipped: {
            head: null, body: null, feet: null,
            hand1: null, hand2: null, twoHands: 'two_handed_sword', extras: [],
          },
        }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next] = handleEquipItemFull(state, 'p1', 'big_armor', cardDb);
    expect(next.players['p1'].equipped.body).toBe('big_armor');
  });
});
