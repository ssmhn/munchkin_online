import type { GameState, PlayerState, ActiveCurse } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import type { CardDb, CardEffect } from '@munchkin/shared';

export function applyCurseCard(
  state: GameState,
  targetPlayerId: string,
  cardId: string,
  cardDb: CardDb
): [GameState, GameEvent[]] {
  const card = cardDb[cardId];
  if (!card || card.type !== 'CURSE') return [state, []];

  const player = state.players[targetPlayerId];
  if (!player) return [state, []];

  const events: GameEvent[] = [];
  events.push({ type: 'CURSE_APPLIED', playerId: targetPlayerId, curseId: cardId });

  for (const effect of card.effects) {
    applyImmediateCurseEffect(state, targetPlayerId, effect, events);
  }

  // Discard the curse card
  state.discardDoor.push(cardId);

  return [state, events];
}

function applyImmediateCurseEffect(
  state: GameState,
  playerId: string,
  effect: CardEffect,
  events: GameEvent[]
): void {
  const player = state.players[playerId];
  if (!player) return;

  switch (effect.type) {
    case 'REMOVE_CLASS':
      player.classes = [];
      break;

    case 'REMOVE_RACE':
      player.race = null;
      break;

    case 'CHANGE_GENDER':
      player.gender = player.gender === 'MALE' ? 'FEMALE' : 'MALE';
      break;

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

    case 'REMOVE_EQUIPMENT': {
      const slots: (keyof typeof player.equipped)[] = ['head', 'body', 'feet', 'leftHand', 'rightHand', 'twoHands'];
      if (effect.slot === 'ALL') {
        for (const slot of slots) {
          const cardId = player.equipped[slot];
          if (typeof cardId === 'string' && cardId) {
            state.discardTreasure.push(cardId);
            (player.equipped as any)[slot] = null;
          }
        }
        for (const cardId of player.equipped.extras) {
          state.discardTreasure.push(cardId);
        }
        player.equipped.extras = [];
      } else if (effect.slot !== 'BEST') {
        const cardId = player.equipped[effect.slot as keyof typeof player.equipped];
        if (typeof cardId === 'string' && cardId) {
          state.discardTreasure.push(cardId);
          (player.equipped as any)[effect.slot] = null;
        }
      }
      break;
    }

    case 'APPLY_CURSE': {
      // Lasting curse — add to player's curses
      player.curses.push({
        curseId: effect.curseId,
        cardId: effect.curseId,
      });
      break;
    }
  }
}

export function removeCurse(
  state: GameState,
  playerId: string,
  curseId?: string
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) return [state, []];

  if (curseId) {
    player.curses = player.curses.filter(c => c.curseId !== curseId);
  } else {
    // Remove first curse
    player.curses.shift();
  }

  return [state, []];
}
