import type {
  CardId,
  CardDb,
  GameState,
  GameEvent,
  PlayerState,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';

// ---------------------------------------------------------------------------
// handlePutInBackpack
// ---------------------------------------------------------------------------

export function handlePutInBackpack(
  state: GameState,
  playerId: string,
  cardId: CardId,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  if (!state.config.enableBackpack) {
    throw new InvalidActionError('Backpack feature is not enabled');
  }

  if (state.phase === 'COMBAT') {
    throw new InvalidActionError('Cannot use backpack during combat');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (!player.hand.includes(cardId)) {
    throw new InvalidActionError('Card is not in player hand');
  }

  if (player.backpack.length >= state.config.backpackSize) {
    throw new InvalidActionError('Backpack is full');
  }

  // Any card can go in backpack

  const newHand = player.hand.filter((c) => c !== cardId);
  const newBackpack = [...player.backpack, cardId];

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    backpack: newBackpack,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'CARD_PUT_IN_BACKPACK', playerId, cardId },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleTakeFromBackpack
// ---------------------------------------------------------------------------

export function handleTakeFromBackpack(
  state: GameState,
  playerId: string,
  cardId: CardId,
): [GameState, GameEvent[]] {
  if (!state.config.enableBackpack) {
    throw new InvalidActionError('Backpack feature is not enabled');
  }

  if (state.phase === 'COMBAT') {
    throw new InvalidActionError('Cannot use backpack during combat');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (!player.backpack.includes(cardId)) {
    throw new InvalidActionError('Card is not in backpack');
  }

  const newBackpack = player.backpack.filter((c) => c !== cardId);
  const newHand = [...player.hand, cardId];

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    backpack: newBackpack,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'CARD_TAKEN_FROM_BACKPACK', playerId, cardId },
  ];

  return [newState, events];
}
