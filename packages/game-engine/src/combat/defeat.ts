import type {
  GameState,
  CardDb,
  CombatMonster,
  GameEvent,
  EquipSlot,
  EquippedItems,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';
import { discardCard } from '../utils/deck';
import { resolveEffect } from '../effects/resolver';
import { hasStatus } from '../mechanics/equipment';

// ---------------------------------------------------------------------------
// Equipment slots to iterate
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

/**
 * Build the ordered list of players who need to roll escape dice.
 * Active player first, then each helper.
 */
function getEscapePlayerOrder(combat: NonNullable<GameState['combat']>): string[] {
  const order: string[] = [combat.activePlayerId];
  for (const h of combat.helpers) {
    if (!order.includes(h.playerId)) {
      order.push(h.playerId);
    }
  }
  return order;
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

  // Verify it's the correct player's turn to escape
  const escapingPlayerId = combat.escapingPlayerId ?? combat.activePlayerId;
  if (playerId !== escapingPlayerId) {
    throw new InvalidActionError('It is not your turn to roll for escape');
  }

  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  let currentState = state;
  const events: GameEvent[] = [];

  // Wizard auto-escape: skip dice roll, escape all monsters automatically
  if (hasStatus(player, 'WIZARD_AUTO_ESCAPE', cardDb)) {
    // Auto-escape this player through all remaining monsters
    const escapeResults = [...(combat.escapeResults ?? [])];
    for (let i = combat.escapeMonsterIndex ?? 0; i < combat.monsters.length; i++) {
      escapeResults.push({
        instanceId: combat.monsters[i].instanceId,
        escaped: true,
        prevented: false,
        roll: 6,
        playerId,
      });
    }
    events.push({ type: 'PLAYER_ESCAPED', playerId, automatic: true });

    // Move to next player or finish
    const escapeOrder = getEscapePlayerOrder(combat);
    const currentIdx = escapeOrder.indexOf(playerId);
    const nextPlayer = escapeOrder[currentIdx + 1];

    if (nextPlayer) {
      currentState = {
        ...currentState,
        combat: {
          ...currentState.combat!,
          escapeMonsterIndex: 0,
          escapeResults,
          escapingPlayerId: nextPlayer,
          runAttempts: currentState.combat!.runAttempts + 1,
        },
      };
      return [currentState, events];
    }

    // All players done
    return finishEscape(currentState, escapeResults, combat, cardDb, events);
  }

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

  // Determine which monster we're escaping from
  const monsterIndex = combat.escapeMonsterIndex ?? 0;
  const monster = combat.monsters[monsterIndex];
  if (!monster) {
    throw new InvalidActionError('No monster to escape from');
  }

  const escapeResults = [...(combat.escapeResults ?? [])];
  const monsterMod = calculateMonsterEscapeModifier(monster, cardDb);

  let escaped: boolean;
  if (monsterMod.prevented) {
    escaped = false;
    events.push({
      type: 'RUN_ATTEMPTED',
      playerId,
      diceRoll,
      success: false,
      monsterId: monster.cardId,
    });
  } else {
    const totalEscape = diceRoll + globalEscapeBonus + monsterMod.bonus;
    escaped = totalEscape >= 5;
    events.push({
      type: 'RUN_ATTEMPTED',
      playerId,
      diceRoll,
      success: escaped,
      monsterId: monster.cardId,
    });
  }

  escapeResults.push({
    instanceId: monster.instanceId,
    escaped,
    prevented: monsterMod.prevented,
    roll: diceRoll,
    playerId,
  });

  const nextMonsterIndex = monsterIndex + 1;
  const hasMoreMonsters = nextMonsterIndex < combat.monsters.length;

  if (hasMoreMonsters) {
    // More monsters to escape from for this player
    currentState = {
      ...currentState,
      combat: {
        ...currentState.combat!,
        escapeMonsterIndex: nextMonsterIndex,
        escapeResults,
        runAttempts: currentState.combat!.runAttempts + 1,
      },
    };
    return [currentState, events];
  }

  // This player finished all monsters — move to next player
  const escapeOrder = getEscapePlayerOrder(combat);
  const currentIdx = escapeOrder.indexOf(playerId);
  const nextPlayer = escapeOrder[currentIdx + 1];

  if (nextPlayer) {
    // Next player starts escaping from monster 0
    currentState = {
      ...currentState,
      combat: {
        ...currentState.combat!,
        escapeMonsterIndex: 0,
        escapeResults,
        escapingPlayerId: nextPlayer,
        runAttempts: currentState.combat!.runAttempts + 1,
      },
    };
    return [currentState, events];
  }

  // All players done escaping — apply results
  return finishEscape(currentState, escapeResults, combat, cardDb, events);
}

/**
 * After all players have rolled escape for all monsters, resolve bad stuff.
 */
function finishEscape(
  currentState: GameState,
  escapeResults: GameState['combat'] extends infer C ? C extends { escapeResults?: infer R } ? NonNullable<R> : never : never,
  combat: NonNullable<GameState['combat']>,
  cardDb: CardDb,
  events: GameEvent[],
): [GameState, GameEvent[]] {
  const escapeOrder = getEscapePlayerOrder(combat);

  // For each player, find which monsters they failed to escape
  for (const pid of escapeOrder) {
    const playerResults = escapeResults.filter((r) => r.playerId === pid);
    const failedMonsters = combat.monsters.filter((m) => {
      const result = playerResults.find((r) => r.instanceId === m.instanceId);
      return result && !result.escaped;
    });

    if (failedMonsters.length === 0) {
      events.push({ type: 'PLAYER_ESCAPED', playerId: pid });
    } else {
      const [stateAfterBadStuff, badStuffEvents] = applyBadStuff(
        currentState,
        pid,
        failedMonsters,
        cardDb,
      );
      currentState = stateAfterBadStuff;
      events.push(...badStuffEvents);
    }
  }

  currentState = clearCombat(currentState);
  currentState = { ...currentState, phase: 'END_TURN' };

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

  // Remove NEXT_COMBAT duration curses from all players who were in combat
  const updatedPlayers = { ...currentState.players };
  for (const pid of Object.keys(updatedPlayers)) {
    const player = updatedPlayers[pid];
    const hadCurses = player.curses.length;
    const filteredCurses = player.curses.filter((c) => c.duration !== 'NEXT_COMBAT');
    if (filteredCurses.length !== hadCurses) {
      updatedPlayers[pid] = { ...player, curses: filteredCurses };
    }
  }

  return { ...currentState, players: updatedPlayers, combat: null };
}
