import type { GameState } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import type { CardDb } from '@munchkin/shared';
import { InvalidActionError } from './errors';

export function handleSellItems(
  state: GameState,
  playerId: string,
  cardIds: string[],
  cardDb: CardDb
): [GameState, GameEvent[]] {
  if (state.combat) {
    throw new InvalidActionError('Cannot sell items during combat');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (cardIds.length === 0) {
    throw new InvalidActionError('Must select at least one item to sell');
  }

  // Validate all cards are in hand or carried (not equipped)
  let totalGold = 0;
  for (const cardId of cardIds) {
    const inHand = player.hand.includes(cardId);
    const inCarried = player.carried.includes(cardId);
    if (!inHand && !inCarried) {
      throw new InvalidActionError(`Card ${cardId} is not in hand or carried items`);
    }

    const card = cardDb[cardId];
    if (!card || card.value === undefined) {
      throw new InvalidActionError(`Card ${cardId} has no gold value`);
    }
    totalGold += card.value;
  }

  const levelsGained = Math.floor(totalGold / 1000);

  // Cannot sell to reach level 10 — last level only by killing a monster
  if (player.level + levelsGained >= 10) {
    throw new InvalidActionError('Cannot reach level 10 by selling items');
  }

  // Remove cards and discard them
  for (const cardId of cardIds) {
    const handIdx = player.hand.indexOf(cardId);
    if (handIdx !== -1) {
      player.hand.splice(handIdx, 1);
    } else {
      const carriedIdx = player.carried.indexOf(cardId);
      if (carriedIdx !== -1) {
        player.carried.splice(carriedIdx, 1);
      }
    }

    const card = cardDb[cardId];
    if (card && card.deck === 'TREASURE') {
      state.discardTreasure.push(cardId);
    } else {
      state.discardDoor.push(cardId);
    }
  }

  // Apply level gain
  const oldLevel = player.level;
  player.level += levelsGained;

  const events: GameEvent[] = [];
  events.push({
    type: 'ITEMS_SOLD',
    playerId,
    cardIds,
    goldTotal: totalGold,
    levelsGained,
  });

  if (levelsGained > 0) {
    events.push({
      type: 'LEVEL_CHANGED',
      playerId,
      oldLevel,
      newLevel: player.level,
    });
  }

  return [state, events];
}
