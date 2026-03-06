import { describe, it, expect } from 'vitest';
import { handleDoppelganger, handleChooseMonsterToClone } from '../src/doppelganger';
import { createGameState, createPlayer } from './test-helpers';

describe('Doppelganger', () => {
  it('auto-clones when one monster in combat', () => {
    const state = createGameState({
      phase: 'COMBAT',
      combat: {
        phase: 'ACTIVE',
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
    });

    const [next, events] = handleDoppelganger(state, 'p2');

    expect(next.combat!.monsters).toHaveLength(2);
    expect(next.combat!.monsters[1].cardId).toBe('monster_orc');
    expect(next.combat!.monsters[1].instanceId).not.toBe('inst-1');
    expect(events.some(e => e.type === 'MONSTER_CLONED')).toBe(true);
    expect(next.pendingActions).toHaveLength(0);
  });

  it('creates pending action when multiple monsters', () => {
    const state = createGameState({
      phase: 'COMBAT',
      combat: {
        phase: 'ACTIVE',
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
    });

    const [next, events] = handleDoppelganger(state, 'p2');

    // No clone yet — pending action created
    expect(next.combat!.monsters).toHaveLength(2);
    expect(next.pendingActions).toHaveLength(1);
    expect(next.pendingActions[0].type).toBe('CHOOSE_MONSTER_TO_CLONE');
    expect(next.pendingActions[0].options).toHaveLength(2);
    expect(events).toHaveLength(0); // No clone event yet
  });

  it('CHOOSE_OPTION clones the chosen monster', () => {
    const state = createGameState({
      phase: 'COMBAT',
      combat: {
        phase: 'ACTIVE',
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
      pendingActions: [{
        type: 'CHOOSE_MONSTER_TO_CLONE',
        playerId: 'p2',
        timeoutMs: 30000,
        options: [
          { id: 'inst-1', label: 'monster_orc', cardId: 'monster_orc' },
          { id: 'inst-2', label: 'monster_big_rat', cardId: 'monster_big_rat' },
        ],
      }],
    });

    const [next, events] = handleChooseMonsterToClone(state, 'inst-1');

    expect(next.combat!.monsters).toHaveLength(3);
    expect(next.combat!.monsters[2].cardId).toBe('monster_orc');
    expect(next.pendingActions).toHaveLength(0);
    expect(events.some(e => e.type === 'MONSTER_CLONED')).toBe(true);
  });

  it('clone inherits modifiers from original', () => {
    const state = createGameState({
      phase: 'COMBAT',
      combat: {
        phase: 'ACTIVE',
        monsters: [
          {
            cardId: 'monster_orc',
            modifiers: [{ cardId: 'modifier_enraged', value: 5 }],
            instanceId: 'inst-1',
          },
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

    const [next] = handleDoppelganger(state, 'p2');

    const clone = next.combat!.monsters[1];
    expect(clone.modifiers).toHaveLength(1);
    expect(clone.modifiers[0].cardId).toBe('modifier_enraged');
    expect(clone.modifiers[0].value).toBe(5);

    // Modifiers are independent copies
    clone.modifiers[0].value = 999;
    expect(next.combat!.monsters[0].modifiers[0].value).toBe(5);
  });
});
