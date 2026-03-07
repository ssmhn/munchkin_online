import type {
  GameState,
  CardId,
  CardDb,
  ReactionTrigger,
  ReactionWindow,
  ReactionResponse,
  GameEvent,
} from '@munchkin/shared';
import { InvalidActionError, GameRuleError } from '../utils/errors';
import { resolveEffect } from '../effects/resolver';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REACTION_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Open a new reaction window
// ---------------------------------------------------------------------------

export function openReactionWindow(
  state: GameState,
  trigger: ReactionTrigger,
  participants?: string[],
): [GameState, GameEvent[]] {
  const timeoutMs = state.config.reactionTimeoutMs ?? DEFAULT_REACTION_TIMEOUT_MS;

  // Determine who participates -- supplied list or all players
  const playerIds = participants ?? state.playerOrder;

  // Build initial responses map
  const responses: Record<string, ReactionResponse> = {};
  for (const pid of playerIds) {
    const player = state.players[pid];
    // Auto-pass disconnected players immediately
    const passed = player ? !player.isConnected : true;
    responses[pid] = { playerId: pid, passed };
  }

  const window: ReactionWindow = {
    trigger,
    timeoutMs,
    responses,
    stack: [],
  };

  let newState: GameState;

  if (state.combat) {
    newState = {
      ...state,
      combat: {
        ...state.combat,
        reactionWindow: window,
        phase: 'REACTION_WINDOW',
      },
    };
  } else {
    // No combat -- store on a synthetic combat-like holder via combat field
    // Since reactionWindow lives on CombatState, we still need combat context.
    // For non-combat reactions, attach a minimal CombatState.
    newState = {
      ...state,
      combat: {
        phase: 'REACTION_WINDOW',
        monsters: [],
        activePlayerId: state.activePlayerId,
        helpers: [],
        appliedCards: [],
        reactionWindow: window,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      },
    };
  }

  const events: GameEvent[] = [
    { type: 'REACTION_WINDOW_OPEN', trigger: trigger as unknown, timeoutMs },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// Handle a player passing on the reaction window
// ---------------------------------------------------------------------------

export function handleReactionPass(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  const combat = state.combat;
  if (!combat || !combat.reactionWindow) {
    throw new InvalidActionError('No reaction window is open');
  }

  const window = combat.reactionWindow;
  if (!(playerId in window.responses)) {
    throw new InvalidActionError('Player is not a participant in this reaction window');
  }

  const updatedResponses: Record<string, ReactionResponse> = {
    ...window.responses,
    [playerId]: { playerId, passed: true },
  };

  const updatedWindow: ReactionWindow = {
    ...window,
    responses: updatedResponses,
  };

  const newState: GameState = {
    ...state,
    combat: {
      ...combat,
      reactionWindow: updatedWindow,
    },
  };

  return [newState, []];
}

// ---------------------------------------------------------------------------
// Handle a player playing a card in the reaction window
// ---------------------------------------------------------------------------

export function handleReactionPlayCard(
  state: GameState,
  playerId: string,
  cardId: CardId,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const combat = state.combat;
  if (!combat || !combat.reactionWindow) {
    throw new InvalidActionError('No reaction window is open');
  }

  const window = combat.reactionWindow;
  if (!(playerId in window.responses)) {
    throw new InvalidActionError('Player is not a participant in this reaction window');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  // Validate card is in player's hand
  if (!player.hand.includes(cardId)) {
    throw new InvalidActionError('Card is not in player hand');
  }

  // Validate card is playable from REACTION context
  const cardDef = cardDb[cardId];
  if (!cardDef) {
    throw new GameRuleError('Card definition not found');
  }
  if (!cardDef.playableFrom || !cardDef.playableFrom.includes('REACTION')) {
    throw new GameRuleError('Card cannot be played during a reaction window');
  }

  // Push to stack
  const updatedStack = [...window.stack, { cardId, playerId }];

  // Mark as responded
  const updatedResponses: Record<string, ReactionResponse> = {
    ...window.responses,
    [playerId]: { playerId, passed: true, cardId },
  };

  const updatedWindow: ReactionWindow = {
    ...window,
    responses: updatedResponses,
    stack: updatedStack,
  };

  // Remove card from player's hand
  const updatedHand = player.hand.filter((c) => c !== cardId);
  const updatedPlayer = { ...player, hand: updatedHand };

  const newState: GameState = {
    ...state,
    players: { ...state.players, [playerId]: updatedPlayer },
    combat: {
      ...combat,
      reactionWindow: updatedWindow,
    },
  };

  const events: GameEvent[] = [
    { type: 'CARD_PLAYED', playerId, cardId, targetPlayerId: undefined, targetMonsterId: undefined },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// Check if reaction window is complete and resolve if so
// ---------------------------------------------------------------------------

export function checkReactionWindowComplete(
  state: GameState,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const combat = state.combat;
  if (!combat || !combat.reactionWindow) {
    return [state, []];
  }

  const window = combat.reactionWindow;

  // Check if all participants have responded
  const allResponded = Object.values(window.responses).every((r) => r.passed);
  if (!allResponded) {
    return [state, []];
  }

  // Resolve stack in REVERSE order (LIFO)
  let currentState = state;
  const events: GameEvent[] = [];
  const reversedStack = [...window.stack].reverse();

  for (const item of reversedStack) {
    const cardDef = cardDb[item.cardId];
    if (!cardDef) continue;

    for (const effect of cardDef.effects) {
      const [nextState, effectEvents] = resolveEffect(
        currentState,
        effect,
        { playerId: item.playerId, cardDb, combat: currentState.combat },
      );
      currentState = nextState;
      events.push(...effectEvents);
    }
  }

  // Close the reaction window
  if (combat.monsters.length > 0) {
    // Real combat -- clear the reaction window and restore ACTIVE phase
    currentState = {
      ...currentState,
      combat: { ...currentState.combat!, reactionWindow: null, phase: 'ACTIVE' },
    };
  } else {
    // Synthetic combat state for non-combat reactions -- remove entirely
    currentState = { ...currentState, combat: null };
  }

  events.push({ type: 'REACTION_WINDOW_CLOSE' });

  return [currentState, events];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function isReactionWindowOpen(state: GameState): boolean {
  return state.combat?.reactionWindow !== null && state.combat?.reactionWindow !== undefined;
}

export function applyAutoPassForDisconnected(state: GameState): GameState {
  const combat = state.combat;
  if (!combat || !combat.reactionWindow) {
    return state;
  }

  const window = combat.reactionWindow;
  let changed = false;
  const updatedResponses: Record<string, ReactionResponse> = { ...window.responses };

  for (const [pid, response] of Object.entries(window.responses)) {
    if (response.passed) continue;

    const player = state.players[pid];
    if (!player || !player.isConnected) {
      updatedResponses[pid] = { playerId: pid, passed: true };
      changed = true;
    }
  }

  if (!changed) return state;

  return {
    ...state,
    combat: {
      ...combat,
      reactionWindow: {
        ...window,
        responses: updatedResponses,
      },
    },
  };
}
