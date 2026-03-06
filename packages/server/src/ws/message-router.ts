import type { C2S_Message, S2C_Message } from '@munchkin/shared';
import type { WsClient } from './ws-client';

export interface GameRoomHandler {
  handleAction(client: WsClient, message: C2S_Message): void;
}

export class MessageRouter {
  private handler: GameRoomHandler | null = null;
  /** All connected clients, keyed by playerId */
  private clients: Map<string, WsClient> = new Map();

  setHandler(handler: GameRoomHandler): void {
    this.handler = handler;
  }

  registerClient(client: WsClient): void {
    this.clients.set(client.playerId, client);
  }

  unregisterClient(playerId: string): void {
    this.clients.delete(playerId);
  }

  route(client: WsClient, raw: string): void {
    let parsed: C2S_Message;
    try {
      parsed = JSON.parse(raw);
    } catch {
      client.send({
        type: 'ERROR',
        payload: { code: 'INVALID_JSON', message: 'Invalid JSON' },
      });
      return;
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      client.send({
        type: 'ERROR',
        payload: { code: 'INVALID_MESSAGE', message: 'Missing message type' },
      });
      return;
    }

    if (parsed.type === 'PING') {
      client.send({ type: 'PONG' });
      return;
    }

    // --- Voice signaling relay ---
    if (parsed.type === 'VOICE_OFFER') {
      const target = this.clients.get(parsed.payload.targetPlayerId);
      if (target) {
        target.send({
          type: 'VOICE_OFFER',
          payload: {
            targetPlayerId: parsed.payload.targetPlayerId,
            sdp: parsed.payload.sdp,
            fromPlayerId: client.playerId,
          },
        });
      }
      return;
    }

    if (parsed.type === 'VOICE_ANSWER') {
      const target = this.clients.get(parsed.payload.targetPlayerId);
      if (target) {
        target.send({
          type: 'VOICE_ANSWER',
          payload: {
            targetPlayerId: parsed.payload.targetPlayerId,
            sdp: parsed.payload.sdp,
            fromPlayerId: client.playerId,
          },
        });
      }
      return;
    }

    if (parsed.type === 'VOICE_ICE_CANDIDATE') {
      const target = this.clients.get(parsed.payload.targetPlayerId);
      if (target) {
        target.send({
          type: 'VOICE_ICE_CANDIDATE',
          payload: {
            targetPlayerId: parsed.payload.targetPlayerId,
            candidate: parsed.payload.candidate,
            sdpMid: parsed.payload.sdpMid,
            sdpMLineIndex: parsed.payload.sdpMLineIndex,
            fromPlayerId: client.playerId,
          },
        });
      }
      return;
    }

    if (parsed.type === 'VOICE_STATE') {
      // Broadcast mute/unmute state to all other clients in the same room
      for (const [playerId, target] of this.clients) {
        if (playerId !== client.playerId && target.roomId === client.roomId) {
          target.send({
            type: 'VOICE_STATE',
            payload: {
              muted: parsed.payload.muted,
              playerId: client.playerId,
            },
          });
        }
      }
      return;
    }

    if (!this.handler) {
      client.send({
        type: 'ERROR',
        payload: { code: 'NO_HANDLER', message: 'No game room handler' },
      });
      return;
    }

    this.handler.handleAction(client, parsed);
  }
}
