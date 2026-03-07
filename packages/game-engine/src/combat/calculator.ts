import type {
  GameState,
  PlayerState,
  CombatState,
  CombatHelper,
  AppliedCard,
  CardDb,
  CardEffect,
  CardCondition,
  EquipSlot,
  EquippedItems,
} from '@munchkin/shared';

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: CardCondition,
  player: PlayerState,
  combat: CombatState | null,
  cardDb: CardDb,
): boolean {
  switch (condition.type) {
    case 'PLAYER_CLASS':
      return player.classes.includes(condition.class);

    case 'PLAYER_RACE':
      return (player.race ?? 'HUMAN') === condition.race;

    case 'PLAYER_GENDER':
      return player.gender === condition.gender;

    case 'PLAYER_LEVEL': {
      const lvl = player.level;
      switch (condition.op) {
        case 'gte':
          return lvl >= condition.value;
        case 'lte':
          return lvl <= condition.value;
        case 'eq':
          return lvl === condition.value;
        default:
          return false;
      }
    }

    case 'IN_COMBAT':
      return combat !== null;

    case 'ITEM_EQUIPPED':
      if (condition.slot === 'hand') {
        return player.equipped.hand1 !== null || player.equipped.hand2 !== null;
      }
      return player.equipped[condition.slot as keyof EquippedItems] !== null;

    case 'HAS_STATUS':
      return player.statuses.includes(condition.status);

    case 'MONSTER_NAME': {
      if (!combat) return false;
      return combat.monsters.some((m) => {
        const def = cardDb[m.cardId];
        return def && def.name === condition.name;
      });
    }

    case 'MONSTER_TAG': {
      if (!combat) return false;
      return combat.monsters.some((m) => {
        const def = cardDb[m.cardId];
        return def && def.tags?.includes(condition.tag);
      });
    }

    case 'AND':
      return condition.conditions.every((c) =>
        evaluateCondition(c, player, combat, cardDb),
      );

    case 'OR':
      return condition.conditions.some((c) =>
        evaluateCondition(c, player, combat, cardDb),
      );

    case 'NOT':
      return !evaluateCondition(condition.condition, player, combat, cardDb);

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Resolve effects bonus -- sums COMBAT_BONUS values from a list of effects,
// handling CONDITIONAL effects recursively.
// ---------------------------------------------------------------------------

function resolveEffectsBonus(
  effects: CardEffect[],
  player: PlayerState,
  combat: CombatState | null,
  cardDb: CardDb,
): number {
  let bonus = 0;

  for (const effect of effects) {
    if (effect.type === 'COMBAT_BONUS') {
      bonus += effect.value;
    } else if (effect.type === 'CONDITIONAL') {
      const matched = evaluateCondition(effect.condition, player, combat, cardDb);
      if (matched) {
        bonus += resolveEffectsBonus(effect.then, player, combat, cardDb);
      } else if (effect.else) {
        bonus += resolveEffectsBonus(effect.else, player, combat, cardDb);
      }
    }
  }

  return bonus;
}

// ---------------------------------------------------------------------------
// Equipped item slots (excluding extras which is an array)
// ---------------------------------------------------------------------------

const EQUIP_SLOTS: (keyof Omit<EquippedItems, 'extras'>)[] = [
  'head',
  'body',
  'feet',
  'hand1',
  'hand2',
  'twoHands',
];

// ---------------------------------------------------------------------------
// Player power
// ---------------------------------------------------------------------------

export function calculatePlayerPower(
  state: GameState,
  playerId: string,
  appliedCards: AppliedCard[],
  cardDb: CardDb,
): number {
  const player = state.players[playerId];
  if (!player) return 0;

  const combat = state.combat;
  let total = player.level;

  // Bonuses from equipped items (standard slots)
  for (const slot of EQUIP_SLOTS) {
    const cardId = player.equipped[slot];
    if (!cardId) continue;
    const def = cardDb[cardId];
    if (!def) continue;
    total += resolveEffectsBonus(def.effects, player, combat, cardDb);
  }

  // Bonuses from extra equipped items
  for (const cardId of player.equipped.extras) {
    const def = cardDb[cardId];
    if (!def) continue;
    total += resolveEffectsBonus(def.effects, player, combat, cardDb);
  }

  // Bonuses from applied cards targeting this player
  for (const applied of appliedCards) {
    if (applied.playerId !== playerId) continue;
    const def = cardDb[applied.cardId];
    if (!def) continue;
    total += resolveEffectsBonus(def.effects, player, combat, cardDb);
  }

  // Subtract curse penalties
  for (const curse of player.curses) {
    const curseDef = cardDb[curse.cardId];
    if (!curseDef) continue;
    for (const effect of curseDef.effects) {
      if (effect.type === 'COMBAT_BONUS' && effect.value < 0) {
        total += effect.value; // already negative
      }
    }
  }

  return Math.max(0, total);
}

// ---------------------------------------------------------------------------
// Helpers power
// ---------------------------------------------------------------------------

export function calculateHelpersPower(
  state: GameState,
  helpers: CombatHelper[],
  appliedCards: AppliedCard[],
  cardDb: CardDb,
): number {
  let total = 0;
  for (const helper of helpers) {
    total += calculatePlayerPower(state, helper.playerId, appliedCards, cardDb);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Monster power
// ---------------------------------------------------------------------------

export function calculateMonsterPower(
  state: GameState,
  appliedCards: AppliedCard[],
  cardDb: CardDb,
): number {
  const combat = state.combat;
  if (!combat) return 0;

  const activePlayer = state.players[combat.activePlayerId];
  let total = 0;

  // Sum base levels, modifiers, and conditional effects for all monsters
  for (const monster of combat.monsters) {
    const def = cardDb[monster.cardId];
    if (def) {
      total += def.baseLevel ?? 0;

      // Monster's own conditional effects (e.g., +2 vs elves)
      if (activePlayer) {
        total += resolveMonsterConditionalBonus(def.effects, activePlayer, combat, cardDb);
      }
    }

    // Add modifier values
    for (const mod of monster.modifiers) {
      total += mod.value;
    }
  }

  // Applied cards: MONSTER_BONUS and MONSTER_PENALTY
  for (const applied of appliedCards) {
    const def = cardDb[applied.cardId];
    if (!def) continue;

    for (const effect of def.effects) {
      if (effect.type === 'MONSTER_BONUS') {
        total += effect.value;
      } else if (effect.type === 'MONSTER_PENALTY') {
        total -= effect.value;
      }
    }
  }

  return total;
}

/**
 * Calculate bonus from monster conditional effects (e.g., +2 vs males, +3 vs elves).
 * Only sums MONSTER_BONUS / COMBAT_BONUS inside matching CONDITIONAL blocks.
 */
function resolveMonsterConditionalBonus(
  effects: CardEffect[],
  player: PlayerState,
  combat: CombatState | null,
  cardDb: CardDb,
): number {
  let bonus = 0;
  for (const effect of effects) {
    if (effect.type === 'CONDITIONAL') {
      const matched = evaluateCondition(effect.condition, player, combat, cardDb);
      if (matched) {
        for (const sub of effect.then) {
          if (sub.type === 'MONSTER_BONUS') bonus += sub.value;
          if (sub.type === 'COMBAT_BONUS') bonus += sub.value;
        }
        // Recurse for nested conditionals
        bonus += resolveMonsterConditionalBonus(effect.then, player, combat, cardDb);
      } else if (effect.else) {
        for (const sub of effect.else) {
          if (sub.type === 'MONSTER_BONUS') bonus += sub.value;
          if (sub.type === 'COMBAT_BONUS') bonus += sub.value;
        }
        bonus += resolveMonsterConditionalBonus(effect.else, player, combat, cardDb);
      }
    }
  }
  return bonus;
}

// ---------------------------------------------------------------------------
// Combat result
// ---------------------------------------------------------------------------

export function calculateCombatResult(
  state: GameState,
  cardDb: CardDb,
): 'WIN' | 'LOSE' {
  const combat = state.combat;
  if (!combat) return 'LOSE';

  const appliedCards = combat.appliedCards;

  const playerTotal =
    calculatePlayerPower(state, combat.activePlayerId, appliedCards, cardDb) +
    calculateHelpersPower(state, combat.helpers, appliedCards, cardDb);

  const monsterTotal = calculateMonsterPower(state, appliedCards, cardDb);

  // Strict greater-than; tie is a loss
  return playerTotal > monsterTotal ? 'WIN' : 'LOSE';
}

export { evaluateCondition, resolveEffectsBonus };
