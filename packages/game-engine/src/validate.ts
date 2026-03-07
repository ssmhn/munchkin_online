import type { GameState, GameAction, GamePhase } from '@munchkin/shared';
import { InvalidActionError } from './utils/errors';

// ---------------------------------------------------------------------------
// Phase-allowed actions map
// ---------------------------------------------------------------------------

const PHASE_ACTIONS: Record<GamePhase, string[]> = {
  WAITING: [],
  KICK_DOOR: [
    'KICK_DOOR',
    'APPLY_REVEALED_CARD',
    'PLAY_CARD',
    'EQUIP_ITEM',
    'UNEQUIP_ITEM',
    'SELL_ITEMS',
    'PUT_IN_BACKPACK',
    'TAKE_FROM_BACKPACK',
    'DISCARD_CLASS',
    'DISCARD_RACE',
  ],
  LOOT_ROOM: [
    'LOOT',
    'LOOK_FOR_TROUBLE',
    'APPLY_REVEALED_CARD',
    'PLAY_CARD',
    'EQUIP_ITEM',
    'UNEQUIP_ITEM',
    'SELL_ITEMS',
    'PUT_IN_BACKPACK',
    'TAKE_FROM_BACKPACK',
    'DISCARD_CLASS',
    'DISCARD_RACE',
  ],
  COMBAT: [
    'PLAY_CARD',
    'RESOLVE_COMBAT',
    'OFFER_HELP',
    'RUN_AWAY',
    'END_NEGOTIATION',
    'ACCEPT_HELP',
    'DECLINE_HELP',
    'COUNTER_OFFER',
    'REACT_PASS',
    'REACT_CARD',
    'STEAL_ITEM',
    'BANISH_UNDEAD',
  ],
  AFTER_COMBAT: [
    'PLAY_CARD',
    'EQUIP_ITEM',
    'UNEQUIP_ITEM',
    'APPLY_REVEALED_CARD',
    'SELL_ITEMS',
    'PUT_IN_BACKPACK',
    'TAKE_FROM_BACKPACK',
    'DISCARD_CLASS',
    'DISCARD_RACE',
  ],
  END_TURN: [
    'END_TURN',
    'PLAY_CARD',
    'EQUIP_ITEM',
    'UNEQUIP_ITEM',
    'SELL_ITEMS',
    'PUT_IN_BACKPACK',
    'TAKE_FROM_BACKPACK',
    'DISCARD_CLASS',
    'DISCARD_RACE',
  ],
  CHARITY: ['DISCARD_CARD', 'GIVE_CARD', 'SELL_ITEMS', 'PUT_IN_BACKPACK', 'TAKE_FROM_BACKPACK'],
  END_GAME: [],
};

// ---------------------------------------------------------------------------
// Always-allowed actions (any phase, any player)
// ---------------------------------------------------------------------------

const ALWAYS_ALLOWED: Set<string> = new Set([
  'REACT_PASS',
  'REACT_CARD',
  'CHOOSE_OPTION',
  'ACCEPT_HELP',
  'DECLINE_HELP',
  'COUNTER_OFFER',
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateAction(
  state: GameState,
  action: GameAction,
  playerId: string,
): void {
  const actionType = action.type;

  // Always-allowed actions bypass phase and active-player checks
  if (ALWAYS_ALLOWED.has(actionType)) {
    return;
  }

  // Check phase allows this action
  const allowed = PHASE_ACTIONS[state.phase];
  if (!allowed || !allowed.includes(actionType)) {
    throw new InvalidActionError(
      `Action "${actionType}" is not allowed during phase "${state.phase}"`,
    );
  }

  // Active player check (most actions require the acting player to be active)
  if (actionType === 'STEAL_ITEM') {
    // STEAL_ITEM can be done by non-active players during COMBAT
    if (state.phase !== 'COMBAT') {
      throw new InvalidActionError(
        'STEAL_ITEM is only allowed during COMBAT phase',
      );
    }
  } else if (actionType === 'PLAY_CARD' && state.phase === 'COMBAT') {
    // During combat, non-active players can play cards with ANY_COMBAT or REACTION context
    // (actual playableFrom check happens in the reducer)
  } else if (actionType === 'RUN_AWAY' && state.phase === 'COMBAT' && state.combat?.escapingPlayerId === playerId) {
    // During escape, the currently escaping player (may be a helper) can roll
  } else if (playerId !== state.activePlayerId) {
    throw new InvalidActionError(
      `Only the active player ("${state.activePlayerId}") can perform "${actionType}"`,
    );
  }

  // Additional validation for APPLY_REVEALED_CARD
  if (actionType === 'APPLY_REVEALED_CARD') {
    if (state.revealedCards.length === 0) {
      throw new InvalidActionError(
        'No revealed cards available to apply',
      );
    }

    const applyAction = action as Extract<GameAction, { type: 'APPLY_REVEALED_CARD' }>;
    const revealed = state.revealedCards.find(
      (rc) => rc.cardId === applyAction.cardId,
    );
    if (!revealed) {
      throw new InvalidActionError(
        `Card "${applyAction.cardId}" is not among the revealed cards`,
      );
    }

    if (revealed.ownerId !== playerId) {
      throw new InvalidActionError(
        'You can only apply your own revealed cards',
      );
    }
  }
}
