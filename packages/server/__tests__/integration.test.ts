import { describe, it, expect } from 'vitest';
import { applyAction, InvalidActionError } from '@munchkin/game-engine';
import type { GameState, PlayerState, EquippedItems, GamePhase } from '@munchkin/shared';
import { validateActionServer } from '../src/game/action-validator';
import { projectStateForPlayer } from '../src/game/state-projector';

function createEquipped(): EquippedItems {
  return { head: null, body: null, feet: null, leftHand: null, rightHand: null, twoHands: null, extras: [] };
}

function createPlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: id,
    level: 1,
    gender: 'MALE',
    race: null,
    classes: [],
    hand: [],
    equipped: createEquipped(),
    carried: [],
    curses: [],
    isConnected: true,
    ...overrides,
  };
}

function setupTestGame(n: number): GameState {
  const playerIds = Array.from({ length: n }, (_, i) => `p${i + 1}`);
  const players: Record<string, PlayerState> = {};
  for (const id of playerIds) {
    players[id] = createPlayer(id, { hand: [`hand_${id}_1`, `hand_${id}_2`] });
  }
  return {
    id: 'test-game',
    phase: 'KICK_DOOR' as GamePhase,
    turn: 1,
    activePlayerId: playerIds[0],
    playerOrder: playerIds,
    players,
    doorDeck: ['door_1', 'door_2', 'door_3', 'door_4', 'door_5'],
    treasureDeck: ['treasure_1', 'treasure_2', 'treasure_3'],
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [],
    winner: null,
  };
}

describe('Integration: full game cycle', () => {
  it('setupTestGame creates n players with correct state', () => {
    const state = setupTestGame(3);
    expect(Object.keys(state.players)).toHaveLength(3);
    expect(state.playerOrder).toEqual(['p1', 'p2', 'p3']);
    expect(state.activePlayerId).toBe('p1');
    expect(state.phase).toBe('KICK_DOOR');
  });

  it('full cycle: kick door → loot room → end turn → next player', () => {
    let state = setupTestGame(2);

    // p1 kicks door
    let result = applyAction(state, { type: 'KICK_DOOR' }, 'p1');
    state = result.state;
    expect(state.phase).toBe('LOOT_ROOM');
    expect(state.players.p1.hand.length).toBe(3); // got 1 card

    // p1 ends turn (hand ≤ 5, no charity needed)
    result = applyAction(state, { type: 'END_TURN' }, 'p1');
    state = result.state;
    // After END_TURN auto-transition moves to next player
    expect(state.activePlayerId).toBe('p2');
    expect(state.phase).toBe('KICK_DOOR');
    expect(state.turn).toBe(2);

    // p2 kicks door
    result = applyAction(state, { type: 'KICK_DOOR' }, 'p2');
    state = result.state;
    expect(state.phase).toBe('LOOT_ROOM');
    expect(state.players.p2.hand.length).toBe(3);
  });

  it('validates actions: non-active player cannot kick door', () => {
    const state = setupTestGame(2);
    expect(() =>
      applyAction(state, { type: 'KICK_DOOR' }, 'p2')
    ).toThrow(InvalidActionError);
  });

  it('validates actions: cannot end turn during KICK_DOOR phase', () => {
    const state = setupTestGame(2);
    expect(() =>
      applyAction(state, { type: 'END_TURN' }, 'p1')
    ).toThrow(InvalidActionError);
  });

  it('server validation + engine integration: play card not in hand', () => {
    const state = setupTestGame(2);
    // Server-side validation catches it
    expect(() =>
      validateActionServer(state, { type: 'PLAY_CARD', cardId: 'not_owned' }, 'p1')
    ).toThrow('You do not own this card');
  });

  it('state projection hides other players hands', () => {
    const state = setupTestGame(2);
    const p1View = projectStateForPlayer(state, 'p1');
    const p2View = projectStateForPlayer(state, 'p2');

    // p1 sees own hand
    expect(p1View.players.p1.hand).toEqual(['hand_p1_1', 'hand_p1_2']);
    // p1 sees p2 hand as hidden
    expect(p1View.players.p2.hand).toEqual(['HIDDEN', 'HIDDEN']);

    // p2 sees own hand
    expect(p2View.players.p2.hand).toEqual(['hand_p2_1', 'hand_p2_2']);
    // p2 sees p1 hand as hidden
    expect(p2View.players.p1.hand).toEqual(['HIDDEN', 'HIDDEN']);
  });

  it('diceRoll validation: rejects invalid values through server validator', () => {
    const state = setupTestGame(2);
    // Need combat for RUN_AWAY
    state.phase = 'COMBAT';
    state.combat = {
      activePlayerId: 'p1',
      monsters: [{ instanceId: 'inst-1', cardId: 'orc', modifiers: [] }],
      helpers: [],
      appliedCards: [],
      reactionWindow: null,
      runAttempts: 0,
      helpOffer: null,
    };

    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 7 }, 'p1')
    ).toThrow('diceRoll must be an integer between 1 and 6');

    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 0 }, 'p1')
    ).toThrow('diceRoll must be an integer between 1 and 6');

    // Valid dice roll passes validation
    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 5 }, 'p1')
    ).not.toThrow();
  });

  it('reconnect: player disconnected state is reflected', () => {
    const state = setupTestGame(2);
    state.players.p2.isConnected = false;

    const p1View = projectStateForPlayer(state, 'p1');
    expect(p1View.players.p2.isConnected).toBe(false);
  });
});
