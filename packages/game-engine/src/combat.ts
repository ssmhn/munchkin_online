import type { GameState, CombatState, PlayerState, CardId } from '@munchkin/shared';
import type { CardDefinition, CardEffect, CardCondition, CardDb } from '@munchkin/shared';

export type CombatResult = 'WIN' | 'LOSE';

export function calculatePlayerPower(
  state: GameState,
  playerId: string,
  cardDb: CardDb
): number {
  const player = state.players[playerId];
  if (!player) return 0;

  let total = player.level;

  // Equipment bonuses
  const equippedSlots = player.equipped;
  const equippedCards: CardId[] = [
    equippedSlots.head,
    equippedSlots.body,
    equippedSlots.feet,
    equippedSlots.leftHand,
    equippedSlots.rightHand,
    equippedSlots.twoHands,
    ...equippedSlots.extras,
  ].filter((c): c is CardId => c !== null);

  for (const cardId of equippedCards) {
    const card = cardDb[cardId];
    if (card) {
      total += resolveEffectsBonus(card.effects, player, cardDb);
    }
  }

  // Applied combat cards (one-shots played during combat)
  if (state.combat) {
    for (const applied of state.combat.appliedCards) {
      if (applied.playerId === playerId) {
        const card = cardDb[applied.cardId];
        if (card) {
          total += resolveEffectsBonus(card.effects, player, cardDb);
        }
      }
    }
  }

  // Curse penalties
  for (const curse of player.curses) {
    const card = cardDb[curse.cardId];
    if (card) {
      for (const effect of card.effects) {
        if (effect.type === 'COMBAT_BONUS' && (effect.target === 'SELF' || effect.target === 'ACTIVE_PLAYER')) {
          total += effect.value; // value is negative for penalties
        }
      }
    }
  }

  return Math.max(0, total);
}

export function calculateHelpersPower(
  state: GameState,
  cardDb: CardDb
): number {
  if (!state.combat) return 0;

  let total = 0;
  for (const helper of state.combat.helpers) {
    total += calculatePlayerPower(state, helper.playerId, cardDb);
  }
  return total;
}

export function calculateMonsterPower(
  state: GameState,
  cardDb: CardDb
): number {
  if (!state.combat) return 0;

  let total = 0;
  for (const monster of state.combat.monsters) {
    const card = cardDb[monster.cardId];
    if (card && card.baseLevel !== undefined) {
      total += card.baseLevel;
    }

    // Monster modifiers
    for (const mod of monster.modifiers) {
      total += mod.value;
    }
  }

  // Applied monster bonus/penalty cards
  for (const applied of state.combat.appliedCards) {
    const card = cardDb[applied.cardId];
    if (card) {
      for (const effect of card.effects) {
        if (effect.type === 'MONSTER_BONUS') {
          total += effect.value;
        } else if (effect.type === 'MONSTER_PENALTY') {
          total -= effect.value;
        }
      }
    }
  }

  return Math.max(0, total);
}

export function calculateCombatResult(
  state: GameState,
  cardDb: CardDb
): CombatResult {
  if (!state.combat) return 'LOSE';

  const playerTotal =
    calculatePlayerPower(state, state.combat.activePlayerId, cardDb) +
    calculateHelpersPower(state, cardDb);

  const monsterTotal = calculateMonsterPower(state, cardDb);

  // Strict inequality: player must exceed monster
  return playerTotal > monsterTotal ? 'WIN' : 'LOSE';
}

// --- Helpers ---

function resolveEffectsBonus(
  effects: CardEffect[],
  player: PlayerState,
  cardDb: CardDb
): number {
  let bonus = 0;

  for (const effect of effects) {
    if (effect.type === 'COMBAT_BONUS') {
      bonus += effect.value;
    } else if (effect.type === 'CONDITIONAL') {
      if (evaluateCondition(effect.condition, player)) {
        bonus += resolveEffectsBonus(effect.then, player, cardDb);
      } else if (effect.else) {
        bonus += resolveEffectsBonus(effect.else, player, cardDb);
      }
    }
  }

  return bonus;
}

function evaluateCondition(condition: CardCondition, player: PlayerState): boolean {
  switch (condition.type) {
    case 'PLAYER_CLASS':
      return player.classes.includes(condition.class);
    case 'PLAYER_RACE':
      return player.race === condition.race;
    case 'PLAYER_GENDER':
      return player.gender === condition.gender;
    case 'PLAYER_LEVEL':
      switch (condition.op) {
        case 'gte': return player.level >= condition.value;
        case 'lte': return player.level <= condition.value;
        case 'eq': return player.level === condition.value;
      }
      break;
    case 'IN_COMBAT':
      return true; // If called during combat, it's always true
    case 'ITEM_EQUIPPED': {
      const equipped = player.equipped;
      return equipped[condition.slot] !== null;
    }
    case 'AND':
      return condition.conditions.every(c => evaluateCondition(c, player));
    case 'OR':
      return condition.conditions.some(c => evaluateCondition(c, player));
    case 'NOT':
      return !evaluateCondition(condition.condition, player);
    default:
      return false;
  }
  return false;
}
