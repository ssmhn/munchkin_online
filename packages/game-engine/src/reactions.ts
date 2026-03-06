import type {
  GameState,
  ReactionWindow,
  ReactionTrigger,
  ReactionResponse,
  StackItem,
} from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';

const DEFAULT_REACTION_TIMEOUT = 15000;

export function openReactionWindow(
  state: GameState,
  trigger: ReactionTrigger,
  timeoutMs: number = DEFAULT_REACTION_TIMEOUT
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  const responses: Record<string, ReactionResponse> = {};
  for (const playerId of state.playerOrder) {
    if (state.players[playerId]?.isConnected) {
      responses[playerId] = { playerId, passed: false };
    }
  }

  state.combat.reactionWindow = {
    trigger,
    timeoutMs,
    responses,
    stack: [],
  };

  state.combat.phase = 'REACTION_WINDOW';

  return [state, []];
}

export function handleReactionPass(
  state: GameState,
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat?.reactionWindow) return [state, []];

  const window = state.combat.reactionWindow;

  if (window.responses[playerId]) {
    window.responses[playerId].passed = true;
  }

  return checkReactionWindowComplete(state);
}

export function handleReactionPlayCard(
  state: GameState,
  playerId: string,
  cardId: string
): [GameState, GameEvent[]] {
  if (!state.combat?.reactionWindow) return [state, []];

  const window = state.combat.reactionWindow;
  const player = state.players[playerId];

  // Remove card from hand
  const cardIndex = player?.hand.indexOf(cardId);
  if (cardIndex === undefined || cardIndex === -1) {
    return [state, []];
  }
  player!.hand.splice(cardIndex, 1);

  // Add to stack
  window.stack.push({ cardId, playerId });

  // Mark as responded
  if (window.responses[playerId]) {
    window.responses[playerId].passed = true;
    window.responses[playerId].cardId = cardId;
  }

  return checkReactionWindowComplete(state);
}

export function applyAutoPassForDisconnected(
  state: GameState
): [GameState, GameEvent[]] {
  if (!state.combat?.reactionWindow) return [state, []];

  const window = state.combat.reactionWindow;

  for (const playerId of Object.keys(window.responses)) {
    if (!state.players[playerId]?.isConnected && !window.responses[playerId].passed) {
      window.responses[playerId].passed = true;
    }
  }

  return checkReactionWindowComplete(state);
}

function checkReactionWindowComplete(
  state: GameState
): [GameState, GameEvent[]] {
  if (!state.combat?.reactionWindow) return [state, []];

  const window = state.combat.reactionWindow;
  const allPassed = Object.values(window.responses).every(r => r.passed);

  if (!allPassed) {
    return [state, []];
  }

  const events: GameEvent[] = [];

  // Resolve stack in reverse order (last in, first out)
  const resolvedStack = [...window.stack].reverse();
  for (const item of resolvedStack) {
    state.combat.appliedCards.push({
      cardId: item.cardId,
      playerId: item.playerId,
    });
    events.push({
      type: 'CARD_PLAYED',
      playerId: item.playerId,
      cardId: item.cardId,
    });
  }

  // Close reaction window
  state.combat.reactionWindow = null;
  state.combat.phase = 'ACTIVE';

  return [state, events];
}

export function isReactionWindowOpen(state: GameState): boolean {
  return state.combat?.reactionWindow !== null && state.combat?.reactionWindow !== undefined;
}
