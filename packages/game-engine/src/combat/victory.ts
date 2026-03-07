import type {
  GameState,
  CardDb,
  GameEvent,
} from '@munchkin/shared';
import type { TriggerEvent } from '@munchkin/shared';
import { drawCard, discardCard } from '../utils/deck';
import { resolveEffect } from '../effects/resolver';
import { evaluateCondition } from './calculator';

// ---------------------------------------------------------------------------
// Fire triggers matching a given event for a specific player
// ---------------------------------------------------------------------------

export function fireTriggers(
  state: GameState,
  event: TriggerEvent,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) return [state, []];

  let currentState = state;
  const events: GameEvent[] = [];

  // Collect all card IDs that may have triggers for this player:
  // race card, class cards, and all equipped items
  const triggerCardIds: string[] = [];

  // Race card -- look through hand and equipped for a RACE card
  // Race is stored as a value on player, but the card itself may carry triggers.
  // We scan all equipped items + extras for trigger sources.
  const equippedSlots: (string | null)[] = [
    player.equipped.head,
    player.equipped.body,
    player.equipped.feet,
    player.equipped.hand1,
    player.equipped.hand2,
    player.equipped.twoHands,
  ];

  for (const cardId of equippedSlots) {
    if (cardId) triggerCardIds.push(cardId);
  }
  for (const cardId of player.equipped.extras) {
    triggerCardIds.push(cardId);
  }

  // Also check carried cards for race/class cards with triggers
  for (const cardId of player.carried) {
    const def = cardDb[cardId];
    if (def && (def.type === 'RACE' || def.type === 'CLASS')) {
      triggerCardIds.push(cardId);
    }
  }

  // Check hand for race/class cards (they may be "in play" as race/class)
  for (const cardId of player.hand) {
    const def = cardDb[cardId];
    if (def && (def.type === 'RACE' || def.type === 'CLASS')) {
      triggerCardIds.push(cardId);
    }
  }

  // Process triggers
  for (const cardId of triggerCardIds) {
    const def = cardDb[cardId];
    if (!def || !def.triggers) continue;

    for (const trigger of def.triggers) {
      if (trigger.event !== event) continue;

      // Check optional condition
      if (
        trigger.condition &&
        !evaluateCondition(
          trigger.condition,
          currentState.players[playerId],
          currentState.combat,
          cardDb,
        )
      ) {
        continue;
      }

      // Apply trigger effects
      for (const effect of trigger.effects) {
        const [nextState, effectEvents] = resolveEffect(
          currentState,
          effect,
          { playerId, cardDb, combat: currentState.combat },
        );
        currentState = nextState;
        events.push(...effectEvents);
      }
    }
  }

  return [currentState, events];
}

// ---------------------------------------------------------------------------
// Resolve combat victory
// ---------------------------------------------------------------------------

