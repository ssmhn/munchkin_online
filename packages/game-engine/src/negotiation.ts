import type { GameState } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import { InvalidActionError } from './errors';

export function handleOfferHelp(
  state: GameState,
  action: { type: 'OFFER_HELP'; targetPlayerId: string; rewardCardIds: string[] },
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat) {
    throw new InvalidActionError('No active combat');
  }
  if (state.combat.activePlayerId !== playerId) {
    throw new InvalidActionError('Only the active player can offer help');
  }
  if (action.targetPlayerId === playerId) {
    throw new InvalidActionError('Cannot offer help to yourself');
  }
  const target = state.players[action.targetPlayerId];
  if (!target) {
    throw new InvalidActionError('Target player not found');
  }

  // Check that already not a helper
  if (state.combat.helpers.some(h => h.playerId === action.targetPlayerId)) {
    throw new InvalidActionError('Player is already a helper');
  }

  // Validate reward cards exist in active player's hand
  const activePlayer = state.players[playerId];
  for (const cardId of action.rewardCardIds) {
    if (!activePlayer.hand.includes(cardId) && !hasEquippedCard(activePlayer, cardId)) {
      throw new InvalidActionError(`Reward card ${cardId} not in hand or equipment`);
    }
  }

  state.combat.phase = 'NEGOTIATION';
  state.combat.helpOffer = {
    fromPlayerId: playerId,
    toPlayerId: action.targetPlayerId,
    rewardCardIds: [...action.rewardCardIds],
  };

  return [state, []];
}

export function handleAcceptHelp(
  state: GameState,
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat || !state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to accept');
  }

  const offer = state.combat.helpOffer;

  // Either side can accept: the person the offer is directed to
  if (offer.toPlayerId !== playerId) {
    throw new InvalidActionError('You are not the target of this help offer');
  }

  // Add helper
  state.combat.helpers.push({
    playerId: offer.toPlayerId,
    agreedReward: [...offer.rewardCardIds],
  });

  const events: GameEvent[] = [
    { type: 'HELPER_JOINED', helperId: offer.toPlayerId, activePlayerId: offer.fromPlayerId },
  ];

  state.combat.helpOffer = null;
  state.combat.phase = 'ACTIVE';

  return [state, events];
}

export function handleDeclineHelp(
  state: GameState,
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat || !state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to decline');
  }

  const offer = state.combat.helpOffer;
  if (offer.toPlayerId !== playerId) {
    throw new InvalidActionError('You are not the target of this help offer');
  }

  state.combat.helpOffer = null;
  state.combat.phase = 'ACTIVE';

  return [state, []];
}

export function handleCounterOffer(
  state: GameState,
  action: { type: 'COUNTER_OFFER'; rewardCardIds: string[] },
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat || !state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to counter');
  }

  const offer = state.combat.helpOffer;
  if (offer.toPlayerId !== playerId) {
    throw new InvalidActionError('You are not the target of this help offer');
  }

  // Update reward in the offer, swap direction so active player must accept/decline
  state.combat.helpOffer = {
    fromPlayerId: offer.toPlayerId,
    toPlayerId: offer.fromPlayerId,
    rewardCardIds: [...action.rewardCardIds],
  };

  return [state, []];
}

function hasEquippedCard(player: { equipped: any }, cardId: string): boolean {
  const eq = player.equipped;
  const slots = ['head', 'body', 'feet', 'leftHand', 'rightHand', 'twoHands'];
  for (const slot of slots) {
    if (eq[slot] === cardId) return true;
  }
  if (eq.extras && eq.extras.includes(cardId)) return true;
  return false;
}
