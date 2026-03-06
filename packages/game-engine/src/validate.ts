import type { GameState } from '@munchkin/shared';
import type { GameAction } from '@munchkin/shared';
import { InvalidActionError } from './errors';

const PHASE_ALLOWED_ACTIONS: Record<string, string[]> = {
  WAITING: [],
  KICK_DOOR: ['KICK_DOOR', 'PLAY_CARD', 'EQUIP_ITEM', 'SELL_ITEMS'],
  COMBAT: ['PLAY_CARD', 'OFFER_HELP', 'ACCEPT_HELP', 'DECLINE_HELP', 'COUNTER_OFFER', 'RUN_AWAY', 'REACT_PASS'],
  LOOT_ROOM: ['PLAY_CARD', 'EQUIP_ITEM', 'END_TURN', 'SELL_ITEMS'],
  LOOK_FOR_TROUBLE: ['PLAY_CARD', 'END_TURN', 'SELL_ITEMS'],
  AFTER_COMBAT: ['END_TURN', 'EQUIP_ITEM', 'SELL_ITEMS'],
  CHARITY: ['PLAY_CARD', 'CHOOSE_OPTION', 'END_TURN'],
  END_TURN: ['END_TURN'],
  END_GAME: [],
};

const ALWAYS_ALLOWED: string[] = ['REACT_PASS', 'CHOOSE_OPTION'];

export function validateAction(state: GameState, action: GameAction, playerId: string): void {
  if (state.phase === 'END_GAME') {
    throw new InvalidActionError('Game is over');
  }

  if (state.phase === 'WAITING') {
    throw new InvalidActionError('Game has not started yet');
  }

  if (ALWAYS_ALLOWED.includes(action.type)) {
    return;
  }

  const allowed = PHASE_ALLOWED_ACTIONS[state.phase] ?? [];
  if (!allowed.includes(action.type)) {
    throw new InvalidActionError(
      `Action ${action.type} is not allowed in phase ${state.phase}`
    );
  }

  // Only active player can do non-reaction actions in most phases
  const reactionActions = ['REACT_PASS', 'PLAY_CARD', 'ACCEPT_HELP', 'DECLINE_HELP', 'COUNTER_OFFER'];
  if (state.phase === 'COMBAT' && reactionActions.includes(action.type)) {
    // In combat, non-active players can react
    return;
  }

  if (playerId !== state.activePlayerId && !ALWAYS_ALLOWED.includes(action.type)) {
    // Allow PLAY_CARD in combat for non-active players (reactions)
    if (state.phase === 'COMBAT' && action.type === 'PLAY_CARD') {
      return;
    }
    throw new InvalidActionError('It is not your turn');
  }
}
