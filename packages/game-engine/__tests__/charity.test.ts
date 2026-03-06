import { describe, it, expect } from 'vitest';
import { applyAction } from '../src/engine';
import { handleCharityDiscard } from '../src/charity';
import { createGameState, createPlayer } from './test-helpers';

describe('Charity Phase', () => {
  it('7 cards in hand → END_TURN transitions to CHARITY, not next turn', () => {
    const state = createGameState({
      phase: 'LOOT_ROOM',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const result = applyAction(state, { type: 'END_TURN' }, 'p1');
    expect(result.state.phase).toBe('CHARITY');
    expect(result.state.activePlayerId).toBe('p1');
  });

  it('give 2 cards to lowest-level player during charity', () => {
    const state = createGameState({
      phase: 'CHARITY',
      players: {
        p1: createPlayer({ id: 'p1', level: 5, hand: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] }),
        p2: createPlayer({ id: 'p2', level: 2 }),
      },
    });

    const [next, events] = handleCharityDiscard(state, 'p1', ['c6', 'c7']);

    expect(next.players['p1'].hand).toHaveLength(5);
    expect(next.players['p2'].hand).toContain('c6');
    expect(next.players['p2'].hand).toContain('c7');
    expect(events).toHaveLength(2);
  });

  it('5 cards in hand → END_TURN moves to next player immediately', () => {
    const state = createGameState({
      phase: 'LOOT_ROOM',
      players: {
        p1: createPlayer({ id: 'p1', hand: ['c1', 'c2', 'c3', 'c4', 'c5'] }),
        p2: createPlayer({ id: 'p2' }),
      },
    });

    const result = applyAction(state, { type: 'END_TURN' }, 'p1');
    expect(result.state.phase).toBe('KICK_DOOR');
    expect(result.state.activePlayerId).toBe('p2');
  });
});
