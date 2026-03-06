import type { GameState } from '@munchkin/shared';

const HIDDEN = 'HIDDEN';

export function projectStateForPlayer(state: GameState, playerId: string): GameState {
  const projected: GameState = {
    ...state,
    players: {},
    doorDeck: Array(state.doorDeck.length).fill(HIDDEN),
    treasureDeck: Array(state.treasureDeck.length).fill(HIDDEN),
  };

  for (const [id, player] of Object.entries(state.players)) {
    if (id === playerId) {
      projected.players[id] = { ...player };
    } else {
      projected.players[id] = {
        ...player,
        hand: Array(player.hand.length).fill(HIDDEN),
      };
    }
  }

  return projected;
}
