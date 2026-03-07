import type {
  CardId,
  CardDb,
  CardDefinition,
  CardEffect,
  GameState,
  GameEvent,
  PlayerState,
  EquipSlot,
  EquippedItems,
} from '@munchkin/shared';
import type { TriggerEvent, CardTrigger, CardCondition } from '@munchkin/shared';
import { evaluateCondition } from '../combat/calculator';

// ---------------------------------------------------------------------------
// Equip slots for iteration
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
// Collect all triggers from a player's equipped items, race, and classes
// ---------------------------------------------------------------------------

function collectTriggers(
  player: PlayerState,
  cardDb: CardDb,
): CardTrigger[] {
  const triggers: CardTrigger[] = [];

  // Equipped items (standard slots)
  for (const slot of EQUIP_SLOTS) {
    const cardId = player.equipped[slot];
    if (!cardId) continue;
    const def = cardDb[cardId];
    if (def?.triggers) {
      triggers.push(...def.triggers);
    }
  }

  // Equipped extras
  for (const cardId of player.equipped.extras) {
    const def = cardDb[cardId];
    if (def?.triggers) {
      triggers.push(...def.triggers);
    }
  }

  // Race card: find cards in cardDb matching player's race
  if (player.race !== null) {
    for (const defId of Object.keys(cardDb)) {
      const def = cardDb[defId];
      if (
        def &&
        def.type === 'RACE' &&
        def.name.toUpperCase() === player.race &&
        def.triggers
      ) {
        triggers.push(...def.triggers);
      }
    }
  }

  // Class cards: find cards in cardDb matching player's classes
  for (const playerClass of player.classes) {
    for (const defId of Object.keys(cardDb)) {
      const def = cardDb[defId];
      if (
        def &&
        def.type === 'CLASS' &&
        def.name.toUpperCase() === playerClass &&
        def.triggers
      ) {
        triggers.push(...def.triggers);
      }
    }
  }

  return triggers;
}

// ---------------------------------------------------------------------------
// Resolve a single effect into state changes and events
// ---------------------------------------------------------------------------

function resolveEffect(
  state: GameState,
  playerId: string,
  effect: CardEffect,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) return [state, []];

  switch (effect.type) {
    case 'MODIFY_LEVEL': {
      const oldLevel = player.level;
      const newLevel = Math.max(1, player.level + effect.value);
      const updatedPlayer: PlayerState = { ...player, level: newLevel };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'LEVEL_CHANGED', playerId, oldLevel, newLevel }],
      ];
    }

    case 'DRAW_CARDS': {
      // Trigger effects that draw cards are recorded but not resolved here
      // (deck drawing requires the deck utility and is handled at a higher level)
      return [
        state,
        [{ type: 'CARDS_DRAWN', playerId, count: effect.count, deck: effect.deck }],
      ];
    }

    case 'COMBAT_BONUS': {
      // Combat bonuses are passively applied via the combat calculator;
      // no state mutation needed from the trigger itself.
      return [state, []];
    }

    case 'APPLY_STATUS': {
      if (!player.statuses.includes(effect.status)) {
        const updatedPlayer: PlayerState = {
          ...player,
          statuses: [...player.statuses, effect.status],
        };
        const newState: GameState = {
          ...state,
          players: { ...state.players, [playerId]: updatedPlayer },
        };
        return [
          newState,
          [{ type: 'STATUS_APPLIED', playerId, status: effect.status }],
        ];
      }
      return [state, []];
    }

    case 'EXTRA_TREASURE': {
      // Recorded as an event; actual treasure distribution is handled by combat resolution
      return [state, []];
    }

    case 'GAIN_GOLD': {
      // Gold translates to levels: 1000 gold = 1 level (handled elsewhere if needed)
      return [state, []];
    }

    case 'ESCAPE_BONUS': {
      // Passive effect consumed during run-away resolution
      return [state, []];
    }

    case 'AUTO_ESCAPE': {
      return [
        state,
        [{ type: 'PLAYER_ESCAPED', playerId, automatic: true }],
      ];
    }

    case 'CHANGE_GENDER': {
      const oldGender = player.gender;
      const newGender = oldGender === 'MALE' ? 'FEMALE' : 'MALE';
      const updatedPlayer: PlayerState = { ...player, gender: newGender };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'GENDER_CHANGED', playerId, from: oldGender, to: newGender }],
      ];
    }

    case 'CONDITIONAL': {
      const matched = evaluateCondition(
        effect.condition,
        player,
        state.combat,
        cardDb,
      );
      const branch = matched ? effect.then : effect.else ?? [];
      let currentState = state;
      const events: GameEvent[] = [];
      for (const subEffect of branch) {
        const [s, e] = resolveEffect(currentState, playerId, subEffect, cardDb);
        currentState = s;
        events.push(...e);
      }
      return [currentState, events];
    }

    default:
      return [state, []];
  }
}

// ---------------------------------------------------------------------------
// fireTrigger -- main entry point
// ---------------------------------------------------------------------------

export function fireTrigger(
  state: GameState,
  event: TriggerEvent,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) return [state, []];

  const triggers = collectTriggers(player, cardDb);

  // Filter triggers matching the event type
  const matching = triggers.filter((t) => t.event === event);

  let currentState = state;
  const allEvents: GameEvent[] = [];

  for (const trigger of matching) {
    // Evaluate condition if present
    if (trigger.condition) {
      const conditionMet = evaluateCondition(
        trigger.condition,
        currentState.players[playerId],
        currentState.combat,
        cardDb,
      );
      if (!conditionMet) continue;
    }

    // Apply each effect in the trigger
    for (const effect of trigger.effects) {
      const [newState, events] = resolveEffect(
        currentState,
        playerId,
        effect,
        cardDb,
      );
      currentState = newState;
      allEvents.push(...events);
    }
  }

  return [currentState, allEvents];
}
