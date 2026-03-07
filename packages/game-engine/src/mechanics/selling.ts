import type {
  CardId,
  CardDb,
  GameState,
  GameEvent,
  PlayerState,
  EquippedItems,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';
import { discardCard } from '../utils/deck';

const EQUIP_SLOTS: (keyof Omit<EquippedItems, 'extras'>)[] = [
  'head', 'body', 'feet', 'hand1', 'hand2', 'twoHands',
];

function isEquipped(player: PlayerState, cardId: CardId): boolean {
  for (const slot of EQUIP_SLOTS) {
    if (player.equipped[slot] === cardId) return true;
  }
  return player.equipped.extras.includes(cardId);
}

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

  // Validate all cards are owned by the player (hand, carried, backpack, or equipped)
  for (const cardId of cardIds) {
    const inHand = player.hand.includes(cardId);
    const inCarried = player.carried.includes(cardId);
    const inBackpack = player.backpack.includes(cardId);
    const equipped = isEquipped(player, cardId);
    if (!inHand && !inCarried && !inBackpack && !equipped) {
      throw new InvalidActionError(
        `You do not own card ${cardId}`,
      );
    }
  }

  // Calculate total gold value from this sale
  let saleGold = 0;
  for (const cardId of cardIds) {
    const def = cardDb[cardId];
    if (!def) {
      throw new InvalidActionError(`Card definition for ${cardId} not found`);
    }
    saleGold += def.value ?? 0;
  }

  // Accumulate with previously sold gold this turn
  const totalGold = (player.soldGold ?? 0) + saleGold;
  const levelsGained = Math.floor(totalGold / 1000);
  const remainderGold = totalGold % 1000;

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

  // Also remove from equipped slots
  let newEquipped = { ...player.equipped };
  for (const cardId of cardIds) {
    for (const slot of EQUIP_SLOTS) {
      if (newEquipped[slot] === cardId) {
        newEquipped = { ...newEquipped, [slot]: null };
      }
    }
    if (newEquipped.extras.includes(cardId)) {
      newEquipped = {
        ...newEquipped,
        extras: newEquipped.extras.filter((c) => c !== cardId),
      };
    }
  }

  const oldLevel = player.level;
  const newLevel = player.level + levelsGained;

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    carried: newCarried,
    backpack: newBackpack,
    equipped: newEquipped,
    level: newLevel,
    soldGold: remainderGold,
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
      goldTotal: saleGold,
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
