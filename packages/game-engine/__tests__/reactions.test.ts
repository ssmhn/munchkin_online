import { describe, it, expect } from 'vitest';
import {
  openReactionWindow,
  handleReactionPass,
  handleReactionPlayCard,
  isReactionWindowOpen,
} from '../src/reactions';
import { createGameState, createPlayer } from './test-helpers';

function createCombatState() {
  return createGameState({
    phase: 'COMBAT',
    players: {
      p1: createPlayer({ id: 'p1', hand: ['card_a', 'card_b'] }),
      p2: createPlayer({ id: 'p2', hand: ['card_c', 'card_d'] }),
      p3: createPlayer({ id: 'p3', hand: ['card_e'] }),
    },
    playerOrder: ['p1', 'p2', 'p3'],
    combat: {
      phase: 'ACTIVE',
      monsters: [{ cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' }],
      activePlayerId: 'p1',
      helpers: [],
      appliedCards: [],
      reactionWindow: null,
      helpOffer: null,
      runAttempts: 0,
      resolved: false,
    },
  });
}

describe('Reaction Window', () => {
  it('opens reaction window with DOOR_OPENED trigger', () => {
    const state = createCombatState();
    const trigger = { type: 'DOOR_OPENED' as const, cardId: 'monster_orc' };

    const [next] = openReactionWindow(state, trigger);

    expect(next.combat!.reactionWindow).not.toBeNull();
    expect(next.combat!.reactionWindow!.trigger.type).toBe('DOOR_OPENED');
    expect(next.combat!.phase).toBe('REACTION_WINDOW');
    expect(isReactionWindowOpen(next)).toBe(true);
  });

  it('all 3 players pass → window closes, combat becomes ACTIVE', () => {
    const state = createCombatState();
    const trigger = { type: 'COMBAT_STARTED' as const, monsterId: 'monster_orc' };
    const [s1] = openReactionWindow(state, trigger);

    const [s2] = handleReactionPass(s1, 'p1');
    expect(isReactionWindowOpen(s2)).toBe(true);

    const [s3] = handleReactionPass(s2, 'p2');
    expect(isReactionWindowOpen(s3)).toBe(true);

    const [s4] = handleReactionPass(s3, 'p3');
    expect(isReactionWindowOpen(s4)).toBe(false);
    expect(s4.combat!.phase).toBe('ACTIVE');
  });

  it('stack resolves in reverse order: p3 card, then p2 card', () => {
    const state = createCombatState();
    const trigger = { type: 'COMBAT_STARTED' as const, monsterId: 'monster_orc' };
    const [s1] = openReactionWindow(state, trigger);

    // p1 passes
    const [s2] = handleReactionPass(s1, 'p1');

    // p2 plays a card
    const [s3] = handleReactionPlayCard(s2, 'p2', 'card_c');
    expect(s3.players['p2'].hand).not.toContain('card_c');

    // p3 plays a card
    const [s4, events] = handleReactionPlayCard(s3, 'p3', 'card_e');

    // Window should be closed
    expect(isReactionWindowOpen(s4)).toBe(false);

    // Stack resolved in reverse order
    expect(s4.combat!.appliedCards).toHaveLength(2);
    // First applied = last played (p3's card)
    expect(s4.combat!.appliedCards[0].cardId).toBe('card_e');
    expect(s4.combat!.appliedCards[0].playerId).toBe('p3');
    // Second applied = first played (p2's card)
    expect(s4.combat!.appliedCards[1].cardId).toBe('card_c');
    expect(s4.combat!.appliedCards[1].playerId).toBe('p2');
  });
});
