import type WebSocket from 'ws';
import type { S2C_Message } from '@munchkin/shared';

export class WsClient {
  readonly playerId: string;
  readonly roomId: string;
  private ws: WebSocket;
  isAlive: boolean = true;

  constructor(ws: WebSocket, playerId: string, roomId: string) {
    this.ws = ws;
    this.playerId = playerId;
    this.roomId = roomId;

    ws.on('pong', () => {
      this.isAlive = true;
    });
  }

  send(message: S2C_Message): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  ping(): void {
    this.isAlive = false;
    this.ws.ping();
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  get readyState(): number {
    return this.ws.readyState;
  }
}
