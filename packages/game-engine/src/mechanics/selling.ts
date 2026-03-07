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
// handleSellItems
// ---------------------------------------------------------------------------

export function handleSellItems(
  state: GameState,
  playerId: string,
  cardIds: CardId[],
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  if (state.phase === 'COMBAT') {
    throw new InvalidActionError('Cannot sell items during combat');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (cardIds.length === 0) {
    throw new InvalidActionError('No cards to sell');
  }

  // Validate all cards are in hand, carried, or backpack (NOT equipped)
  for (const cardId of cardIds) {
    const inHand = player.hand.includes(cardId);
    const inCarried = player.carried.includes(cardId);
    const inBackpack = player.backpack.includes(cardId);
    if (!inHand && !inCarried && !inBackpack) {
      throw new InvalidActionError(
        `Card ${cardId} must be in hand, carried, or backpack to sell`,
      );
    }
  }

  // Calculate total gold value
  let totalGold = 0;
  for (const cardId of cardIds) {
    const def = cardDb[cardId];
    if (!def) {
      throw new InvalidActionError(`Card definition for ${cardId} not found`);
    }
    totalGold += def.value ?? 0;
  }

  const levelsGained = Math.floor(totalGold / 1000);

  // Cannot reach winLevel by selling
  if (player.level + levelsGained >= state.config.winLevel) {
    throw new InvalidActionError(
      'Cannot reach winning level by selling items',
    );
  }

  // Apply changes: remove cards, update level
  const cardIdSet = new Set(cardIds);
  const newHand = player.hand.filter((c) => !cardIdSet.has(c));
  const newCarried = player.carried.filter((c) => !cardIdSet.has(c));
  const newBackpack = player.backpack.filter((c) => !cardIdSet.has(c));
  const oldLevel = player.level;
  const newLevel = player.level + levelsGained;

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    carried: newCarried,
    backpack: newBackpack,
    level: newLevel,
  };

  let currentState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  // Discard each sold card to the appropriate discard pile
  for (const cardId of cardIds) {
    const def = cardDb[cardId];
    const deck = def?.deck ?? 'TREASURE';
    currentState = discardCard(currentState, cardId, deck);
  }

  const events: GameEvent[] = [
    {
      type: 'ITEMS_SOLD',
      playerId,
      cardIds,
      goldTotal: totalGold,
      levelsGained,
    },
  ];

  if (levelsGained > 0) {
    events.push({
      type: 'LEVEL_CHANGED',
      playerId,
      oldLevel,
      newLevel,
    });
  }

  return [currentState, events];
}
