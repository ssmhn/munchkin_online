import { describe, it, expect } from 'vitest';
import { applyCurseCard, removeCurse } from '../src/curses';
import { calculatePlayerPower } from '../src/combat';
import { createGameState, createPlayer } from './test-helpers';
import type { CardDb } from '@munchkin/shared';

function buildCardDb(): CardDb {
  return {
    curse_lose_class: {
      id: 'curse_lose_class', name: 'Lose Class', deck: 'DOOR', type: 'CURSE',
      description: 'Lose your class',
      effects: [{ type: 'REMOVE_CLASS', target: 'ACTIVE_PLAYER' }],
    },
    curse_change_gender: {
      id: 'curse_change_gender', name: 'Change Gender', deck: 'DOOR', type: 'CURSE',
      description: 'Change gender',
      effects: [{ type: 'CHANGE_GENDER', target: 'ACTIVE_PLAYER' }],
    },
    curse_combat_minus2: {
      id: 'curse_combat_minus2', name: '-2 Combat', deck: 'DOOR', type: 'CURSE',
      description: '-2 to combat',
      effects: [{ type: 'APPLY_CURSE', curseId: 'curse_combat_minus2', target: 'ACTIVE_PLAYER' }],
    },
    curse_lose_level: {
      id: 'curse_lose_level', name: 'Lose Level', deck: 'DOOR', type: 'CURSE',
      description: 'Lose 1 level',
      effects: [{ type: 'MODIFY_LEVEL', value: -1, target: 'ACTIVE_PLAYER' }],
    },
    // Lasting curse card definition (for combat power calc)
    lasting_curse_minus2: {
      id: 'lasting_curse_minus2', name: 'Lasting -2', deck: 'DOOR', type: 'CURSE',
      description: '-2',
      effects: [{ type: 'COMBAT_BONUS', value: -2, target: 'SELF' }],
    },
  };
}

describe('Curses', () => {
  const cardDb = buildCardDb();

  it('curse_lose_class removes all classes', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', classes: ['WARRIOR', 'WIZARD'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next, events] = applyCurseCard(state, 'p1', 'curse_lose_class', cardDb);

    expect(next.players['p1'].classes).toEqual([]);
    expect(events.some(e => e.type === 'CURSE_APPLIED')).toBe(true);
  });

  it('curse_change_gender toggles gender', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1', gender: 'MALE' }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next] = applyCurseCard(state, 'p1', 'curse_change_gender', cardDb);
    expect(next.players['p1'].gender).toBe('FEMALE');
  });

  it('curse_combat_minus2 adds lasting curse to player.curses', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({ id: 'p1' }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const [next] = applyCurseCard(state, 'p1', 'curse_combat_minus2', cardDb);
    expect(next.players['p1'].curses).toHaveLength(1);
    expect(next.players['p1'].curses[0].curseId).toBe('curse_combat_minus2');
  });

  it('removeCurse clears the lasting curse and combat power returns to normal', () => {
    const state = createGameState({
      players: {
        p1: createPlayer({
          id: 'p1',
          level: 5,
          curses: [{ curseId: 'curse_combat_minus2', cardId: 'lasting_curse_minus2' }],
        }),
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

    // With curse: power should be reduced
    const powerWithCurse = calculatePlayerPower(state, 'p1', cardDb);
    expect(powerWithCurse).toBe(3); // 5 - 2

    // Remove curse
    const [next] = removeCurse(state, 'p1', 'curse_combat_minus2');
    expect(next.players['p1'].curses).toHaveLength(0);

    // Power should be back to normal
    const powerWithout = calculatePlayerPower(next, 'p1', cardDb);
    expect(powerWithout).toBe(5);
  });
});
