import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { useSoundStore } from '../stores/useSoundStore';
import type { GameEvent } from '@munchkin/shared';
import {
  playDoorKick,
  playCardFlip,
  playEquipItem,
  playSwordClash,
  playVictoryFanfare,
  playDefeatRumble,
  playRunAway,
  playBadStuff,
  playLevelUp,
  playLevelDown,
  playDrawCard,
  playCardDiscard,
  playItemsSold,
  playHelperJoined,
  playCurseDarkTone,
  playMonsterCloned,
  playTurnEnd,
  playGameWin,
  playDiceRoll,
} from '../audio/SoundEngine';

function playSoundForEvent(event: GameEvent) {
  switch (event.type) {
    case 'CARD_REVEALED':
      playDoorKick();
      break;
    case 'CARD_PLAYED':
      playCardFlip();
      break;
    case 'ITEM_EQUIPPED':
      playEquipItem();
      break;
    case 'COMBAT_STARTED':
      playSwordClash();
      break;
    case 'COMBAT_WON':
      playVictoryFanfare();
      break;
    case 'COMBAT_LOST':
      playDefeatRumble();
      break;
    case 'RUN_ATTEMPTED':
      playDiceRoll();
      // Add run sound after dice
      setTimeout(() => playRunAway(), 350);
      break;
    case 'BAD_STUFF_APPLIED':
      playBadStuff();
      break;
    case 'LEVEL_CHANGED':
      if (event.newLevel > event.oldLevel) {
        playLevelUp();
      } else {
        playLevelDown();
      }
      break;
    case 'CARDS_DRAWN':
      playDrawCard();
      break;
    case 'CARD_DISCARDED':
      playCardDiscard();
      break;
    case 'ITEMS_SOLD':
      playItemsSold();
      break;
    case 'HELPER_JOINED':
      playHelperJoined();
      break;
    case 'CURSE_APPLIED':
      playCurseDarkTone();
      break;
    case 'MONSTER_CLONED':
      playMonsterCloned();
      break;
    case 'TURN_ENDED':
      playTurnEnd();
      break;
    case 'GAME_WON':
      playGameWin();
      break;
  }
}

/**
 * Hook that watches game events from the store and plays corresponding sounds.
 * Place this once in your GamePage or top-level game component.
 */
export function useSoundEffects() {
  const processedCount = useRef(0);

  useEffect(() => {
    const unsub = useGameStore.subscribe((curr, prev) => {
      const events = curr.events;
      if (events.length <= processedCount.current) {
        // Events were reset (new game / full sync), reset counter
        if (events.length < processedCount.current) {
          processedCount.current = events.length;
        }
        return;
      }

      const { enabled, muted } = useSoundStore.getState();
      if (!enabled || muted) {
        processedCount.current = events.length;
        return;
      }

      const newEvents = events.slice(processedCount.current);
      processedCount.current = events.length;

      for (const event of newEvents) {
        playSoundForEvent(event);
      }
    });

    return unsub;
  }, []);
}
