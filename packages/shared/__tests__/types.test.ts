import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerState,
  CombatState,
  EquippedItems,
  PendingAction,
  LogEntry,
} from '../src/types/state';

describe('GameState types', () => {
  it('should accept a valid GameState object', () => {
    const equipped: EquippedItems = {
      head: null,
      body: null,
      feet: null,
      leftHand: null,
      rightHand: null,
      twoHands: null,
      extras: [],
    };

    const player: PlayerState = {
      id: 'p1',
      name: 'Player 1',
      level: 1,
      gender: 'MALE',
      race: null,
      classes: [],
      hand: [],
      equipped,
      carried: [],
      curses: [],
      isConnected: true,
    };

    const state: GameState = {
      id: 'game-1',
      phase: 'KICK_DOOR',
      turn: 1,
      activePlayerId: 'p1',
      playerOrder: ['p1'],
      players: { p1: player },
      doorDeck: ['card1', 'card2'],
      treasureDeck: ['card3'],
      discardDoor: [],
      discardTreasure: [],
      combat: null,
      pendingActions: [],
      log: [],
      winner: null,
    };

    expect(state.id).toBe('game-1');
    expect(state.phase).toBe('KICK_DOOR');
    expect(state.players['p1'].level).toBe(1);
  });

  it('should accept a valid CombatState object', () => {
    const combat: CombatState = {
      phase: 'ACTIVE',
      monsters: [
        { cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' },
      ],
      activePlayerId: 'p1',
      helpers: [],
      appliedCards: [],
      reactionWindow: null,
      runAttempts: 0,
      resolved: false,
    };

    expect(combat.monsters).toHaveLength(1);
    expect(combat.phase).toBe('ACTIVE');
  });

  it('should accept PendingAction with CHOOSE_MONSTER_TO_CLONE', () => {
    const action: PendingAction = {
      type: 'CHOOSE_MONSTER_TO_CLONE',
      playerId: 'p1',
      timeoutMs: 30000,
      options: [
        { id: 'inst-1', label: 'Orc', cardId: 'monster_orc' },
        { id: 'inst-2', label: 'Rat', cardId: 'monster_rat' },
      ],
    };

    expect(action.type).toBe('CHOOSE_MONSTER_TO_CLONE');
    expect(action.options).toHaveLength(2);
  });

  it('should accept all GamePhase values', () => {
    const phases: GameState['phase'][] = [
      'WAITING', 'KICK_DOOR', 'LOOT_ROOM', 'LOOK_FOR_TROUBLE',
      'CHARITY', 'COMBAT', 'AFTER_COMBAT', 'END_TURN', 'END_GAME',
    ];
    expect(phases).toHaveLength(9);
  });

  it('should accept all CombatPhase values', () => {
    const phases: CombatState['phase'][] = [
      'REACTION_WINDOW', 'NEGOTIATION', 'ACTIVE', 'RUN_ATTEMPT', 'RESOLVING',
    ];
    expect(phases).toHaveLength(5);
  });
});
