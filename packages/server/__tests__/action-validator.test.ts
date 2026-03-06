import { describe, it, expect } from 'vitest';
import { validateActionServer, ValidationError } from '../src/game/action-validator';
import type { GameState } from '@munchkin/shared';

function makeState(overrides?: Partial<GameState>): GameState {
  return {
    players: {
      p1: {
        id: 'p1',
        name: 'Alice',
        level: 1,
        hand: ['card-a', 'card-b'],
        carried: ['card-c'],
        equipped: { rightHand: 'sword-1', leftHand: null, head: null, body: null, feet: null },
        race: null,
        class: null,
        gender: 'male',
        curses: [],
        connected: true,
        isAI: false,
      },
      p2: {
        id: 'p2',
        name: 'Bob',
        level: 1,
        hand: ['card-d'],
        carried: [],
        equipped: { rightHand: null, leftHand: null, head: null, body: null, feet: null },
        race: null,
        class: null,
        gender: 'female',
        curses: [],
        connected: true,
        isAI: false,
      },
    },
    activePlayerId: 'p1',
    phase: 'COMBAT',
    turn: 1,
    combat: {
      monsters: [{ instanceId: 'inst-1', cardId: 'orc', modifiers: [] }],
      activePlayerId: 'p1',
      helpers: [],
      appliedCards: [],
      reactionWindow: null,
      runAttempts: 0,
      helpOffer: null,
    },
    doorDeck: [],
    treasureDeck: [],
    discardDoor: [],
    discardTreasure: [],
    log: [],
    winLevel: 10,
    pendingAction: null,
    ...overrides,
  };
}

describe('validateActionServer', () => {
  it('rejects PLAY_CARD when card not owned by player', () => {
    const state = makeState();
    expect(() =>
      validateActionServer(state, { type: 'PLAY_CARD', cardId: 'unknown-card' }, 'p1')
    ).toThrow(ValidationError);
    expect(() =>
      validateActionServer(state, { type: 'PLAY_CARD', cardId: 'unknown-card' }, 'p1')
    ).toThrow('You do not own this card');
  });

  it('accepts PLAY_CARD when card is in hand, carried, or equipped', () => {
    const state = makeState();
    // hand
    expect(() => validateActionServer(state, { type: 'PLAY_CARD', cardId: 'card-a' }, 'p1')).not.toThrow();
    // carried
    expect(() => validateActionServer(state, { type: 'PLAY_CARD', cardId: 'card-c' }, 'p1')).not.toThrow();
    // equipped
    expect(() => validateActionServer(state, { type: 'PLAY_CARD', cardId: 'sword-1' }, 'p1')).not.toThrow();
  });

  it('playerId always comes from JWT — ignores any payload playerId', () => {
    const state = makeState();
    // p2 tries to play p1's card
    expect(() =>
      validateActionServer(state, { type: 'PLAY_CARD', cardId: 'card-a' }, 'p2')
    ).toThrow('You do not own this card');
  });

  it('rejects diceRoll outside 1-6 range', () => {
    const state = makeState();
    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 7 }, 'p1')
    ).toThrow('diceRoll must be an integer between 1 and 6');

    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 0 }, 'p1')
    ).toThrow('diceRoll must be an integer between 1 and 6');

    expect(() =>
      validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 3.5 }, 'p1')
    ).toThrow('diceRoll must be an integer between 1 and 6');
  });

  it('accepts valid diceRoll in 1-6', () => {
    const state = makeState();
    expect(() => validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 1 }, 'p1')).not.toThrow();
    expect(() => validateActionServer(state, { type: 'RUN_AWAY', diceRoll: 6 }, 'p1')).not.toThrow();
  });

  it('rejects OFFER_HELP with cards that player does not own', () => {
    const state = makeState();
    expect(() =>
      validateActionServer(
        state,
        { type: 'OFFER_HELP', targetPlayerId: 'p2', rewardCardIds: ['card-d'] },
        'p1'
      )
    ).toThrow("Cannot offer card card-d that you don't own");
  });

  it('rejects OFFER_HELP with nonexistent target player', () => {
    const state = makeState();
    expect(() =>
      validateActionServer(
        state,
        { type: 'OFFER_HELP', targetPlayerId: 'p99', rewardCardIds: [] },
        'p1'
      )
    ).toThrow('Target player not found');
  });

  it('rejects SELL_ITEMS with cards player does not own', () => {
    const state = makeState({ phase: 'KICK_DOOR' });
    expect(() =>
      validateActionServer(state, { type: 'SELL_ITEMS', cardIds: ['card-a', 'stolen-card'] }, 'p1')
    ).toThrow('You do not own card stolen-card');
  });

  it('accepts SELL_ITEMS with owned hand + carried cards', () => {
    const state = makeState({ phase: 'KICK_DOOR' });
    expect(() =>
      validateActionServer(state, { type: 'SELL_ITEMS', cardIds: ['card-a', 'card-c'] }, 'p1')
    ).not.toThrow();
  });

  it('rejects unknown player', () => {
    const state = makeState();
    expect(() =>
      validateActionServer(state, { type: 'KICK_DOOR' }, 'unknown-player')
    ).toThrow('Player not found in game');
  });
});
