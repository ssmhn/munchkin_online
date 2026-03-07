import type {
  CardId,
  CardDb,
  GameState,
  GameEvent,
  PlayerState,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';
import { discardCard } from '../utils/deck';

// ---------------------------------------------------------------------------
// needsCharity -- does the active player have too many cards in hand?
// ---------------------------------------------------------------------------

export function needsCharity(state: GameState): boolean {
  const player = state.players[state.activePlayerId];
  if (!player) return false;
  return player.hand.length > 5;
}

// ---------------------------------------------------------------------------
// handleCharityDiscard
// ---------------------------------------------------------------------------

export function handleCharityDiscard(
  state: GameState,
  playerId: string,
  cardId: CardId,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (!player.hand.includes(cardId)) {
    throw new InvalidActionError('Card is not in player hand');
  }

  const def = cardDb[cardId];
  const deck = def?.deck ?? 'TREASURE';

  const newHand = player.hand.filter((c) => c !== cardId);

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
  };

  let newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  newState = discardCard(newState, cardId, deck);

  const events: GameEvent[] = [
    { type: 'CARD_DISCARDED', playerId, cardId },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleCharityGive
// ---------------------------------------------------------------------------

export function handleCharityGive(
  state: GameState,
  fromPlayerId: string,
  cardId: CardId,
  targetPlayerId: string,
): [GameState, GameEvent[]] {
  const fromPlayer = state.players[fromPlayerId];
  if (!fromPlayer) {
    throw new InvalidActionError(`Player ${fromPlayerId} not found`);
  }

  const targetPlayer = state.players[targetPlayerId];
  if (!targetPlayer) {
    throw new InvalidActionError(`Target player ${targetPlayerId} not found`);
  }

  if (fromPlayerId === targetPlayerId) {
    throw new InvalidActionError('Cannot give card to yourself');
  }

  if (!fromPlayer.hand.includes(cardId)) {
    throw new InvalidActionError('Card is not in player hand');
  }

  const newFromHand = fromPlayer.hand.filter((c) => c !== cardId);
  const newTargetHand = [...targetPlayer.hand, cardId];

  const updatedFromPlayer: PlayerState = {
    ...fromPlayer,
    hand: newFromHand,
  };

  const updatedTargetPlayer: PlayerState = {
    ...targetPlayer,
    hand: newTargetHand,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [fromPlayerId]: updatedFromPlayer,
      [targetPlayerId]: updatedTargetPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'CARD_GIVEN', fromPlayerId, toPlayerId: targetPlayerId, cardId },
  ];

  return [newState, events];
}
