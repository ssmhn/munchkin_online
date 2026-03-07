import type { GameState, CardId } from '@munchkin/shared';
import { GameRuleError } from './errors';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawCard(state: GameState, deck: 'DOOR' | 'TREASURE'): [GameState, CardId] {
  const deckKey = deck === 'DOOR' ? 'doorDeck' : 'treasureDeck';
  const discardKey = deck === 'DOOR' ? 'discardDoor' : 'discardTreasure';

  let s = state;
  if (s[deckKey].length === 0) {
    const reshuffled = shuffle([...s[discardKey]]);
    s = { ...s, [deckKey]: reshuffled, [discardKey]: [] };
  }

  if (s[deckKey].length === 0) {
    throw new GameRuleError(`Deck ${deck} and discard are both empty`);
  }

  const [cardId, ...rest] = s[deckKey];
  return [{ ...s, [deckKey]: rest }, cardId];
}

export function discardCard(state: GameState, cardId: CardId, deck: 'DOOR' | 'TREASURE'): GameState {
  const discardKey = deck === 'DOOR' ? 'discardDoor' : 'discardTreasure';
  return { ...state, [discardKey]: [cardId, ...state[discardKey]] };
}
