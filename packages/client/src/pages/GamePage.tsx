import React, { useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore';
import { GameWsClient } from '../ws/WsClient';
import { GameBoard } from '../components/GameBoard';
import { SoundToggleButton } from '../components/SoundSettings';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { VoiceChatPanel, dispatchVoiceMessage, isVoiceMessage } from '../components/VoiceChatPanel';
import type { S2C_Message } from '@munchkin/shared';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, applyFullSync, applyStatePatch } = useGameStore();
  const wsRef = useRef<GameWsClient | null>(null);

  // Activate sound effects that react to game events
  useSoundEffects();

  useEffect(() => {
    if (!roomId) return;

    const token = sessionStorage.getItem('token');
    if (!token) return;

    const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/${roomId}?token=${token}`;

    const handler = (msg: S2C_Message) => {
      console.log('[WS]', msg.type, msg);

      // Route voice signaling messages to the VoiceChatPanel
      if (isVoiceMessage(msg)) {
        dispatchVoiceMessage(msg);
        return;
      }

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

  // Derive the local player ID from the JWT token stored in session
  const localPlayerId = useMemo(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.playerId || '';
    } catch {
      return '';
    }
  }, []);

  // Build the players list for the voice panel from game state
  const players = useMemo(() => {
    if (!state) return [];
    return state.playerOrder.map((id) => ({
      id,
      name: state.players[id]?.name ?? id,
    }));
  }, [state]);

  if (!state) {
    return (
      <div data-testid="game-loading">
        Connecting to game {roomId}...
      </div>
    );
  }

  return (
    <div data-testid="game-page" style={{ position: 'relative' }}>
      <div
        style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 1000,
        }}
      >
        <SoundToggleButton />
      </div>
      <GameBoard state={state} />
      {wsRef.current && localPlayerId && (
        <VoiceChatPanel
          wsClient={wsRef.current}
          localPlayerId={localPlayerId}
          players={players}
        />
      )}
    </div>
  );
}
