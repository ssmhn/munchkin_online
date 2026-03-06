import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore';
import { GameWsClient } from '../ws/WsClient';
import { GameBoard } from '../components/GameBoard';
import type { S2C_Message } from '@munchkin/shared';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, applyFullSync, applyStatePatch } = useGameStore();
  const wsRef = useRef<GameWsClient | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const token = sessionStorage.getItem('token');
    if (!token) return;

    const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/${roomId}?token=${token}`;

    const handler = (msg: S2C_Message) => {
      console.log('[WS]', msg.type, msg);
      switch (msg.type) {
        case 'FULL_SYNC':
          applyFullSync(msg.payload.gameState, msg.payload.cardDb);
          break;
        case 'STATE_PATCH':
          applyStatePatch(msg.payload.patch, msg.payload.events);
          break;
        default:
          break;
      }
    };

    const client = new GameWsClient(wsUrl, handler);
    client.connect();
    wsRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [roomId]);

  if (!state) {
    return (
      <div data-testid="game-loading">
        Connecting to game {roomId}...
      </div>
    );
  }

  return (
    <div data-testid="game-page">
      <GameBoard state={state} />
    </div>
  );
}
