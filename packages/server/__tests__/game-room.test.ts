import { describe, it, expect } from 'vitest';
import { projectStateForPlayer } from '../src/game/state-projector';
import type { GameState, PlayerState, EquippedItems } from '@munchkin/shared';

function createEquipped(): EquippedItems {
  return { head: null, body: null, feet: null, hand1: null, hand2: null, twoHands: null, extras: [] };
}

function createPlayer(id: string, hand: string[]): PlayerState {
  return {
    id, name: id, level: 1, gender: 'MALE', race: null, classes: [],
    hand, equipped: createEquipped(), carried: [], curses: [], isConnected: true,
  };
}

function createState(): GameState {
  return {
    id: 'game-1', phase: 'KICK_DOOR', turn: 1, activePlayerId: 'p1',
    playerOrder: ['p1', 'p2'],
    players: {
      p1: createPlayer('p1', ['card_a', 'card_b']),
      p2: createPlayer('p2', ['card_c', 'card_d', 'card_e']),
    },
    doorDeck: ['d1', 'd2', 'd3'],
    treasureDeck: ['t1', 't2'],
    discardDoor: [], discardTreasure: [],
    combat: null, pendingActions: [], log: [], winner: null,
  };
}

describe('State Projector', () => {
  it('player sees own hand but not others', () => {
    const state = createState();
    const projected = projectStateForPlayer(state, 'p1');

    // Own hand is visible
    expect(projected.players['p1'].hand).toEqual(['card_a', 'card_b']);

    // Other player's hand is hidden
    expect(projected.players['p2'].hand).toEqual(['HIDDEN', 'HIDDEN', 'HIDDEN']);
    expect(projected.players['p2'].hand).toHaveLength(3);
  });

  it('decks are hidden', () => {
    const state = createState();
    const projected = projectStateForPlayer(state, 'p1');

    expect(projected.doorDeck).toEqual(['HIDDEN', 'HIDDEN', 'HIDDEN']);
    expect(projected.treasureDeck).toEqual(['HIDDEN', 'HIDDEN']);
  });

  it('each player gets different projection', () => {
    const state = createState();
    const p1View = projectStateForPlayer(state, 'p1');
    const p2View = projectStateForPlayer(state, 'p2');

    // p1 sees own hand, p2 sees own hand
    expect(p1View.players['p1'].hand).toEqual(['card_a', 'card_b']);
    expect(p1View.players['p2'].hand).toEqual(['HIDDEN', 'HIDDEN', 'HIDDEN']);

    expect(p2View.players['p2'].hand).toEqual(['card_c', 'card_d', 'card_e']);
    expect(p2View.players['p1'].hand).toEqual(['HIDDEN', 'HIDDEN']);
  });
});
