import type { GameState, PlayerState, EquipSlot } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import type { CardDb, CardDefinition } from '@munchkin/shared';
import { InvalidActionError } from './errors';

export function handleEquipItemFull(
  state: GameState,
  playerId: string,
  cardId: string,
  cardDb: CardDb
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) throw new InvalidActionError('Player not found');

  const card = cardDb[cardId];
  if (!card || card.type !== 'EQUIPMENT') {
    throw new InvalidActionError('Card is not equipment');
  }

  const cardIndex = player.hand.indexOf(cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError('Card not in hand');
  }

  // Check requirements
  if (card.requirements) {
    for (const req of card.requirements) {
      if (!checkRequirement(player, req, cardDb)) {
        // Warrior with IGNORE_WEAPON_RESTRICTIONS can bypass
        if (hasStatus(player, 'IGNORE_WEAPON_RESTRICTIONS', cardDb)) {
          continue;
        }
        throw new InvalidActionError(`Requirement not met: ${req.type} ${req.value}`);
      }
    }
  }

  const slots = card.slots;
  if (!slots || slots.length === 0) {
    throw new InvalidActionError('Card has no equipment slots');
  }

  const targetSlot = slots[0];

  // Check two-handed weapon
  if (targetSlot === 'twoHands') {
    if (player.equipped.leftHand !== null || player.equipped.rightHand !== null) {
      throw new InvalidActionError('Cannot equip two-handed weapon: hand slots occupied');
    }
  }

  // Check if slot is occupied
  if (targetSlot !== 'twoHands') {
    const currentInSlot = player.equipped[targetSlot as keyof typeof player.equipped];
    if (typeof currentInSlot === 'string' && currentInSlot !== null) {
      throw new InvalidActionError(`Slot ${targetSlot} is already occupied`);
    }
  }

  // Check hands when equipping single-hand weapon
  if (targetSlot === 'leftHand' || targetSlot === 'rightHand') {
    if (player.equipped.twoHands !== null) {
      throw new InvalidActionError('Cannot equip single-hand item: two-handed weapon equipped');
    }
  }

  // Check big item limit
  if (card.isBig) {
    const currentBigCount = countBigItems(player, cardDb);
    const maxBig = hasStatus(player, 'EXTRA_BIG_ITEM', cardDb) ? 2 : 1;
    if (currentBigCount >= maxBig) {
      throw new InvalidActionError('Cannot carry more Big items');
    }
  }

  // Remove from hand
  player.hand.splice(cardIndex, 1);

  // Equip to slot
  if (targetSlot === 'twoHands') {
    player.equipped.twoHands = cardId;
  } else {
    (player.equipped as any)[targetSlot] = cardId;
  }

  const events: GameEvent[] = [
    { type: 'ITEM_EQUIPPED', playerId, cardId },
  ];

  return [state, events];
}

function checkRequirement(
  player: PlayerState,
  req: { type: string; value: string },
  cardDb: CardDb
): boolean {
  switch (req.type) {
    case 'CLASS':
      return player.classes.includes(req.value as any);
    case 'RACE':
      return player.race === req.value;
    case 'GENDER':
      return player.gender === req.value;
    case 'NOT_CLASS':
      return !player.classes.includes(req.value as any);
    case 'NOT_RACE':
      return player.race !== req.value;
    default:
      return true;
  }
}

function hasStatus(player: PlayerState, status: string, cardDb: CardDb): boolean {
  // Check class effects
  for (const playerClass of player.classes) {
    const classCard = cardDb[`class_${playerClass.toLowerCase()}`];
    if (classCard) {
      for (const effect of classCard.effects) {
        if (effect.type === 'APPLY_STATUS' && effect.status === status) {
          return true;
        }
      }
    }
  }

  // Check race effects
  if (player.race) {
    const raceCard = cardDb[`race_${player.race.toLowerCase()}`];
    if (raceCard) {
      for (const effect of raceCard.effects) {
        if (effect.type === 'APPLY_STATUS' && effect.status === status) {
          return true;
        }
      }
    }
  }

  return false;
}

function countBigItems(player: PlayerState, cardDb: CardDb): number {
  let count = 0;
  const allEquipped = [
    player.equipped.head,
    player.equipped.body,
    player.equipped.feet,
    player.equipped.leftHand,
    player.equipped.rightHand,
    player.equipped.twoHands,
    ...player.equipped.extras,
  ].filter((c): c is string => c !== null);

  for (const cardId of allEquipped) {
    const card = cardDb[cardId];
    if (card && card.isBig) {
      count++;
    }
  }

  // Also count carried big items
  for (const cardId of player.carried) {
    const card = cardDb[cardId];
    if (card && card.isBig) {
      count++;
    }
  }

  return count;
}
