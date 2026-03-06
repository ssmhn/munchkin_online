import type { GameState } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import type { WsClient } from '../ws/ws-client';
import { projectStateForPlayer } from './state-projector';
import type { CardDb } from '@munchkin/shared';

export function handleReconnect(
  client: WsClient,
  state: GameState,
  cardDb: CardDb,
  clients: Map<string, WsClient>
): void {
  // Mark player as connected
  const player = state.players[client.playerId];
  if (player) {
    player.isConnected = true;
  }

  // Send FULL_SYNC to reconnected player
  const projected = projectStateForPlayer(state, client.playerId);
  client.send({
    type: 'FULL_SYNC',
    payload: { gameState: projected, cardDb },
  });

  // Notify other players
  for (const [id, other] of clients) {
    if (id !== client.playerId) {
      other.send({
        type: 'PLAYER_RECONNECTED',
        payload: { playerId: client.playerId },
      });
    }
  }
}

export function handleDisconnect(
  playerId: string,
  state: GameState,
  clients: Map<string, WsClient>
): void {
  const player = state.players[playerId];
  if (player) {
    player.isConnected = false;
  }

  // Notify remaining players
  for (const [id, client] of clients) {
    if (id !== playerId) {
      client.send({
        type: 'PLAYER_LEFT',
        payload: { playerId },
      });
    }
  }
}

export function applyDisconnectedTimeout(
  state: GameState,
  playerId: string,
  timeoutMs: number = 30000
): GameState {
  // Auto-pass for reaction windows if player is disconnected
  if (state.combat?.reactionWindow) {
    const response = state.combat.reactionWindow.responses[playerId];
    if (response && !response.passed && !response.cardId) {
      response.passed = true;
    }
  }

  // Auto-resolve pending actions for disconnected player
  state.pendingActions = state.pendingActions.filter(pa => pa.playerId !== playerId);

  return state;
}
