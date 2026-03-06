import type { GameState } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import { InvalidActionError } from './errors';

export function handleCharityDiscard(
  state: GameState,
  playerId: string,
  cardIds: string[]
): [GameState, GameEvent[]] {
  if (state.phase !== 'CHARITY') {
    throw new InvalidActionError('Not in CHARITY phase');
  }
  if (state.activePlayerId !== playerId) {
    throw new InvalidActionError('Not the active player');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (cardIds.length === 0) {
    throw new InvalidActionError('Must discard at least one card');
  }

  // Validate all cards are in hand
  for (const cardId of cardIds) {
    if (!player.hand.includes(cardId)) {
      throw new InvalidActionError(`Card ${cardId} not in hand`);
    }
  }

  const events: GameEvent[] = [];

  // Give cards to the lowest-level player(s), or discard if no one else
  const otherPlayerIds = state.playerOrder.filter(id => id !== playerId);

  if (otherPlayerIds.length > 0) {
    // Find lowest level among other players
    let minLevel = Infinity;
    for (const id of otherPlayerIds) {
      const p = state.players[id];
      if (p && p.level < minLevel) {
        minLevel = p.level;
      }
    }
    const lowestPlayers = otherPlayerIds.filter(id => state.players[id]?.level === minLevel);

    // Distribute cards round-robin to lowest level players
    for (let i = 0; i < cardIds.length; i++) {
      const targetId = lowestPlayers[i % lowestPlayers.length];
      const cardId = cardIds[i];

      player.hand.splice(player.hand.indexOf(cardId), 1);
      state.players[targetId].hand.push(cardId);

      events.push({ type: 'CARD_DISCARDED', playerId, cardId });
    }
  } else {
    // No other players — discard to treasure pile
    for (const cardId of cardIds) {
      player.hand.splice(player.hand.indexOf(cardId), 1);
      state.discardTreasure.push(cardId);
      events.push({ type: 'CARD_DISCARDED', playerId, cardId });
    }
  }

  return [state, events];
}

export function needsCharity(state: GameState): boolean {
  const player = state.players[state.activePlayerId];
  return player ? player.hand.length > 5 : false;
}
