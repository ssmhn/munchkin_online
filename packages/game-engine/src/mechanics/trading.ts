import type {
  CardDb,
  GameState,
  GameEvent,
  CombatState,
  CombatHelper,
  HelpOffer,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';

// ---------------------------------------------------------------------------
// handleOfferHelp
// ---------------------------------------------------------------------------

export function handleOfferHelp(
  state: GameState,
  playerId: string,
  targetPlayerId: string,
  treasureCount: number,
  _cardDb: CardDb,
): [GameState, GameEvent[]] {
  if (state.phase !== 'COMBAT' || !state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (state.combat.activePlayerId !== playerId) {
    throw new InvalidActionError('Only the active combat player can offer help');
  }

  if (!state.players[targetPlayerId]) {
    throw new InvalidActionError(`Target player ${targetPlayerId} not found`);
  }

  if (playerId === targetPlayerId) {
    throw new InvalidActionError('Cannot offer help to yourself');
  }

  if (treasureCount < 0) {
    throw new InvalidActionError('Treasure count cannot be negative');
  }

  const helpOffer: HelpOffer = {
    fromPlayerId: playerId,
    toPlayerId: targetPlayerId,
    treasureCount,
  };

  const newCombat: CombatState = {
    ...state.combat,
    helpOffer,
    phase: 'NEGOTIATION',
  };

  const newState: GameState = {
    ...state,
    combat: newCombat,
  };

  const events: GameEvent[] = [
    { type: 'HELP_OFFERED', fromPlayerId: playerId, toPlayerId: targetPlayerId },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleAcceptHelp
// ---------------------------------------------------------------------------

export function handleAcceptHelp(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  if (!state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (!state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to accept');
  }

  if (state.combat.helpOffer.toPlayerId !== playerId) {
    throw new InvalidActionError('Only the targeted player can accept help');
  }

  const offer = state.combat.helpOffer;

  const newHelper: CombatHelper = {
    playerId,
    agreedTreasureCount: offer.treasureCount,
  };

  const newCombat: CombatState = {
    ...state.combat,
    helpers: [...state.combat.helpers, newHelper],
    helpOffer: null,
    phase: 'ACTIVE',
  };

  const newState: GameState = {
    ...state,
    combat: newCombat,
  };

  const events: GameEvent[] = [
    { type: 'HELP_ACCEPTED', helperId: playerId },
    {
      type: 'HELPER_JOINED',
      helperId: playerId,
      activePlayerId: state.combat.activePlayerId,
    },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleDeclineHelp
// ---------------------------------------------------------------------------

export function handleDeclineHelp(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  if (!state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (!state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to decline');
  }

  if (state.combat.helpOffer.toPlayerId !== playerId) {
    throw new InvalidActionError('Only the targeted player can decline help');
  }

  const newCombat: CombatState = {
    ...state.combat,
    helpOffer: null,
    phase: 'ACTIVE',
  };

  const newState: GameState = {
    ...state,
    combat: newCombat,
  };

  const events: GameEvent[] = [
    { type: 'HELP_DECLINED', helperId: playerId },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleCounterOffer
// ---------------------------------------------------------------------------

export function handleCounterOffer(
  state: GameState,
  playerId: string,
  treasureCount: number,
): [GameState, GameEvent[]] {
  if (!state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (!state.combat.helpOffer) {
    throw new InvalidActionError('No help offer to counter');
  }

  const originalOffer = state.combat.helpOffer;

  if (originalOffer.toPlayerId !== playerId) {
    throw new InvalidActionError('Only the targeted player can counter-offer');
  }

  const newOffer: HelpOffer = {
    fromPlayerId: playerId,
    toPlayerId: originalOffer.fromPlayerId,
    treasureCount,
  };

  const newCombat: CombatState = {
    ...state.combat,
    helpOffer: newOffer,
  };

  const newState: GameState = {
    ...state,
    combat: newCombat,
  };

  const events: GameEvent[] = [
    {
      type: 'HELP_OFFERED',
      fromPlayerId: playerId,
      toPlayerId: originalOffer.fromPlayerId,
    },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleEndNegotiation
// ---------------------------------------------------------------------------

export function handleEndNegotiation(
  state: GameState,
): [GameState, GameEvent[]] {
  if (!state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  const newCombat: CombatState = {
    ...state.combat,
    helpOffer: null,
    phase: 'ACTIVE',
  };

  const newState: GameState = {
    ...state,
    combat: newCombat,
  };

  return [newState, []];
}
