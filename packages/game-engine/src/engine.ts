import type {
  GameState,
  GameAction,
  GameEvent,
  GameConfig,
  CardDb,
  EquippedItems,
} from '@munchkin/shared';
import { validateAction } from './validate';
import { reduce } from './reducer';
import { runAutoTransitions } from './transitions';

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function applyAction(
  state: GameState,
  action: GameAction,
  playerId: string,
  cardDb: CardDb,
): { state: GameState; events: GameEvent[] } {
  validateAction(state, action, playerId);
  const [reduced, reduceEvents] = reduce(state, action, playerId, cardDb);
  const [final, transitionEvents] = runAutoTransitions(reduced, cardDb);
  return { state: final, events: [...reduceEvents, ...transitionEvents] };
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export function createDefaultConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    winLevel: 10,
    epicMode: false,
    allowedSets: ['base'],
    maxPlayers: 6,
    enableBackpack: false,
    backpackSize: 5,
    reactionTimeoutMs: 15000,
    revealTimeoutMs: 60000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default equipped items
// ---------------------------------------------------------------------------

export function createDefaultEquipped(): EquippedItems {
  return {
    head: null,
    body: null,
    feet: null,
    hand1: null,
    hand2: null,
    twoHands: null,
    extras: [],
  };
}

// ---------------------------------------------------------------------------
// Next player helper
// ---------------------------------------------------------------------------

export function getNextPlayer(state: GameState): string {
  const idx = state.playerOrder.indexOf(state.activePlayerId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length];
}
