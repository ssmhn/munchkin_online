import { describe, it, expect } from 'vitest';
import { applyAction, InvalidActionError } from '../src/index';
import { createGameState, createPlayer } from './test-helpers';

describe('applyAction', () => {
  it('KICK_DOOR in KICK_DOOR phase transitions to LOOT_ROOM', () => {
    const state = createGameState({ phase: 'KICK_DOOR' });
    const { state: next, events } = applyAction(state, { type: 'KICK_DOOR' }, 'p1');

    expect(next.phase).toBe('LOOT_ROOM');
    expect(events.some(e => e.type === 'DOOR_KICKED')).toBe(true);
  });

  it('KICK_DOOR in COMBAT phase throws InvalidActionError', () => {
    const state = createGameState({
      phase: 'COMBAT',
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

    expect(() => applyAction(state, { type: 'KICK_DOOR' }, 'p1')).toThrow(InvalidActionError);
  });

  it('END_TURN from LOOT_ROOM transitions to next players KICK_DOOR', () => {
    const state = createGameState({ phase: 'LOOT_ROOM' });
    const { state: next } = applyAction(state, { type: 'END_TURN' }, 'p1');

    expect(next.phase).toBe('KICK_DOOR');
    expect(next.activePlayerId).toBe('p2');
    expect(next.turn).toBe(2);
  });

  it('END_TURN transitions to CHARITY when hand > 5', () => {
    const state = createGameState({
      phase: 'LOOT_ROOM',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });
    const { state: next } = applyAction(state, { type: 'END_TURN' }, 'p1');

    expect(next.phase).toBe('CHARITY');
  });

  it('END_TURN from CHARITY blocked when hand > 5', () => {
    const state = createGameState({
      phase: 'CHARITY',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    expect(() => applyAction(state, { type: 'END_TURN' }, 'p1')).toThrow('Must reduce hand to 5 cards');
  });

  it('throws for unknown action type', () => {
    const state = createGameState();
    expect(() =>
      applyAction(state, { type: 'NONEXISTENT' } as any, 'p1')
    ).toThrow(InvalidActionError);
  });

  it('throws when non-active player tries to act', () => {
    const state = createGameState({ phase: 'KICK_DOOR', activePlayerId: 'p1' });
    expect(() => applyAction(state, { type: 'KICK_DOOR' }, 'p2')).toThrow('It is not your turn');
  });

  it('throws for actions during END_GAME', () => {
    const state = createGameState({ phase: 'END_GAME' });
    expect(() => applyAction(state, { type: 'KICK_DOOR' }, 'p1')).toThrow('Game is over');
  });

  it('throws for actions during WAITING', () => {
    const state = createGameState({ phase: 'WAITING' });
    expect(() => applyAction(state, { type: 'KICK_DOOR' }, 'p1')).toThrow('Game has not started');
  });

  it('does not mutate original state', () => {
    const state = createGameState({ phase: 'KICK_DOOR' });
    const originalPhase = state.phase;
    const originalDeckLen = state.doorDeck.length;

    applyAction(state, { type: 'KICK_DOOR' }, 'p1');

    expect(state.phase).toBe(originalPhase);
    expect(state.doorDeck.length).toBe(originalDeckLen);
  });

  it('RUN_AWAY validates diceRoll range', () => {
    const state = createGameState({
      phase: 'COMBAT',
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

    expect(() =>
      applyAction(state, { type: 'RUN_AWAY', diceRoll: 7 }, 'p1')
    ).toThrow('diceRoll must be between 1 and 6');

    expect(() =>
      applyAction(state, { type: 'RUN_AWAY', diceRoll: 0 }, 'p1')
    ).toThrow('diceRoll must be between 1 and 6');
  });
});
