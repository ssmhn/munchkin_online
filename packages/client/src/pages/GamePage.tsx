import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/useGameStore';
import { GameWsClient } from '../ws/WsClient';
import { GameBoard } from '../components/GameBoard';
import { SoundToggleButton } from '../components/SoundSettings';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { VoiceChatPanel, dispatchVoiceMessage, isVoiceMessage } from '../components/VoiceChatPanel';
import type { S2C_Message, GameAction } from '@munchkin/shared';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, cardDb, applyFullSync, applyStatePatch, reset } = useGameStore();
  const wsRef = useRef<GameWsClient | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  const sendAction = useCallback((action: GameAction) => {
    if (wsRef.current) {
      wsRef.current.send({ type: 'GAME_ACTION', payload: action });
    }
  }, []);

  const handleLeaveGame = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    reset();
    navigate('/');
  }, [navigate, reset]);

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
      <div
        data-testid="game-loading"
        className="min-h-screen flex flex-col items-center justify-center gap-6"
      >
        <div className="w-12 h-12 border-4 border-munch-border border-t-munch-gold rounded-full animate-spin" />
        <div className="text-munch-gold font-fantasy text-lg">
          Connecting to game...
        </div>
      </div>
    );
  }

  return (
    <div data-testid="game-page" className="relative">
      {/* Top-right controls */}
      <div className="fixed top-3 right-3 z-[1000] flex gap-2 items-center">
        <button
          data-testid="btn-leave-game"
          onClick={() => setShowLeaveConfirm(true)}
          className="py-1.5 px-3.5 text-xs font-semibold text-red-400 bg-red-600/15 border border-red-600/40 rounded-md cursor-pointer transition-colors duration-200"
        >
          Leave Game
        </button>
        <SoundToggleButton />
      </div>

      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div
          data-testid="leave-confirm-overlay"
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]"
        >
          <div className="bg-munch-surface border-2 border-munch-border rounded-xl py-6 px-8 text-center max-w-[340px]">
            <div className="text-base font-bold text-munch-text mb-2 font-fantasy">
              Leave Game?
            </div>
            <div className="text-[13px] text-munch-text-muted mb-5">
              You will disconnect from the game. You can rejoin later if the game is still active.
            </div>
            <div className="flex gap-2.5 justify-center">
              <button
                data-testid="btn-leave-confirm"
                onClick={handleLeaveGame}
                className="py-2 px-5 text-[13px] font-bold text-white bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-800 rounded-md cursor-pointer"
              >
                Leave
              </button>
              <button
                data-testid="btn-leave-cancel"
                onClick={() => setShowLeaveConfirm(false)}
                className="py-2 px-5 text-[13px] font-bold text-munch-text bg-munch-surface-light border-2 border-munch-border rounded-md cursor-pointer"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
      <GameBoard state={state} selfPlayerId={localPlayerId} cardDb={cardDb} onAction={sendAction} />
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
