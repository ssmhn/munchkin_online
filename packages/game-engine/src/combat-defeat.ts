import type { GameState } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import type { CardDb, CardEffect } from '@munchkin/shared';

export function handleRunAwayFull(
  state: GameState,
  playerId: string,
  diceRoll: number,
  cardDb: CardDb
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];
  if (diceRoll < 1 || diceRoll > 6) {
    throw new Error('diceRoll must be between 1 and 6');
  }

  const events: GameEvent[] = [];

  // Calculate escape bonus from equipped items and effects
  let escapeBonus = 0;
  const player = state.players[playerId];
  if (player) {
    const equippedCards = [
      player.equipped.head, player.equipped.body, player.equipped.feet,
      player.equipped.leftHand, player.equipped.rightHand, player.equipped.twoHands,
      ...player.equipped.extras,
    ].filter((c): c is string => c !== null);

    for (const cardId of equippedCards) {
      const card = cardDb[cardId];
      if (card) {
        for (const effect of card.effects) {
          if (effect.type === 'ESCAPE_BONUS') {
            escapeBonus += effect.value;
          }
        }
      }
    }

    // Race escape bonus (e.g., Halfling)
    if (player.race) {
      const raceCardId = `race_${player.race.toLowerCase()}`;
      const raceCard = cardDb[raceCardId];
      if (raceCard) {
        for (const effect of raceCard.effects) {
          if (effect.type === 'ESCAPE_BONUS') {
            escapeBonus += effect.value;
          }
        }
      }
    }
  }

  const success = diceRoll + escapeBonus >= 5;
  events.push({
    type: 'RUN_ATTEMPTED',
    playerId,
    diceRoll,
    success,
  });

  if (success) {
    // Successful escape — exit combat
    state.combat = null;
    state.phase = 'END_TURN';
  } else {
    // Failed escape — apply Bad Stuff from each monster
    for (const monster of state.combat.monsters) {
      const card = cardDb[monster.cardId];
      if (card && card.badStuff) {
        applyBadStuff(state, playerId, card.badStuff.effects, events, monster.cardId);
      }
    }

    // Clear combat after bad stuff
    for (const monster of state.combat.monsters) {
      state.discardDoor.push(monster.cardId);
    }
    state.combat = null;
    state.phase = 'END_TURN';
  }

  return [state, events];
}

function applyBadStuff(
  state: GameState,
  playerId: string,
  effects: CardEffect[],
  events: GameEvent[],
  monsterId: string
): void {
  const player = state.players[playerId];
  if (!player) return;

  events.push({ type: 'BAD_STUFF_APPLIED', playerId, monsterId });

  for (const effect of effects) {
    switch (effect.type) {
      case 'MODIFY_LEVEL': {
        const oldLevel = player.level;
        player.level = Math.max(1, player.level + effect.value);
        events.push({
          type: 'LEVEL_CHANGED',
          playerId,
          oldLevel,
          newLevel: player.level,
        });
        break;
      }

      case 'SET_LEVEL': {
        const oldLevel = player.level;
        player.level = Math.max(1, effect.value);
        events.push({
          type: 'LEVEL_CHANGED',
          playerId,
          oldLevel,
          newLevel: player.level,
        });
        break;
      }

      case 'REMOVE_EQUIPMENT': {
        if (effect.slot === 'ALL') {
          // Remove all equipment
          const slots: (keyof typeof player.equipped)[] = ['head', 'body', 'feet', 'leftHand', 'rightHand', 'twoHands'];
          for (const slot of slots) {
            const cardId = player.equipped[slot];
            if (typeof cardId === 'string' && cardId) {
              state.discardTreasure.push(cardId);
              (player.equipped as any)[slot] = null;
            }
          }
          // Clear extras
          for (const cardId of player.equipped.extras) {
            state.discardTreasure.push(cardId);
          }
          player.equipped.extras = [];
        } else if (effect.slot === 'BEST') {
          // Remove best item (placeholder: remove first found)
          const slots: (keyof typeof player.equipped)[] = ['head', 'body', 'feet', 'leftHand', 'rightHand', 'twoHands'];
          for (const slot of slots) {
            const cardId = player.equipped[slot];
            if (typeof cardId === 'string' && cardId) {
              state.discardTreasure.push(cardId);
              (player.equipped as any)[slot] = null;
              break;
            }
          }
        } else {
          // Remove specific slot
          const cardId = player.equipped[effect.slot as keyof typeof player.equipped];
          if (typeof cardId === 'string' && cardId) {
            state.discardTreasure.push(cardId);
            (player.equipped as any)[effect.slot] = null;
          }
        }
        break;
      }

      case 'DISCARD_HAND': {
        if (effect.count === 'ALL') {
          for (const cardId of player.hand) {
            state.discardTreasure.push(cardId);
          }
          player.hand = [];
        } else {
          const count = Math.min(effect.count, player.hand.length);
          const discarded = player.hand.splice(0, count);
          for (const cardId of discarded) {
            state.discardTreasure.push(cardId);
          }
        }
        break;
      }
    }
  }
}
