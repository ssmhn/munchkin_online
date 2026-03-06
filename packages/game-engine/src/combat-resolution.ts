import type { GameState, CombatMonster } from '@munchkin/shared';
import type { GameEvent, GameAction } from '@munchkin/shared';
import type { CardDb, CardDefinition } from '@munchkin/shared';
import { calculateCombatResult } from './combat';
import { deepClone, getNextPlayer } from './helpers';

export interface CombatConfig {
  winLevel: number;
}

const DEFAULT_CONFIG: CombatConfig = { winLevel: 10 };

export function resolveCombatVictory(
  state: GameState,
  cardDb: CardDb,
  config: CombatConfig = DEFAULT_CONFIG
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  const events: GameEvent[] = [];
  const activePlayerId = state.combat.activePlayerId;
  const player = state.players[activePlayerId];

  const monstersDefeated = state.combat.monsters;
  const monsterCardIds = monstersDefeated.map(m => m.cardId);

  // +1 level per monster killed
  const levelsGained = monstersDefeated.length;
  const oldLevel = player.level;
  player.level += levelsGained;

  events.push({
    type: 'COMBAT_WON',
    playerId: activePlayerId,
    monsters: monsterCardIds,
  });

  events.push({
    type: 'LEVEL_CHANGED',
    playerId: activePlayerId,
    oldLevel,
    newLevel: player.level,
  });

  // Calculate treasures
  let totalTreasures = 0;
  for (const monster of monstersDefeated) {
    const card = cardDb[monster.cardId];
    if (card && card.treasures !== undefined) {
      totalTreasures += card.treasures;
    }
  }

  // Extra treasures from applied cards
  if (state.combat) {
    for (const applied of state.combat.appliedCards) {
      const card = cardDb[applied.cardId];
      if (card) {
        for (const effect of card.effects) {
          if (effect.type === 'EXTRA_TREASURE') {
            totalTreasures += effect.count;
          }
        }
      }
    }
  }

  // Draw treasure cards
  const drawnCards: string[] = [];
  for (let i = 0; i < totalTreasures; i++) {
    if (state.treasureDeck.length === 0) {
      // Reshuffle discard
      state.treasureDeck = [...state.discardTreasure].sort(() => Math.random() - 0.5);
      state.discardTreasure = [];
    }
    const card = state.treasureDeck.pop();
    if (card) {
      drawnCards.push(card);
    }
  }

  // Distribute treasures: helpers get agreed reward, rest to active player
  const helpers = state.combat.helpers;
  for (const helper of helpers) {
    for (const rewardCardId of helper.agreedReward) {
      const idx = drawnCards.indexOf(rewardCardId);
      if (idx !== -1) {
        drawnCards.splice(idx, 1);
        state.players[helper.playerId]?.hand.push(rewardCardId);
      }
    }
  }

  // Remaining treasures go to active player
  player.hand.push(...drawnCards);

  if (totalTreasures > 0) {
    events.push({
      type: 'CARDS_DRAWN',
      playerId: activePlayerId,
      count: totalTreasures,
      deck: 'TREASURE',
    });
  }

  // Fire ON_KILL_MONSTER triggers for active player
  fireTriggers(state, activePlayerId, 'ON_KILL_MONSTER', cardDb, events);

  // Fire ON_HELPER_VICTORY triggers for each helper
  for (const helper of helpers) {
    fireTriggers(state, helper.playerId, 'ON_HELPER_VICTORY', cardDb, events);
  }

  // Discard monsters to door discard
  for (const monster of monstersDefeated) {
    state.discardDoor.push(monster.cardId);
  }

  // Clear combat
  state.combat = null;

  // Check win condition
  if (player.level >= config.winLevel) {
    state.winner = activePlayerId;
    state.phase = 'END_GAME';
    events.push({ type: 'GAME_WON', winnerId: activePlayerId });
  } else {
    state.phase = 'AFTER_COMBAT';
  }

  return [state, events];
}

function fireTriggers(
  state: GameState,
  playerId: string,
  triggerEvent: string,
  cardDb: CardDb,
  events: GameEvent[]
): void {
  const player = state.players[playerId];
  if (!player) return;

  // Check race card triggers
  if (player.race) {
    const raceCardId = `race_${player.race.toLowerCase()}`;
    const raceCard = cardDb[raceCardId];
    if (raceCard && raceCard.triggers) {
      for (const trigger of raceCard.triggers) {
        if (trigger.event === triggerEvent) {
          applyTriggerEffects(state, playerId, trigger.effects, events);
        }
      }
    }
  }

  // Check class card triggers
  for (const playerClass of player.classes) {
    const classCardId = `class_${playerClass.toLowerCase()}`;
    const classCard = cardDb[classCardId];
    if (classCard && classCard.triggers) {
      for (const trigger of classCard.triggers) {
        if (trigger.event === triggerEvent) {
          applyTriggerEffects(state, playerId, trigger.effects, events);
        }
      }
    }
  }
}

function applyTriggerEffects(
  state: GameState,
  playerId: string,
  effects: any[],
  events: GameEvent[]
): void {
  const player = state.players[playerId];
  if (!player) return;

  for (const effect of effects) {
    if (effect.type === 'MODIFY_LEVEL') {
      const oldLevel = player.level;
      player.level = Math.max(1, player.level + effect.value);
      events.push({
        type: 'LEVEL_CHANGED',
        playerId,
        oldLevel,
        newLevel: player.level,
      });
    }
  }
}
