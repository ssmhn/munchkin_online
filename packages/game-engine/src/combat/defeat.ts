import type {
  GameState,
  CardDb,
  CombatMonster,
  GameEvent,
  EquipSlot,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';
import { discardCard } from '../utils/deck';
import { resolveEffect } from '../effects/resolver';

// ---------------------------------------------------------------------------
// Equipment slots to iterate
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
// Handle a player attempting to run away from combat
// ---------------------------------------------------------------------------

/**
 * Calculate the global escape bonus for a player from equipment, curses, etc.
 * This bonus applies to ALL monster escape rolls.
 */
function calculateGlobalEscapeBonus(
  player: GameState['players'][string],
  cardDb: CardDb,
): number {
  let escapeBonus = 0;

  // Equipped items
  for (const slot of EQUIP_SLOTS) {
    const cardId = player.equipped[slot];
    if (!cardId) continue;
    const def = cardDb[cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'ESCAPE_BONUS') {
        escapeBonus += effect.value;
      }
    }
  }

  // Extras
  for (const cardId of player.equipped.extras) {
    const def = cardDb[cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'ESCAPE_BONUS') {
        escapeBonus += effect.value;
      }
    }
  }

  // Curse penalties on escape (negative ESCAPE_BONUS)
  for (const curse of player.curses) {
    const curseDef = cardDb[curse.cardId];
    if (!curseDef) continue;
    for (const effect of curseDef.effects) {
      if (effect.type === 'ESCAPE_BONUS') {
        escapeBonus += effect.value; // may be negative
      }
    }
  }

  return escapeBonus;
}

/**
 * Calculate monster-specific escape modifier.
 * Some monsters have ESCAPE_BONUS (negative = harder to escape) or PREVENT_ESCAPE effects.
 * Returns { bonus, prevented } where prevented means auto-fail.
 */
function calculateMonsterEscapeModifier(
  monster: CombatMonster,
  cardDb: CardDb,
): { bonus: number; prevented: boolean } {
  const def = cardDb[monster.cardId];
  if (!def) return { bonus: 0, prevented: false };

  let bonus = 0;
  let prevented = false;

  for (const effect of def.effects) {
    if (effect.type === 'ESCAPE_BONUS') {
      bonus += effect.value;
    } else if (effect.type === 'PREVENT_ESCAPE') {
      prevented = true;
    }
  }

  return { bonus, prevented };
}

