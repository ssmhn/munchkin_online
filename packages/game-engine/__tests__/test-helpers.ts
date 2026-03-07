import type { GameState, PlayerState, EquippedItems, GamePhase } from '@munchkin/shared';

export function createDefaultEquipped(): EquippedItems {
  return {
    head: null,
    body: null,
    feet: null,
    hand1: null, hand2: null,
    twoHands: null,
    extras: [],
  };
}

export function createPlayer(overrides: Partial<PlayerState> & { id: string }): PlayerState {
  return {
    name: overrides.id,
    level: 1,
    gender: 'MALE',
    race: null,
    classes: [],
    hand: [],
    equipped: createDefaultEquipped(),
    carried: [],
    curses: [],
    isConnected: true,
    statuses: [],
    backpack: [],
    soldGold: 0,
    ...overrides,
  };
}

export function createGameState(overrides: Partial<GameState> = {}): GameState {
  const p1 = createPlayer({ id: 'p1' });
  const p2 = createPlayer({ id: 'p2' });
  return {
    id: 'test-game',
    phase: 'KICK_DOOR' as GamePhase,
    turn: 1,
    activePlayerId: 'p1',
    playerOrder: ['p1', 'p2'],
    players: { p1, p2 },
    doorDeck: ['card_1', 'card_2', 'card_3'],
    treasureDeck: ['treasure_1', 'treasure_2'],
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [],
    winner: null,
    ...overrides,
  };
}
