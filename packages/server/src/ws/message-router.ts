import type { C2S_Message, S2C_Message } from '@munchkin/shared';
import type { WsClient } from './ws-client';

export interface GameRoomHandler {
  handleAction(client: WsClient, message: C2S_Message): void;
}

export class MessageRouter {
  private handler: GameRoomHandler | null = null;

  setHandler(handler: GameRoomHandler): void {
    this.handler = handler;
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
