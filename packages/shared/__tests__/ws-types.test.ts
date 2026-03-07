import { describe, it, expect } from 'vitest';
import type {
  GameAction,
  S2C_Message,
  C2S_Message,
  GameEvent,
  GameStateProjection,
} from '../src/types/ws';
import type { CardDb } from '../src/types/card';

describe('WS protocol types', () => {
  it('should cover all GameAction types via switch', () => {
    function handleAction(action: GameAction): string {
      switch (action.type) {
        case 'KICK_DOOR': return 'kick';
        case 'PLAY_CARD': return `play ${action.cardId}`;
        case 'EQUIP_ITEM': return `equip ${action.cardId}`;
        case 'OFFER_HELP': return `offer to ${action.targetPlayerId}`;
        case 'ACCEPT_HELP': return 'accept';
        case 'DECLINE_HELP': return 'decline';
        case 'COUNTER_OFFER': return 'counter';
        case 'RUN_AWAY': return `run ${action.diceRoll}`;
        case 'END_TURN': return 'end';
        case 'REACT_PASS': return 'pass';
        case 'SELL_ITEMS': return `sell ${action.cardIds.length}`;
        case 'CHOOSE_OPTION': return `choose ${action.optionId}`;
      }
    }

    expect(handleAction({ type: 'KICK_DOOR' })).toBe('kick');
    expect(handleAction({ type: 'PLAY_CARD', cardId: 'c1' })).toBe('play c1');
    expect(handleAction({ type: 'RUN_AWAY', diceRoll: 5 })).toBe('run 5');
    expect(handleAction({ type: 'SELL_ITEMS', cardIds: ['a', 'b'] })).toBe('sell 2');
  });

  it('should accept a valid FULL_SYNC S2C message', () => {
    const gameState: GameStateProjection = {
      id: 'g1',
      phase: 'WAITING',
      turn: 0,
      activePlayerId: 'p1',
      playerOrder: ['p1'],
      players: {
        p1: {
          id: 'p1',
          name: 'Test',
          level: 1,
          gender: 'MALE',
          race: null,
          classes: [],
          hand: [],
          equipped: { head: null, body: null, feet: null, hand1: null, hand2: null, twoHands: null, extras: [] },
          carried: [],
          curses: [],
          isConnected: true,
        },
      },
      doorDeck: [],
      treasureDeck: [],
      discardDoor: [],
      discardTreasure: [],
      combat: null,
      pendingActions: [],
      log: [],
      winner: null,
    };

    const cardDb: CardDb = {};

    const msg: S2C_Message = {
      type: 'FULL_SYNC',
      payload: { gameState, cardDb },
    };

    expect(msg.type).toBe('FULL_SYNC');
  });

  it('should accept C2S GAME_ACTION message', () => {
    const msg: C2S_Message = {
      type: 'GAME_ACTION',
      payload: { type: 'KICK_DOOR' },
    };

    expect(msg.type).toBe('GAME_ACTION');
  });

  it('should accept all S2C message types', () => {
    const messages: S2C_Message[] = [
      { type: 'FULL_SYNC', payload: { gameState: {} as GameStateProjection, cardDb: {} } },
      { type: 'STATE_PATCH', payload: { patch: [], events: [] } },
      { type: 'ACTION_REQUIRED', payload: { type: 'CHOOSE_MONSTER_TO_CLONE', playerId: 'p1', timeoutMs: 30000, options: [] } },
      { type: 'REACTION_WINDOW_OPEN', payload: { trigger: { type: 'DOOR_OPENED', cardId: 'c1' }, timeoutMs: 15000, responses: {}, stack: [] } },
      { type: 'REACTION_WINDOW_CLOSE' },
      { type: 'GAME_EVENT', payload: { type: 'DOOR_KICKED', playerId: 'p1', cardId: 'c1' } },
      { type: 'PLAYER_JOINED', payload: { playerId: 'p1', name: 'Test' } },
      { type: 'PLAYER_LEFT', payload: { playerId: 'p1' } },
      { type: 'PLAYER_RECONNECTED', payload: { playerId: 'p1' } },
      { type: 'ERROR', payload: { code: 'INVALID_ACTION', message: 'test' } },
      { type: 'GAME_OVER', payload: { winnerId: 'p1' } },
      { type: 'PONG' },
    ];

    expect(messages).toHaveLength(12);
  });
});
