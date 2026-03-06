import type { GameState, PlayerState, EquippedItems } from '@munchkin/shared';

export function createDefaultEquipped(): EquippedItems {
  return {
    head: null,
    body: null,
    feet: null,
    leftHand: null,
    rightHand: null,
    twoHands: null,
    extras: [],
  };
}

export function getNextPlayer(state: GameState): string {
  const idx = state.playerOrder.indexOf(state.activePlayerId);
  const nextIdx = (idx + 1) % state.playerOrder.length;
  return state.playerOrder[nextIdx];
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
