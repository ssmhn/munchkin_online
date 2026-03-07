import type { GameState } from '@munchkin/shared';
import type { GameAction } from '@munchkin/shared';

export class ValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

/**
 * Server-side validation layer that runs BEFORE the game engine.
 * Validates card ownership, trade card ownership, dice roll range, etc.
 * The playerId always comes from JWT (WsClient), never from the action payload.
 */
export function validateActionServer(
  state: GameState,
  action: GameAction,
  playerId: string
): void {
  const player = state.players[playerId];
  if (!player) {
    throw new ValidationError('INVALID_PLAYER', 'Player not found in game');
  }

  switch (action.type) {
    case 'PLAY_CARD':
      validateCardOwnership(player, action.cardId);
      break;

    case 'EQUIP_ITEM':
      validateCardInHand(player, action.cardId);
      break;

    case 'SELL_ITEMS':
      validateSellCards(player, action.cardIds);
      break;

    case 'OFFER_HELP':
      validateOfferHelp(state, action);
      break;

    case 'COUNTER_OFFER':
      validateTreasureCount(action.treasureCount);
      break;

    case 'RUN_AWAY':
      validateDiceRoll(action.diceRoll);
      break;

    default:
      break;
  }
}

function validateCardOwnership(
  player: { hand: string[]; carried: string[]; equipped: { hand1: string | null; hand2: string | null; head: string | null; body: string | null; feet: string | null } },
  cardId: string
): void {
  const inHand = player.hand.includes(cardId);
  const inCarried = player.carried.includes(cardId);
  const inEquipped =
    player.equipped.hand1 === cardId ||
    player.equipped.hand2 === cardId ||
    player.equipped.head === cardId ||
    player.equipped.body === cardId ||
    player.equipped.feet === cardId;

  if (!inHand && !inCarried && !inEquipped) {
    throw new ValidationError('INVALID_ACTION', 'You do not own this card');
  }
}

function validateCardInHand(
  player: { hand: string[] },
  cardId: string
): void {
  if (!player.hand.includes(cardId)) {
    throw new ValidationError('INVALID_ACTION', 'Card not in hand');
  }
}

function validateSellCards(
  player: { hand: string[]; carried: string[] },
  cardIds: string[]
): void {
  for (const cardId of cardIds) {
    const inHand = player.hand.includes(cardId);
    const inCarried = player.carried.includes(cardId);
    if (!inHand && !inCarried) {
      throw new ValidationError('INVALID_ACTION', `You do not own card ${cardId}`);
    }
  }
}

function validateOfferHelp(
  state: GameState,
  action: { type: 'OFFER_HELP'; targetPlayerId: string; treasureCount: number },
): void {
  if (!state.players[action.targetPlayerId]) {
    throw new ValidationError('INVALID_ACTION', 'Target player not found');
  }
  validateTreasureCount(action.treasureCount);
}

function validateTreasureCount(treasureCount: number): void {
  if (!Number.isInteger(treasureCount) || treasureCount < 0) {
    throw new ValidationError('INVALID_ACTION', 'treasureCount must be a non-negative integer');
  }
}

function validateDiceRoll(diceRoll: number): void {
  if (!Number.isInteger(diceRoll) || diceRoll < 1 || diceRoll > 6) {
    throw new ValidationError('INVALID_ACTION', 'diceRoll must be an integer between 1 and 6');
  }
}
