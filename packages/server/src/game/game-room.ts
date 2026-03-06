import type { GameState } from '@munchkin/shared';
import type { GameAction, GameEvent, C2S_Message } from '@munchkin/shared';
import type { CardDb } from '@munchkin/shared';
import { applyAction, InvalidActionError } from '@munchkin/game-engine';
import type { RedisGameStore } from '../store/redis-game-store';
import type { WsClient } from '../ws/ws-client';
import type { GameRoomHandler } from '../ws/message-router';
import { projectStateForPlayer } from './state-projector';
import { validateActionServer, ValidationError } from './action-validator';

export class GameRoom implements GameRoomHandler {
  readonly roomId: string;
  private store: RedisGameStore;
  private cardDb: CardDb;
  private clients: Map<string, WsClient> = new Map();

  constructor(roomId: string, store: RedisGameStore, cardDb: CardDb) {
    this.roomId = roomId;
    this.store = store;
    this.cardDb = cardDb;
  }

  addClient(client: WsClient): void {
    this.clients.set(client.playerId, client);
  }

  removeClient(playerId: string): void {
    this.clients.delete(playerId);
  }

  async handleAction(client: WsClient, message: C2S_Message): Promise<void> {
    if (message.type === 'PING') {
      client.send({ type: 'PONG' });
      return;
    }

    if (message.type !== 'GAME_ACTION') {
      client.send({
        type: 'ERROR',
        payload: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${message.type}` },
      });
      return;
    }

    // playerId ALWAYS comes from JWT (via WsClient), never from action payload
    const action = message.payload;
    const stored = await this.store.getState(this.roomId);
    if (!stored) {
      client.send({
        type: 'ERROR',
        payload: { code: 'NO_GAME', message: 'Game not found' },
      });
      return;
    }

    // Server-side validation: card ownership, dice range, trade cards
    try {
      validateActionServer(stored.state, action, client.playerId);
    } catch (err) {
      if (err instanceof ValidationError) {
        client.send({
          type: 'ERROR',
          payload: { code: err.code, message: err.message },
        });
        return;
      }
      throw err;
    }

    let result;
    try {
      result = applyAction(stored.state, action, client.playerId, this.cardDb);
    } catch (err) {
      if (err instanceof InvalidActionError) {
        client.send({
          type: 'ERROR',
          payload: { code: 'INVALID_ACTION', message: err.message },
        });
        return;
      }
      throw err;
    }

    const success = await this.store.compareAndSet(this.roomId, stored.version, result.state);
    if (!success) {
      // Race condition — re-sync client
      const latest = await this.store.getState(this.roomId);
      if (latest) {
        const projected = projectStateForPlayer(latest.state, client.playerId);
        client.send({
          type: 'FULL_SYNC',
          payload: { gameState: projected, cardDb: this.cardDb },
        });
      }
      return;
    }

    // Broadcast projected state to each client
    this.broadcastState(result.state, result.events);
  }

  broadcastState(state: GameState, events: GameEvent[]): void {
    for (const [playerId, client] of this.clients) {
      const projected = projectStateForPlayer(state, playerId);
      client.send({
        type: 'FULL_SYNC',
        payload: { gameState: projected, cardDb: this.cardDb },
      });
    }
  }
}
