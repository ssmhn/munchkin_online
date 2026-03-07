import type {
  CardId,
  CardDb,
  CardDefinition,
  GameState,
  GameEvent,
  PlayerState,
  EquippedItems,
  EquipSlot,
  StatusEffect,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Equip slots (excluding extras array)
// ---------------------------------------------------------------------------

const EQUIP_SLOTS: EquipSlot[] = [
  'head',
  'body',
  'feet',
  'hand1',
  'hand2',
  'twoHands',
];

// ---------------------------------------------------------------------------
// hasStatus -- checks player.statuses + APPLY_STATUS effects on equipped/race/class cards
// ---------------------------------------------------------------------------

export function hasStatus(
  player: PlayerState,
  status: StatusEffect,
  cardDb: CardDb,
): boolean {
  if (player.statuses.includes(status)) {
    return true;
  }

  // Check equipped items for APPLY_STATUS effects
  for (const slot of EQUIP_SLOTS) {
    const cardId = player.equipped[slot];
    if (!cardId) continue;
    const def = cardDb[cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'APPLY_STATUS' && effect.status === status) {
        return true;
      }
    }
  }

  // Check extras
  for (const cardId of player.equipped.extras) {
    const def = cardDb[cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'APPLY_STATUS' && effect.status === status) {
        return true;
      }
    }
  }

  // Check race and class cards in cardDb
  for (const defId of Object.keys(cardDb)) {
    const def = cardDb[defId];
    if (!def) continue;

    if (def.type === 'RACE' && player.race !== null) {
      // Match by race name
      if (def.name.toUpperCase() === player.race) {
        for (const effect of def.effects) {
          if (effect.type === 'APPLY_STATUS' && effect.status === status) {
            return true;
          }
        }
      }
    }

    if (def.type === 'CLASS' && player.classes.length > 0) {
      for (const pc of player.classes) {
        if (def.name.toUpperCase() === pc) {
          for (const effect of def.effects) {
            if (effect.type === 'APPLY_STATUS' && effect.status === status) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// countBigItems -- count big items in equipped + carried
// ---------------------------------------------------------------------------

export function countBigItems(player: PlayerState, cardDb: CardDb): number {
  let count = 0;

  // Equipped slots
  for (const slot of EQUIP_SLOTS) {
    const cardId = player.equipped[slot];
    if (!cardId) continue;
    const def = cardDb[cardId];
    if (def?.isBig) count++;
  }

  // Equipped extras
  for (const cardId of player.equipped.extras) {
    const def = cardDb[cardId];
    if (def?.isBig) count++;
  }

  // Carried items
  for (const cardId of player.carried) {
    const def = cardDb[cardId];
    if (def?.isBig) count++;
  }

  return count;
}

// ---------------------------------------------------------------------------
// handleEquipItem
// ---------------------------------------------------------------------------

export function handleEquipItem(
  state: GameState,
  playerId: string,
  cardId: CardId,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (!player.hand.includes(cardId)) {
    throw new InvalidActionError('Card is not in player hand');
  }

  const def = cardDb[cardId];
  if (!def) {
    throw new InvalidActionError('Card definition not found');
  }

  if (def.type !== 'EQUIPMENT') {
    throw new InvalidActionError('Card is not equipment');
  }

  if (!def.slots || def.slots.length === 0) {
    throw new InvalidActionError('Equipment card has no slots');
  }

  const ignoreRestrictions = hasStatus(player, 'IGNORE_WEAPON_RESTRICTIONS', cardDb);

  // Check requirements (unless player ignores weapon restrictions)
  if (!ignoreRestrictions && def.requirements) {
    for (const req of def.requirements) {
      switch (req.type) {
        case 'CLASS':
          if (!player.classes.includes(req.value as any)) {
            throw new InvalidActionError(`Requires class ${req.value}`);
          }
          break;
        case 'RACE': {
          const effectiveRace = player.race ?? 'HUMAN';
          if (effectiveRace !== req.value) {
            throw new InvalidActionError(`Requires race ${req.value}`);
          }
          break;
        }
        case 'GENDER':
          if (player.gender !== req.value) {
            throw new InvalidActionError(`Requires gender ${req.value}`);
          }
          break;
        case 'NOT_CLASS':
          if (player.classes.includes(req.value as any)) {
            throw new InvalidActionError(`Cannot be used by class ${req.value}`);
          }
          break;
        case 'NOT_RACE': {
          const effectiveRace = player.race ?? 'HUMAN';
          if (effectiveRace === req.value) {
            throw new InvalidActionError(`Cannot be used by race ${req.value}`);
          }
          break;
        }
      }
    }
  }

  // Determine the target slot
  const slot = def.slots[0];

  // Slot occupancy validation
  const equipped = player.equipped;

  // Map 'hand' slot from card data to actual hand1/hand2
  let resolvedSlot: string = slot;
  if (slot === 'hand') {
    if (equipped.twoHands !== null && !ignoreRestrictions) {
      throw new InvalidActionError('Two-handed weapon is equipped');
    }
    if (equipped.hand1 === null) {
      resolvedSlot = 'hand1';
    } else if (equipped.hand2 === null) {
      resolvedSlot = 'hand2';
    } else {
      throw new InvalidActionError('Both hands are occupied');
    }
  }

  switch (resolvedSlot) {
    case 'twoHands': {
      if (!ignoreRestrictions) {
        if (equipped.hand1 !== null || equipped.hand2 !== null) {
          throw new InvalidActionError('Hands are occupied');
        }
      }
      break;
    }
    case 'head':
    case 'body':
    case 'feet': {
      if (equipped[resolvedSlot as keyof EquippedItems] !== null) {
        throw new InvalidActionError(`${resolvedSlot} slot is already occupied`);
      }
      break;
    }
  }

  // Big item check
  if (def.isBig) {
    const currentBig = countBigItems(player, cardDb);
    const maxBig =
      hasStatus(player, 'CARRY_EXTRA_BIG_ITEM', cardDb) ||
      hasStatus(player, 'EXTRA_BIG_ITEM', cardDb)
        ? 2
        : 1;
    if (currentBig >= maxBig) {
      throw new InvalidActionError('Cannot carry more big items');
    }
  }

  // Apply: remove card from hand, place in equipped slot
  const newHand = player.hand.filter((c) => c !== cardId);

  let newEquipped: EquippedItems;
  if (resolvedSlot === 'twoHands') {
    newEquipped = {
      ...equipped,
      hand1: null,
      hand2: null,
      twoHands: cardId,
    };
  } else {
    newEquipped = {
      ...equipped,
      [resolvedSlot]: cardId,
    };
  }

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    equipped: newEquipped,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'ITEM_EQUIPPED', playerId, cardId, slot: resolvedSlot },
  ];

  return [newState, events];
}

// ---------------------------------------------------------------------------
// handleUnequipItem
// ---------------------------------------------------------------------------

export function handleUnequipItem(
  state: GameState,
  playerId: string,
  cardId: CardId,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  // Find which slot the card is in
  let foundSlot: string | null = null;

  for (const slot of EQUIP_SLOTS) {
    if (player.equipped[slot] === cardId) {
      foundSlot = slot;
      break;
    }
  }

  if (!foundSlot) {
    // Check extras
    const extrasIdx = player.equipped.extras.indexOf(cardId);
    if (extrasIdx !== -1) {
      foundSlot = 'extras';
    }
  }

  if (!foundSlot) {
    throw new InvalidActionError('Card is not equipped');
  }

  let newEquipped: EquippedItems;
  if (foundSlot === 'extras') {
    newEquipped = {
      ...player.equipped,
      extras: player.equipped.extras.filter((c) => c !== cardId),
    };
  } else {
    newEquipped = {
      ...player.equipped,
      [foundSlot]: null,
    };
  }

  const updatedPlayer: PlayerState = {
    ...player,
    hand: [...player.hand, cardId],
    equipped: newEquipped,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'ITEM_UNEQUIPPED', playerId, cardId, slot: foundSlot },
  ];

  return [newState, events];
}
