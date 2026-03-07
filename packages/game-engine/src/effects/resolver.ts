import type {
  GameState,
  PlayerState,
  CombatState,
  CombatMonster,
  CardId,
  EquipSlot,
  ActiveCurse,
  PendingAction,
} from '@munchkin/shared';
import type {
  CardEffect,
  CardCondition,
  EffectTarget,
  CardDb,
  CardDefinition,
} from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import { drawCard, discardCard } from '../utils/deck';
import { v4IdGen } from '../utils/ids';
import { GameRuleError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface EffectContext {
  playerId: string;
  cardDb: CardDb;
  combat?: CombatState | null;
  targetPlayerId?: string;
  targetMonsterId?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function resolveEffect(
  state: GameState,
  effect: CardEffect,
  context: EffectContext,
): [GameState, GameEvent[]] {
  switch (effect.type) {
    // -- Combat bonuses (applied dynamically, not via state mutation) --------
    case 'COMBAT_BONUS':
    case 'MONSTER_BONUS':
    case 'MONSTER_PENALTY':
    case 'ESCAPE_BONUS':
    case 'PREVENT_ESCAPE':
    case 'COMBAT_IMMUNITY':
    case 'EXTRA_TREASURE':
    case 'GAIN_GOLD':
    case 'GAIN_LEVELS_FROM_KILL':
    case 'STEAL_ITEM':
    case 'GIVE_CARD_FROM_HAND':
    case 'FORCE_SELL':
      return [state, []];

    // -- Level modification -------------------------------------------------
    case 'MODIFY_LEVEL':
      return handleModifyLevel(state, effect, context);

    case 'SET_LEVEL':
      return handleSetLevel(state, effect, context);

    // -- Equipment removal --------------------------------------------------
    case 'REMOVE_EQUIPMENT':
      return handleRemoveEquipment(state, effect, context);

    // -- Discard hand -------------------------------------------------------
    case 'DISCARD_HAND':
      return handleDiscardHand(state, effect, context);

    // -- Race / Class / Gender ----------------------------------------------
    case 'REMOVE_CLASS':
      return handleRemoveClass(state, effect, context);

    case 'REMOVE_RACE':
      return handleRemoveRace(state, effect, context);

    case 'CHANGE_GENDER':
      return handleChangeGender(state, effect, context);

    // -- Curses & statuses --------------------------------------------------
    case 'APPLY_CURSE':
      return handleApplyCurse(state, effect, context);

    case 'REMOVE_CURSE':
      return handleRemoveCurse(state, effect, context);

    case 'APPLY_STATUS':
      return handleApplyStatus(state, effect, context);

    // -- Drawing cards ------------------------------------------------------
    case 'DRAW_CARDS':
      return handleDrawCards(state, effect, context);

    // -- Escape -------------------------------------------------------------
    case 'AUTO_ESCAPE':
      return handleAutoEscape(state, context);

    // -- Conditional --------------------------------------------------------
    case 'CONDITIONAL':
      return handleConditional(state, effect, context);

    // -- Monster manipulation -----------------------------------------------
    case 'CLONE_MONSTER':
      return handleCloneMonster(state, effect, context);

    case 'ADD_MONSTER':
      return handleAddMonster(state, effect, context);

    default:
      return [state, []];
  }
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

export function resolveTarget(
  state: GameState,
  target: EffectTarget,
  context: EffectContext,
): string[] {
  switch (target) {
    case 'SELF':
      return [context.playerId];

    case 'ACTIVE_PLAYER':
      return [state.activePlayerId];

    case 'ALL_PLAYERS':
      return state.playerOrder;

    case 'OTHER_PLAYERS':
      return state.playerOrder.filter((id) => id !== context.playerId);

    case 'LOWEST_LEVEL': {
      let min = Infinity;
      for (const id of state.playerOrder) {
        const lvl = state.players[id].level;
        if (lvl < min) min = lvl;
      }
      return state.playerOrder.filter((id) => state.players[id].level === min);
    }

    case 'HIGHEST_LEVEL': {
      let max = -Infinity;
      for (const id of state.playerOrder) {
        const lvl = state.players[id].level;
        if (lvl > max) max = lvl;
      }
      return state.playerOrder.filter((id) => state.players[id].level === max);
    }

    case 'CHOSEN_PLAYER':
      return context.targetPlayerId ? [context.targetPlayerId] : [context.playerId];

    default:
      return [context.playerId];
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

export function evaluateCondition(
  condition: CardCondition,
  state: GameState,
  context: EffectContext,
): boolean {
  switch (condition.type) {
    case 'PLAYER_CLASS': {
      const player = state.players[context.playerId];
      return player ? player.classes.includes(condition.class) : false;
    }

    case 'PLAYER_RACE': {
      const player = state.players[context.playerId];
      return player ? player.race === condition.race : false;
    }

    case 'PLAYER_GENDER': {
      const player = state.players[context.playerId];
      return player ? player.gender === condition.gender : false;
    }

    case 'PLAYER_LEVEL': {
      const player = state.players[context.playerId];
      if (!player) return false;
      switch (condition.op) {
        case 'gte':
          return player.level >= condition.value;
        case 'lte':
          return player.level <= condition.value;
        case 'eq':
          return player.level === condition.value;
        default:
          return false;
      }
    }

    case 'MONSTER_NAME': {
      if (!context.combat) return false;
      return context.combat.monsters.some((m) => {
        const def = context.cardDb[m.cardId];
        return def && def.name === condition.name;
      });
    }

    case 'MONSTER_TAG': {
      if (!context.combat) return false;
      return context.combat.monsters.some((m) => {
        const def = context.cardDb[m.cardId];
        return def && def.tags?.includes(condition.tag);
      });
    }

    case 'IN_COMBAT':
      return state.combat !== null;

    case 'ITEM_EQUIPPED': {
      const player = state.players[context.playerId];
      return player ? player.equipped[condition.slot] !== null : false;
    }

    case 'HAS_STATUS': {
      const player = state.players[context.playerId];
      return player ? player.statuses.includes(condition.status) : false;
    }

    case 'AND':
      return condition.conditions.every((c) => evaluateCondition(c, state, context));

    case 'OR':
      return condition.conditions.some((c) => evaluateCondition(c, state, context));

    case 'NOT':
      return !evaluateCondition(condition.condition, state, context);

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Clone helper
// ---------------------------------------------------------------------------

export function cloneMonster(original: CombatMonster): CombatMonster {
  return {
    cardId: original.cardId,
    modifiers: original.modifiers.map((m) => ({ ...m })),
    instanceId: v4IdGen(),
  };
}

// ---------------------------------------------------------------------------
// Effect handlers (private)
// ---------------------------------------------------------------------------

function updatePlayer(
  state: GameState,
  playerId: string,
  updater: (p: PlayerState) => PlayerState,
): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: updater(player),
    },
  };
}

function handleModifyLevel(
  state: GameState,
  effect: Extract<CardEffect, { type: 'MODIFY_LEVEL' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;
    const oldLevel = player.level;
    const newLevel = Math.max(1, player.level + effect.value);
    s = updatePlayer(s, tid, (p) => ({ ...p, level: newLevel }));
    events.push({ type: 'LEVEL_CHANGED', playerId: tid, oldLevel, newLevel });
  }

  return [s, events];
}

function handleSetLevel(
  state: GameState,
  effect: Extract<CardEffect, { type: 'SET_LEVEL' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;
    const oldLevel = player.level;
    const newLevel = Math.max(1, effect.value);
    s = updatePlayer(s, tid, (p) => ({ ...p, level: newLevel }));
    events.push({ type: 'LEVEL_CHANGED', playerId: tid, oldLevel, newLevel });
  }

  return [s, events];
}

function handleRemoveEquipment(
  state: GameState,
  effect: Extract<CardEffect, { type: 'REMOVE_EQUIPMENT' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;

    if (effect.slot === 'ALL') {
      // Remove all equipped items
      const slots = ['head', 'body', 'feet', 'hand1', 'hand2', 'twoHands'] as const;
      for (const slot of slots) {
        const cardId = player.equipped[slot];
        if (cardId) {
          const def = context.cardDb[cardId];
          const discardDeck = def?.deck ?? 'TREASURE';
          s = discardCard(s, cardId, discardDeck);
        }
      }
      // Also discard extras
      for (const cardId of player.equipped.extras) {
        const def = context.cardDb[cardId];
        const discardDeck = def?.deck ?? 'TREASURE';
        s = discardCard(s, cardId, discardDeck);
      }

      s = updatePlayer(s, tid, (p) => ({
        ...p,
        equipped: {
          head: null,
          body: null,
          feet: null,
          hand1: null,
          hand2: null,
          twoHands: null,
          extras: [],
        },
      }));
      events.push({ type: 'EQUIPMENT_REMOVED', playerId: tid, slot: 'ALL' });
    } else if (effect.slot === 'BEST') {
      // Find the item with highest value
      const slots = ['head', 'body', 'feet', 'hand1', 'hand2', 'twoHands'] as const;
      let bestSlot: EquipSlot | null = null;
      let bestValue = -1;
      let bestCardId: CardId | null = null;

      for (const slot of slots) {
        const cardId = player.equipped[slot];
        if (cardId) {
          const def = context.cardDb[cardId];
          const val = def?.value ?? 0;
          if (val > bestValue) {
            bestValue = val;
            bestSlot = slot;
            bestCardId = cardId;
          }
        }
      }

      // Also check extras
      let bestExtraIdx = -1;
      for (let i = 0; i < player.equipped.extras.length; i++) {
        const cardId = player.equipped.extras[i];
        const def = context.cardDb[cardId];
        const val = def?.value ?? 0;
        if (val > bestValue) {
          bestValue = val;
          bestSlot = null;
          bestExtraIdx = i;
          bestCardId = cardId;
        }
      }

      if (bestCardId) {
        const def = context.cardDb[bestCardId];
        const discardDeck = def?.deck ?? 'TREASURE';
        s = discardCard(s, bestCardId, discardDeck);

        if (bestSlot !== null) {
          s = updatePlayer(s, tid, (p) => ({
            ...p,
            equipped: { ...p.equipped, [bestSlot]: null },
          }));
        } else if (bestExtraIdx >= 0) {
          s = updatePlayer(s, tid, (p) => ({
            ...p,
            equipped: {
              ...p.equipped,
              extras: p.equipped.extras.filter((_, idx) => idx !== bestExtraIdx),
            },
          }));
        }
        events.push({ type: 'EQUIPMENT_REMOVED', playerId: tid, slot: 'BEST' });
      }
    } else {
      // Specific slot
      const slot = effect.slot as EquipSlot;
      const cardId = player.equipped[slot];
      if (cardId) {
        const def = context.cardDb[cardId];
        const discardDeck = def?.deck ?? 'TREASURE';
        s = discardCard(s, cardId, discardDeck);
        s = updatePlayer(s, tid, (p) => ({
          ...p,
          equipped: { ...p.equipped, [slot]: null },
        }));
        events.push({ type: 'EQUIPMENT_REMOVED', playerId: tid, slot });
      }
    }
  }

  return [s, events];
}

function handleDiscardHand(
  state: GameState,
  effect: Extract<CardEffect, { type: 'DISCARD_HAND' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;

    if (effect.count === 'ALL') {
      // Discard the entire hand immediately
      for (const cardId of player.hand) {
        const def = context.cardDb[cardId];
        const discardDeck = def?.deck ?? 'DOOR';
        s = discardCard(s, cardId, discardDeck);
      }
      s = updatePlayer(s, tid, (p) => ({ ...p, hand: [] }));
      events.push({ type: 'CARDS_DRAWN', playerId: tid, count: 0, deck: 'DOOR' });
    } else if (effect.count > 0) {
      // Player must choose which cards to discard -- create a pending action
      const availableCards = player.hand;
      const countToDiscard = Math.min(effect.count, availableCards.length);

      if (countToDiscard > 0) {
        const pending: PendingAction = {
          type: 'CHOOSE_CARDS_TO_DISCARD',
          playerId: tid,
          timeoutMs: state.config.reactionTimeoutMs,
          options: availableCards.map((cid) => {
            const def = context.cardDb[cid];
            return { id: cid, label: def?.name ?? cid, cardId: cid };
          }),
          count: countToDiscard,
          availableCards,
        };
        s = { ...s, pendingActions: [...s.pendingActions, pending] };
        events.push({ type: 'PENDING_ACTION_CREATED', actionType: 'CHOOSE_CARDS_TO_DISCARD' });
      }
    }
  }

  return [s, events];
}

function handleRemoveClass(
  state: GameState,
  effect: Extract<CardEffect, { type: 'REMOVE_CLASS' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;
    s = updatePlayer(s, tid, (p) => ({ ...p, classes: [] }));
    events.push({ type: 'CLASS_CHANGED', playerId: tid, classes: [] });
  }

  return [s, events];
}

function handleRemoveRace(
  state: GameState,
  effect: Extract<CardEffect, { type: 'REMOVE_RACE' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;
    const oldRace = player.race;
    s = updatePlayer(s, tid, (p) => ({ ...p, race: null }));
    events.push({ type: 'RACE_CHANGED', playerId: tid, from: oldRace, to: null });
  }

  return [s, events];
}

function handleChangeGender(
  state: GameState,
  effect: Extract<CardEffect, { type: 'CHANGE_GENDER' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;
    const oldGender = player.gender;
    const newGender = oldGender === 'MALE' ? 'FEMALE' : 'MALE';
    s = updatePlayer(s, tid, (p) => ({ ...p, gender: newGender }));
    events.push({ type: 'GENDER_CHANGED', playerId: tid, from: oldGender, to: newGender });
  }

  return [s, events];
}

function handleApplyCurse(
  state: GameState,
  effect: Extract<CardEffect, { type: 'APPLY_CURSE' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;

    const curse: ActiveCurse = {
      curseId: v4IdGen(),
      cardId: effect.curseId,
    };

    s = updatePlayer(s, tid, (p) => ({
      ...p,
      curses: [...p.curses, curse],
    }));
    events.push({ type: 'CURSE_APPLIED', playerId: tid, curseCardId: effect.curseId });
  }

  return [s, events];
}

function handleRemoveCurse(
  state: GameState,
  effect: Extract<CardEffect, { type: 'REMOVE_CURSE' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player || player.curses.length === 0) continue;

    let removedCurseId: string;

    if (effect.curseId) {
      // Remove specific curse by cardId
      const idx = player.curses.findIndex((c) => c.cardId === effect.curseId);
      if (idx === -1) continue;
      removedCurseId = player.curses[idx].curseId;
      s = updatePlayer(s, tid, (p) => ({
        ...p,
        curses: p.curses.filter((_, i) => i !== idx),
      }));
    } else {
      // Remove the first curse
      removedCurseId = player.curses[0].curseId;
      s = updatePlayer(s, tid, (p) => ({
        ...p,
        curses: p.curses.slice(1),
      }));
    }

    events.push({ type: 'CURSE_REMOVED', playerId: tid, curseId: removedCurseId });
  }

  return [s, events];
}

function handleApplyStatus(
  state: GameState,
  effect: Extract<CardEffect, { type: 'APPLY_STATUS' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;

    // Only add if not already present
    if (!player.statuses.includes(effect.status)) {
      s = updatePlayer(s, tid, (p) => ({
        ...p,
        statuses: [...p.statuses, effect.status],
      }));
      events.push({ type: 'STATUS_APPLIED', playerId: tid, status: effect.status });
    }
  }

  return [s, events];
}

function handleDrawCards(
  state: GameState,
  effect: Extract<CardEffect, { type: 'DRAW_CARDS' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const targetIds = resolveTarget(state, effect.target, context);
  let s = state;
  const events: GameEvent[] = [];

  for (const tid of targetIds) {
    const player = s.players[tid];
    if (!player) continue;

    const drawnCards: CardId[] = [];
    for (let i = 0; i < effect.count; i++) {
      try {
        const [newState, cardId] = drawCard(s, effect.deck);
        s = newState;
        drawnCards.push(cardId);
      } catch {
        // Deck exhausted, stop drawing
        break;
      }
    }

    if (drawnCards.length > 0) {
      s = updatePlayer(s, tid, (p) => ({
        ...p,
        hand: [...p.hand, ...drawnCards],
      }));
      events.push({
        type: 'CARDS_DRAWN',
        playerId: tid,
        count: drawnCards.length,
        deck: effect.deck,
      });
    }
  }

  return [s, events];
}

function handleAutoEscape(
  state: GameState,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const events: GameEvent[] = [];
  let s = state;

  if (s.combat) {
    s = {
      ...s,
      combat: {
        ...s.combat,
        resolved: true,
      },
    };
  }

  events.push({ type: 'PLAYER_ESCAPED', playerId: context.playerId, automatic: true });
  return [s, events];
}

function handleConditional(
  state: GameState,
  effect: Extract<CardEffect, { type: 'CONDITIONAL' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  const conditionMet = evaluateCondition(effect.condition, state, context);
  const effectsToApply = conditionMet ? effect.then : (effect.else ?? []);

  let s = state;
  const allEvents: GameEvent[] = [];

  for (const subEffect of effectsToApply) {
    const [newState, events] = resolveEffect(s, subEffect, context);
    s = newState;
    allEvents.push(...events);
  }

  return [s, allEvents];
}

function handleCloneMonster(
  state: GameState,
  effect: Extract<CardEffect, { type: 'CLONE_MONSTER' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  const monsters = state.combat.monsters;
  if (monsters.length === 0) return [state, []];

  // If only one monster, auto-clone it
  if (monsters.length === 1 || effect.instanceId === 'CURRENT') {
    const target = effect.instanceId === 'CURRENT'
      ? monsters[0]
      : monsters[0];
    const clone = cloneMonster(target);

    const newCombat: CombatState = {
      ...state.combat,
      monsters: [...state.combat.monsters, clone],
    };

    return [
      { ...state, combat: newCombat },
      [{ type: 'MONSTER_CLONED', originalInstanceId: target.instanceId, cloneInstanceId: clone.instanceId }],
    ];
  }

  // Multiple monsters -- player must choose which to clone
  const pending: PendingAction = {
    type: 'CHOOSE_MONSTER_TO_CLONE',
    playerId: context.playerId,
    timeoutMs: state.config.reactionTimeoutMs,
    options: monsters.map((m) => {
      const def = context.cardDb[m.cardId];
      return { id: m.instanceId, label: def?.name ?? m.cardId, cardId: m.cardId };
    }),
  };

  const s: GameState = {
    ...state,
    pendingActions: [...state.pendingActions, pending],
  };

  return [s, [{ type: 'PENDING_ACTION_CREATED', actionType: 'CHOOSE_MONSTER_TO_CLONE' }]];
}

function handleAddMonster(
  state: GameState,
  effect: Extract<CardEffect, { type: 'ADD_MONSTER' }>,
  context: EffectContext,
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  // Source: HAND — player chooses a monster from their hand
  if (effect.source === 'HAND') {
    const player = state.players[context.playerId];
    if (!player) return [state, []];

    // Find monsters in hand
    const monstersInHand = player.hand.filter((cardId) => {
      const def = context.cardDb[cardId];
      return def?.type === 'MONSTER';
    });

    if (monstersInHand.length === 0) return [state, []];

    // Create pending action for player to choose which monster
    const pending: PendingAction = {
      type: 'CHOOSE_MONSTER_FROM_HAND',
      playerId: context.playerId,
      timeoutMs: 30000,
      options: monstersInHand.map((cardId) => {
        const def = context.cardDb[cardId];
        return { id: cardId, label: def?.name ?? cardId, cardId };
      }),
    };

    const s: GameState = {
      ...state,
      pendingActions: [...state.pendingActions, pending],
    };

    return [s, [{ type: 'PENDING_ACTION_CREATED', actionType: 'CHOOSE_MONSTER_FROM_HAND' }]];
  }

  // Source: DOOR_DECK or DISCARD — draw from door deck
  let s = state;
  let drawnCardId: CardId;

  try {
    const [newState, cardId] = drawCard(s, 'DOOR');
    s = newState;
    drawnCardId = cardId;
  } catch {
    // No cards available
    return [s, []];
  }

  const def: CardDefinition | undefined = context.cardDb[drawnCardId];

  if (def && def.type === 'MONSTER') {
    const instanceId = v4IdGen();
    const newMonster: CombatMonster = {
      cardId: drawnCardId,
      modifiers: [],
      instanceId,
    };

    const newCombat: CombatState = {
      ...s.combat!,
      monsters: [...s.combat!.monsters, newMonster],
    };

    return [
      { ...s, combat: newCombat },
      [{ type: 'MONSTER_ADDED', cardId: drawnCardId, instanceId }],
    ];
  }

  // Not a monster -- discard it
  s = discardCard(s, drawnCardId, 'DOOR');
  return [s, []];
}
