import type { GameState, CardId } from '@munchkin/shared';
import type { GameAction, GameEvent } from '@munchkin/shared';
import { InvalidActionError } from './errors';
import { validateAction } from './validate';
import { deepClone, getNextPlayer } from './helpers';
import {
  handleOfferHelp as offerHelp,
  handleAcceptHelp as acceptHelp,
  handleDeclineHelp as declineHelp,
  handleCounterOffer as counterOffer,
} from './negotiation';

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}

export function applyAction(
  state: GameState,
  action: GameAction,
  playerId: string
): ActionResult {
  validateAction(state, action, playerId);
  const nextState = deepClone(state);
  const events: GameEvent[] = [];

  const [resultState, actionEvents] = reduce(nextState, action, playerId);
  events.push(...actionEvents);

  const [finalState, autoEvents] = runAutoTransitions(resultState);
  events.push(...autoEvents);

  return { state: finalState, events };
}

function reduce(
  state: GameState,
  action: GameAction,
  playerId: string
): [GameState, GameEvent[]] {
  switch (action.type) {
    case 'KICK_DOOR':
      return handleKickDoor(state, playerId);
    case 'PLAY_CARD':
      return handlePlayCard(state, action, playerId);
    case 'EQUIP_ITEM':
      return handleEquipItem(state, action, playerId);
    case 'OFFER_HELP':
      return handleOfferHelp(state, action, playerId);
    case 'ACCEPT_HELP':
      return handleAcceptHelp(state, playerId);
    case 'DECLINE_HELP':
      return handleDeclineHelp(state, playerId);
    case 'COUNTER_OFFER':
      return handleCounterOffer(state, action, playerId);
    case 'RUN_AWAY':
      return handleRunAway(state, action, playerId);
    case 'END_TURN':
      return handleEndTurn(state, playerId);
    case 'REACT_PASS':
      return handleReactPass(state, playerId);
    case 'SELL_ITEMS':
      return handleSellItems(state, action, playerId);
    case 'CHOOSE_OPTION':
      return handleChooseOption(state, action, playerId);
    default:
      throw new InvalidActionError(`Unknown action: ${(action as { type: string }).type}`);
  }
}

function runAutoTransitions(state: GameState): [GameState, GameEvent[]] {
  const events: GameEvent[] = [];

  // Auto-transition: if player hand > 5 at END_TURN, go to CHARITY
  if (state.phase === 'END_TURN') {
    const activePlayer = state.players[state.activePlayerId];
    if (activePlayer && activePlayer.hand.length > 5) {
      state.phase = 'CHARITY';
    } else {
      // Move to next player's turn
      const nextPlayer = getNextPlayer(state);
      state.activePlayerId = nextPlayer;
      state.turn += 1;
      state.phase = 'KICK_DOOR';
      events.push({ type: 'TURN_ENDED', playerId: state.activePlayerId });
    }
  }

  return [state, events];
}

// --- Action handlers ---

function handleKickDoor(state: GameState, playerId: string): [GameState, GameEvent[]] {
  const events: GameEvent[] = [];

  if (state.doorDeck.length === 0) {
    // Reshuffle discard into deck
    state.doorDeck = [...state.discardDoor].sort(() => Math.random() - 0.5);
    state.discardDoor = [];
  }

  const cardId = state.doorDeck.pop();
  if (!cardId) {
    throw new InvalidActionError('No cards in door deck');
  }

  events.push({ type: 'DOOR_KICKED', playerId, cardId });

  // For now, the card goes to hand and we move to LOOT_ROOM
  // Full implementation will check card type (monster/curse/other) in later tasks
  state.players[playerId].hand.push(cardId);
  state.phase = 'LOOT_ROOM';

  return [state, events];
}

function handlePlayCard(
  state: GameState,
  action: { type: 'PLAY_CARD'; cardId: string; targetId?: string },
  playerId: string
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  const cardIndex = player.hand.indexOf(action.cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError('Card not in hand');
  }

  const events: GameEvent[] = [];
  events.push({ type: 'CARD_PLAYED', playerId, cardId: action.cardId, targetId: action.targetId });

  // Remove from hand (actual effect resolution will come in later tasks)
  player.hand.splice(cardIndex, 1);

  return [state, events];
}

function handleEquipItem(
  state: GameState,
  action: { type: 'EQUIP_ITEM'; cardId: string },
  playerId: string
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  const cardIndex = player.hand.indexOf(action.cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError('Card not in hand');
  }

  const events: GameEvent[] = [];
  events.push({ type: 'ITEM_EQUIPPED', playerId, cardId: action.cardId });

  // Remove from hand, add to carried (actual equip logic in later tasks)
  player.hand.splice(cardIndex, 1);
  player.carried.push(action.cardId);

  return [state, events];
}

function handleOfferHelp(
  state: GameState,
  action: { type: 'OFFER_HELP'; targetPlayerId: string; rewardCardIds: string[] },
  playerId: string
): [GameState, GameEvent[]] {
  return offerHelp(state, action, playerId);
}

function handleAcceptHelp(state: GameState, playerId: string): [GameState, GameEvent[]] {
  return acceptHelp(state, playerId);
}

function handleDeclineHelp(state: GameState, playerId: string): [GameState, GameEvent[]] {
  return declineHelp(state, playerId);
}

function handleCounterOffer(
  state: GameState,
  action: { type: 'COUNTER_OFFER'; rewardCardIds: string[] },
  playerId: string
): [GameState, GameEvent[]] {
  return counterOffer(state, action, playerId);
}

function handleRunAway(
  state: GameState,
  action: { type: 'RUN_AWAY'; diceRoll: number },
  playerId: string
): [GameState, GameEvent[]] {
  if (action.diceRoll < 1 || action.diceRoll > 6) {
    throw new InvalidActionError('diceRoll must be between 1 and 6');
  }

  const events: GameEvent[] = [];
  const success = action.diceRoll >= 5;
  events.push({ type: 'RUN_ATTEMPTED', playerId, diceRoll: action.diceRoll, success });

  if (success) {
    state.combat = null;
    state.phase = 'END_TURN';
  }
  // Bad stuff on failure handled in TASK-011

  return [state, events];
}

function handleEndTurn(state: GameState, playerId: string): [GameState, GameEvent[]] {
  const events: GameEvent[] = [];

  if (state.phase === 'CHARITY') {
    const player = state.players[playerId];
    if (player.hand.length > 5) {
      throw new InvalidActionError('Must reduce hand to 5 cards before ending turn');
    }
  }

  state.phase = 'END_TURN';
  return [state, events];
}

function handleReactPass(state: GameState, _playerId: string): [GameState, GameEvent[]] {
  // Stub — full implementation in TASK-013
  return [state, []];
}

function handleSellItems(
  state: GameState,
  _action: { type: 'SELL_ITEMS'; cardIds: string[] },
  _playerId: string
): [GameState, GameEvent[]] {
  // Stub — full implementation in TASK-017
  return [state, []];
}

function handleChooseOption(
  state: GameState,
  _action: { type: 'CHOOSE_OPTION'; optionId: string },
  _playerId: string
): [GameState, GameEvent[]] {
  // Stub — full implementation in TASK-012
  return [state, []];
}
