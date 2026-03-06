import { describe, it, expect } from 'vitest';
import { handleOfferHelp, handleAcceptHelp, handleDeclineHelp, handleCounterOffer } from '../src/negotiation';
import { createGameState, createPlayer } from './test-helpers';
import type { CombatState } from '@munchkin/shared';

function createCombatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    phase: 'ACTIVE',
    monsters: [{ cardId: 'monster_orc', modifiers: [], instanceId: 'inst-1' }],
    activePlayerId: 'p1',
    helpers: [],
    appliedCards: [],
    reactionWindow: null,
    helpOffer: null,
    runAttempts: 0,
    resolved: false,
    ...overrides,
  };
}

describe('Help Negotiation', () => {
  it('OFFER_HELP creates a help offer and sets phase to NEGOTIATION', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['treasure_1', 'treasure_2'] }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: createCombatState(),
    });

    const [next] = handleOfferHelp(
      state,
      { type: 'OFFER_HELP', targetPlayerId: 'p2', rewardCardIds: ['treasure_1'] },
      'p1'
    );

    expect(next.combat!.phase).toBe('NEGOTIATION');
    expect(next.combat!.helpOffer).toEqual({
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      rewardCardIds: ['treasure_1'],
    });
  });

  it('ACCEPT_HELP adds helper to combat and returns to ACTIVE phase', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['treasure_1'] }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: createCombatState({
        phase: 'NEGOTIATION',
        helpOffer: { fromPlayerId: 'p1', toPlayerId: 'p2', rewardCardIds: ['treasure_1'] },
      }),
    });

    const [next, events] = handleAcceptHelp(state, 'p2');

    expect(next.combat!.helpers).toHaveLength(1);
    expect(next.combat!.helpers[0]).toEqual({ playerId: 'p2', agreedReward: ['treasure_1'] });
    expect(next.combat!.phase).toBe('ACTIVE');
    expect(next.combat!.helpOffer).toBeNull();
    expect(events.some(e => e.type === 'HELPER_JOINED')).toBe(true);
  });

  it('DECLINE_HELP clears offer and returns to ACTIVE phase', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1' }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: createCombatState({
        phase: 'NEGOTIATION',
        helpOffer: { fromPlayerId: 'p1', toPlayerId: 'p2', rewardCardIds: [] },
      }),
    });

    const [next] = handleDeclineHelp(state, 'p2');

    expect(next.combat!.helpOffer).toBeNull();
    expect(next.combat!.phase).toBe('ACTIVE');
    expect(next.combat!.helpers).toHaveLength(0);
  });

  it('COUNTER_OFFER swaps direction and updates reward', () => {
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['treasure_1'] }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: createCombatState({
        phase: 'NEGOTIATION',
        helpOffer: { fromPlayerId: 'p1', toPlayerId: 'p2', rewardCardIds: ['treasure_1'] },
      }),
    });

    const [next] = handleCounterOffer(
      state,
      { type: 'COUNTER_OFFER', rewardCardIds: ['treasure_1', 'treasure_2'] },
      'p2'
    );

    expect(next.combat!.helpOffer!.fromPlayerId).toBe('p2');
    expect(next.combat!.helpOffer!.toPlayerId).toBe('p1');
    expect(next.combat!.helpOffer!.rewardCardIds).toEqual(['treasure_1', 'treasure_2']);
  });

  it('victory distributes agreed reward to helper', () => {
    // This is tested in combat-resolution.test.ts already (helpers get agreedReward)
    // Here we verify the full flow: offer → accept → helper has correct agreedReward
    const state = createGameState({
      phase: 'COMBAT',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['treasure_1'] }),
        p2: createPlayer({ id: 'p2' }),
      },
      combat: createCombatState({
        phase: 'NEGOTIATION',
        helpOffer: { fromPlayerId: 'p1', toPlayerId: 'p2', rewardCardIds: ['treasure_1'] },
      }),
    });

    const [next] = handleAcceptHelp(state, 'p2');
    expect(next.combat!.helpers[0].agreedReward).toEqual(['treasure_1']);
  });
});