export function handleRunAway(
  state: GameState,
  playerId: string,
  diceRoll: number,
  discardedCardId: string | undefined,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  if (diceRoll < 1 || diceRoll > 6 || !Number.isInteger(diceRoll)) {
    throw new InvalidActionError('Dice roll must be an integer between 1 and 6');
  }

  const combat = state.combat;
  if (!combat) {
    throw new InvalidActionError('No active combat');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  let currentState = state;
  const events: GameEvent[] = [];

  // Global escape bonus from equipment, curses, etc.
  let globalEscapeBonus = calculateGlobalEscapeBonus(player, cardDb);

  // Halfling bonus: discard a card for +1 escape
  if (discardedCardId && player.race === 'HALFLING') {
    if (!player.hand.includes(discardedCardId)) {
      throw new InvalidActionError('Discarded card is not in player hand');
    }

    const updatedHand = player.hand.filter((c) => c !== discardedCardId);
    const updatedPlayer = { ...player, hand: updatedHand };
    currentState = {
      ...currentState,
      players: { ...currentState.players, [playerId]: updatedPlayer },
    };

    const discardDef = cardDb[discardedCardId];
    const discardDeck = discardDef?.deck === 'TREASURE' ? 'TREASURE' : 'DOOR';
    currentState = discardCard(currentState, discardedCardId, discardDeck);

    events.push({ type: 'CARD_DISCARDED', playerId, cardId: discardedCardId });
    globalEscapeBonus += 1;
  }

  // Applied combat cards with ESCAPE_BONUS
  for (const applied of combat.appliedCards) {
    const def = cardDb[applied.cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'ESCAPE_BONUS') {
        globalEscapeBonus += effect.value;
      }
    }
  }

  // Increment run attempts
  const updatedCombat = {
    ...currentState.combat!,
    runAttempts: currentState.combat!.runAttempts + 1,
  };
  currentState = { ...currentState, combat: updatedCombat };

  // Roll escape for each monster separately
  // In Munchkin, the same dice roll is used but each monster has its own modifiers
  const escapedMonsters: CombatMonster[] = [];
  const failedMonsters: CombatMonster[] = [];

  for (const monster of updatedCombat.monsters) {
    const monsterMod = calculateMonsterEscapeModifier(monster, cardDb);

    if (monsterMod.prevented) {
      // Cannot escape this monster
      failedMonsters.push(monster);
      events.push({
        type: 'RUN_ATTEMPTED',
        playerId,
        diceRoll,
        success: false,
        monsterId: monster.cardId,
      });
    } else {
      const totalEscape = diceRoll + globalEscapeBonus + monsterMod.bonus;
      const escaped = totalEscape >= 5;

      events.push({
        type: 'RUN_ATTEMPTED',
        playerId,
        diceRoll,
        success: escaped,
        monsterId: monster.cardId,
      });

      if (escaped) {
        escapedMonsters.push(monster);
      } else {
        failedMonsters.push(monster);
      }
    }
  }

  if (failedMonsters.length === 0) {
    // Escaped all monsters
    events.push({ type: 'PLAYER_ESCAPED', playerId });
    currentState = clearCombat(currentState);
    currentState = { ...currentState, phase: 'END_TURN' };
  } else {
    // Apply bad stuff only from monsters that caught the player
    const [stateAfterBadStuff, badStuffEvents] = applyBadStuff(
      currentState,
      playerId,
      failedMonsters,
      cardDb,
    );
    currentState = stateAfterBadStuff;
    events.push(...badStuffEvents);

    currentState = clearCombat(currentState);
    currentState = { ...currentState, phase: 'END_TURN' };
  }

  return [currentState, events];
}

// ---------------------------------------------------------------------------
// Apply bad stuff from monsters
// ---------------------------------------------------------------------------

export function applyBadStuff(
  state: GameState,
  playerId: string,
  monsters: CombatMonster[],
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  let currentState = state;
  const events: GameEvent[] = [];

  for (const monster of monsters) {
    const def = cardDb[monster.cardId];
    if (!def || !def.badStuff) continue;

    for (const effect of def.badStuff.effects) {
      const [nextState, effectEvents] = resolveEffect(
        currentState,
        effect,
        { playerId, cardDb, combat: currentState.combat },
      );
      currentState = nextState;
      events.push(...effectEvents);
    }

    events.push({
      type: 'BAD_STUFF_APPLIED',
      playerId,
      monsterId: monster.cardId,
    });
  }

  return [currentState, events];
}

// ---------------------------------------------------------------------------
// Clear combat state, discarding monster cards to the door discard pile
// ---------------------------------------------------------------------------

export function clearCombat(state: GameState): GameState {
  const combat = state.combat;
  if (!combat) return state;

  let currentState = state;

  // Discard monster cards to door discard pile
  for (const monster of combat.monsters) {
    currentState = discardCard(currentState, monster.cardId, 'DOOR');
  }

  // Also discard modifier cards to the appropriate discard pile
  for (const monster of combat.monsters) {
    for (const mod of monster.modifiers) {
      currentState = discardCard(currentState, mod.cardId, 'DOOR');
    }
  }

  // Discard applied cards (one-shots default to door discard)
  for (const applied of combat.appliedCards) {
    currentState = discardCard(currentState, applied.cardId, 'DOOR');
  }

  return { ...currentState, combat: null };
}