export function resolveCombatVictory(
  state: GameState,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const combat = state.combat;
  if (!combat) return [state, []];

  let currentState = state;
  const events: GameEvent[] = [];
  const activePlayerId = combat.activePlayerId;
  const activePlayer = currentState.players[activePlayerId];
  if (!activePlayer) return [state, []];

  const monsterCardIds = combat.monsters.map((m) => m.cardId);

  // --- Award levels: +1 per monster killed to active player ---
  const monstersKilled = combat.monsters.length;
  const oldLevel = activePlayer.level;
  let newLevel = oldLevel + monstersKilled;

  // Check for GAIN_LEVELS_FROM_KILL effects on applied cards
  for (const applied of combat.appliedCards) {
    const def = cardDb[applied.cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'GAIN_LEVELS_FROM_KILL') {
        newLevel += effect.value;
      }
    }
  }

  currentState = {
    ...currentState,
    players: {
      ...currentState.players,
      [activePlayerId]: {
        ...currentState.players[activePlayerId],
        level: newLevel,
      },
    },
  };

  if (newLevel !== oldLevel) {
    events.push({
      type: 'LEVEL_CHANGED',
      playerId: activePlayerId,
      oldLevel,
      newLevel,
    });
  }

  // --- Check win condition ---
  if (newLevel >= currentState.config.winLevel) {
    currentState = {
      ...currentState,
      winner: activePlayerId,
      phase: 'END_GAME',
    };
    events.push({ type: 'GAME_WON', winnerId: activePlayerId });

    // Discard monsters to door discard
    for (const monsterId of monsterCardIds) {
      currentState = discardCard(currentState, monsterId, 'DOOR');
    }

    currentState = { ...currentState, combat: null };

    events.push({
      type: 'COMBAT_WON',
      playerId: activePlayerId,
      monsters: monsterCardIds,
    });

    return [currentState, events];
  }

  // --- Fire ON_KILL_MONSTER triggers for active player ---
  {
    const [nextState, triggerEvents] = fireTriggers(
      currentState,
      'ON_KILL_MONSTER',
      activePlayerId,
      cardDb,
    );
    currentState = nextState;
    events.push(...triggerEvents);
  }

  // --- Fire ON_HELPER_VICTORY triggers for each helper ---
  // Elf helpers get +1 level per the Elf racial ability
  for (const helper of combat.helpers) {
    const helperPlayer = currentState.players[helper.playerId];
    if (!helperPlayer) continue;

    // Elf bonus: +1 level for helping win combat
    if (helperPlayer.race === 'ELF') {
      const helperOldLevel = helperPlayer.level;
      const helperNewLevel = helperOldLevel + 1;
      currentState = {
        ...currentState,
        players: {
          ...currentState.players,
          [helper.playerId]: {
            ...currentState.players[helper.playerId],
            level: helperNewLevel,
          },
        },
      };
      events.push({
        type: 'LEVEL_CHANGED',
        playerId: helper.playerId,
        oldLevel: helperOldLevel,
        newLevel: helperNewLevel,
      });
    }

    // Fire generic ON_HELPER_VICTORY triggers
    const [nextState, triggerEvents] = fireTriggers(
      currentState,
      'ON_HELPER_VICTORY',
      helper.playerId,
      cardDb,
    );
    currentState = nextState;
    events.push(...triggerEvents);
  }

  // --- Count and distribute treasures ---
  let treasureCount = 0;
  for (const monster of combat.monsters) {
    const def = cardDb[monster.cardId];
    if (def) {
      treasureCount += def.treasures ?? 0;
    }
  }

  // EXTRA_TREASURE from applied cards
  for (const applied of combat.appliedCards) {
    const def = cardDb[applied.cardId];
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'EXTRA_TREASURE') {
        treasureCount += effect.count;
      }
    }
  }

  // EXTRA_TREASURE from monster modifier cards
  for (const monster of combat.monsters) {
    for (const mod of monster.modifiers) {
      const modDef = cardDb[mod.cardId];
      if (!modDef) continue;
      for (const effect of modDef.effects) {
        if (effect.type === 'EXTRA_TREASURE') {
          treasureCount += effect.count;
        }
      }
    }
  }

  // Draw treasure cards
  const drawnTreasures: string[] = [];
  for (let i = 0; i < treasureCount; i++) {
    try {
      const [nextState, cardId] = drawCard(currentState, 'TREASURE');
      currentState = nextState;
      drawnTreasures.push(cardId);
    } catch {
      // Deck exhausted -- stop drawing
      break;
    }
  }

  // Distribute: helpers get agreed rewards first, active player gets the rest
  let treasureIndex = 0;

  for (const helper of combat.helpers) {
    const rewardCount = helper.agreedTreasureCount;
    const helperTreasures = drawnTreasures.slice(
      treasureIndex,
      treasureIndex + rewardCount,
    );
    treasureIndex += rewardCount;

    if (helperTreasures.length > 0) {
      const helperPlayer = currentState.players[helper.playerId];
      if (helperPlayer) {
        currentState = {
          ...currentState,
          players: {
            ...currentState.players,
            [helper.playerId]: {
              ...currentState.players[helper.playerId],
              hand: [...currentState.players[helper.playerId].hand, ...helperTreasures],
            },
          },
        };
        events.push({
          type: 'CARDS_DRAWN',
          playerId: helper.playerId,
          count: helperTreasures.length,
          deck: 'TREASURE',
        });
      }
    }
  }

  // Active player gets the rest
  const activePlayerTreasures = drawnTreasures.slice(treasureIndex);
  if (activePlayerTreasures.length > 0) {
    currentState = {
      ...currentState,
      players: {
        ...currentState.players,
        [activePlayerId]: {
          ...currentState.players[activePlayerId],
          hand: [
            ...currentState.players[activePlayerId].hand,
            ...activePlayerTreasures,
          ],
        },
      },
    };
    events.push({
      type: 'CARDS_DRAWN',
      playerId: activePlayerId,
      count: activePlayerTreasures.length,
      deck: 'TREASURE',
    });
  }

  // --- Move to AFTER_COMBAT phase ---
  currentState = {
    ...currentState,
    phase: 'AFTER_COMBAT',
  };

  // --- Discard monsters to door discard pile ---
  for (const monsterId of monsterCardIds) {
    currentState = discardCard(currentState, monsterId, 'DOOR');
  }

  // --- Clear combat (set to null) ---
  currentState = { ...currentState, combat: null };

  events.push({
    type: 'COMBAT_WON',
    playerId: activePlayerId,
    monsters: monsterCardIds,
  });

  return [currentState, events];
}
