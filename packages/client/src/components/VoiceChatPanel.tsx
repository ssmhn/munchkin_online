import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useVoiceChatStore, VoiceChatManager } from '../hooks/useVoiceChat';
import type { GameWsClient } from '../ws/WsClient';
import type { S2C_Message } from '@munchkin/shared';

interface PlayerInfo {
  id: string;
  name: string;
}

interface Props {
  wsClient: GameWsClient;
  localPlayerId: string;
  players: PlayerInfo[];
}

export function VoiceChatPanel({ wsClient, localPlayerId, players }: Props) {
  const managerRef = useRef<VoiceChatManager | null>(null);
  const { muted, active, speakingPlayers, remoteMuteState, error } = useVoiceChatStore();

  useEffect(() => {
    const manager = new VoiceChatManager();
    managerRef.current = manager;
    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  const handleJoinVoice = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    await manager.init(wsClient, localPlayerId);
    for (const player of players) {
      if (player.id !== localPlayerId) {
        manager.connectToPeer(player.id);
      }
    }
  }, [wsClient, localPlayerId, players]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<S2C_Message>).detail;
      manager.handleMessage(detail);
    };
    window.addEventListener('voice-message', handler);
    return () => {
      window.removeEventListener('voice-message', handler);
    };
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !active) return;
    for (const player of players) {
      if (
        player.id !== localPlayerId &&
        !manager.connectedPeerIds.includes(player.id)
      ) {
        manager.connectToPeer(player.id);
      }
    }
  }, [players, active, localPlayerId]);

  const handleToggleMute = useCallback(() => {
    managerRef.current?.toggleMute();
  }, []);

  if (!active) {
    return (
      <div className="fixed bottom-4 right-4 w-[220px] bg-munch-surface rounded-lg border border-munch-gold/30 p-3 z-[1000] font-fantasy text-munch-text shadow-[0_4px_24px_rgba(0,0,0,0.5)]" data-testid="voice-chat-panel">
        <button
          onClick={handleJoinVoice}
          className="w-full px-4 py-2.5 bg-munch-gold text-munch-bg border-none rounded-lg font-fantasy font-bold text-[13px] cursor-pointer tracking-wide"
          data-testid="voice-join-btn"
        >
          Join Voice Chat
        </button>
        {error && (
          <div className="mt-2 px-2 py-1.5 bg-red-600/15 border border-red-600/30 rounded-md text-[11px] text-red-400" data-testid="voice-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[220px] bg-munch-surface rounded-lg border border-munch-gold/30 p-3 z-[1000] font-fantasy text-munch-text shadow-[0_4px_24px_rgba(0,0,0,0.5)]" data-testid="voice-chat-panel">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
        <span className="text-[13px] font-bold tracking-wide text-munch-gold">Voice Chat</span>
        <MuteButton muted={muted} onClick={handleToggleMute} />
      </div>

      <div className="flex flex-col gap-1">
        {players.map((player) => {
          const isSelf = player.id === localPlayerId;
          const isSpeaking = speakingPlayers.has(player.id);
          const isPlayerMuted = isSelf ? muted : remoteMuteState[player.id] ?? true;
          return (
            <VoicePlayerRow
              key={player.id}
              name={player.name}
              isSelf={isSelf}
              isSpeaking={isSpeaking}
              isMuted={isPlayerMuted}
            />
          );
        })}
      </div>

      {error && (
        <div className="mt-2 px-2 py-1.5 bg-red-600/15 border border-red-600/30 rounded-md text-[11px] text-red-400" data-testid="voice-error">
          {error}
        </div>
      )}
    </div>
  );
}

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, { scale: 1.1, duration: 0.15, ease: 'power2.out' });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, { scale: 1, duration: 0.15, ease: 'power2.out' });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="voice-mute-btn"
      title={muted ? 'Unmute microphone' : 'Mute microphone'}
      aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
      className={`flex items-center justify-center w-8 h-8 rounded-full border-none cursor-pointer p-0 ${
        muted ? 'bg-munch-danger text-munch-text' : 'bg-munch-gold text-munch-bg'
      }`}
    >
      {muted ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}

function VoicePlayerRow({
  name,
  isSelf,
  isSpeaking,
  isMuted,
}: {
  name: string;
  isSelf: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const prevSpeaking = useRef(false);

  useEffect(() => {
    if (!dotRef.current) return;
    if (isSpeaking && !prevSpeaking.current) {
      gsap.to(dotRef.current, {
        scale: 1.4,
        boxShadow: '0 0 8px rgba(74, 222, 128, 0.8)',
        duration: 0.2,
        ease: 'power2.out',
        yoyo: true,
        repeat: -1,
      });
    } else if (!isSpeaking && prevSpeaking.current) {
      gsap.killTweensOf(dotRef.current);
      gsap.to(dotRef.current, {
        scale: 1,
        boxShadow: 'none',
        duration: 0.2,
        ease: 'power2.out',
      });
    }
    prevSpeaking.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!rowRef.current) return;
    if (isSpeaking) {
      gsap.to(rowRef.current, { borderColor: '#4ade80', duration: 0.2, ease: 'power2.out' });
    } else {
      gsap.to(rowRef.current, { borderColor: 'transparent', duration: 0.3, ease: 'power2.out' });
    }
  }, [isSpeaking]);

  return (
    <div
      ref={rowRef}
      data-testid={`voice-player-${name}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent transition-opacity duration-200 ${
        isMuted ? 'opacity-50' : ''
      }`}
    >
      <div
        ref={dotRef}
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: isSpeaking ? '#4ade80' : isMuted ? '#666' : '#888' }}
      />
      <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">
        {name}
        {isSelf && <span className="text-munch-gold text-[11px]"> (You)</span>}
      </span>
      {isMuted && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#888"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-auto shrink-0"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </div>
  );
}

export function dispatchVoiceMessage(msg: S2C_Message): void {
  window.dispatchEvent(new CustomEvent('voice-message', { detail: msg }));
}

export function isVoiceMessage(msg: S2C_Message): boolean {
  return (
    msg.type === 'VOICE_OFFER' ||
    msg.type === 'VOICE_ANSWER' ||
    msg.type === 'VOICE_ICE_CANDIDATE' ||
    msg.type === 'VOICE_STATE'
  );
}
