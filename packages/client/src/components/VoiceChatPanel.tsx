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
  /** All players in the game room (including self) */
  players: PlayerInfo[];
}

export function VoiceChatPanel({ wsClient, localPlayerId, players }: Props) {
  const managerRef = useRef<VoiceChatManager | null>(null);
  const { muted, active, speakingPlayers, remoteMuteState, error } = useVoiceChatStore();

  // Initialize manager once
  useEffect(() => {
    const manager = new VoiceChatManager();
    managerRef.current = manager;

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  // Start voice chat
  const handleJoinVoice = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    await manager.init(wsClient, localPlayerId);

    // Connect to all other players in the room
    for (const player of players) {
      if (player.id !== localPlayerId) {
        manager.connectToPeer(player.id);
      }
    }
  }, [wsClient, localPlayerId, players]);

  // Handle incoming voice messages - attach to wsClient message flow
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // We use a message interceptor pattern: the caller should route voice
    // messages to us. We provide a static method instead.
    // But since GamePage controls the handler, we expose handleMessage
    // through a ref or a global registration.
    //
    // The simplest approach: store the manager on the wsClient for the
    // GamePage to call. We use a custom event approach instead.

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<S2C_Message>).detail;
      manager.handleMessage(detail);
    };

    window.addEventListener('voice-message', handler);

    return () => {
      window.removeEventListener('voice-message', handler);
    };
  }, []);

  // When new players join, connect to them
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

  // Not yet joined voice
  if (!active) {
    return (
      <div style={styles.container} data-testid="voice-chat-panel">
        <button
          onClick={handleJoinVoice}
          style={styles.joinButton}
          data-testid="voice-join-btn"
        >
          Join Voice Chat
        </button>
        {error && (
          <div style={styles.error} data-testid="voice-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="voice-chat-panel">
      <div style={styles.header}>
        <span style={styles.headerLabel}>Voice Chat</span>
        <MuteButton muted={muted} onClick={handleToggleMute} />
      </div>

      <div style={styles.playerList}>
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
        <div style={styles.error} data-testid="voice-error">
          {error}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1.1,
      duration: 0.15,
      ease: 'power2.out',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1,
      duration: 0.15,
      ease: 'power2.out',
    });
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
      style={{
        ...styles.muteButton,
        background: muted ? 'var(--color-danger, #dc2626)' : 'var(--color-gold, #c9a84c)',
        color: muted ? 'var(--color-text, #fff)' : 'var(--color-bg, #0f0f23)',
      }}
    >
      {muted ? (
        // Muted mic icon (SVG)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ) : (
        // Active mic icon (SVG)
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
      // Start speaking pulse animation
      gsap.to(dotRef.current, {
        scale: 1.4,
        boxShadow: '0 0 8px rgba(74, 222, 128, 0.8)',
        duration: 0.2,
        ease: 'power2.out',
        yoyo: true,
        repeat: -1,
      });
    } else if (!isSpeaking && prevSpeaking.current) {
      // Stop speaking animation
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

  // Speaking glow on the row
  useEffect(() => {
    if (!rowRef.current) return;

    if (isSpeaking) {
      gsap.to(rowRef.current, {
        borderColor: '#4ade80',
        duration: 0.2,
        ease: 'power2.out',
      });
    } else {
      gsap.to(rowRef.current, {
        borderColor: 'transparent',
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [isSpeaking]);

  return (
    <div
      ref={rowRef}
      data-testid={`voice-player-${name}`}
      style={{
        ...styles.playerRow,
        opacity: isMuted ? 0.5 : 1,
      }}
    >
      {/* Speaking indicator dot */}
      <div
        ref={dotRef}
        style={{
          ...styles.speakingDot,
          background: isSpeaking ? '#4ade80' : isMuted ? '#666' : '#888',
        }}
      />

      <span style={styles.playerName}>
        {name}
        {isSelf && <span style={styles.selfTag}> (You)</span>}
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
          style={{ marginLeft: 'auto', flexShrink: 0 }}
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

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    width: 220,
    background: 'var(--color-surface, #1a1a2e)',
    borderRadius: 'var(--radius-md, 8px)',
    border: '1px solid rgba(201, 168, 76, 0.3)',
    padding: 12,
    zIndex: 1000,
    fontFamily: 'var(--font-fantasy, inherit)',
    color: 'var(--color-text, #e0e0e0)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: 'var(--color-gold, #c9a84c)',
  },
  muteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  joinButton: {
    width: '100%',
    padding: '10px 16px',
    background: 'var(--color-gold, #c9a84c)',
    color: 'var(--color-bg, #0f0f23)',
    border: 'none',
    borderRadius: 'var(--radius-md, 8px)',
    fontFamily: 'var(--font-fantasy, inherit)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 'var(--radius-md, 6px)',
    border: '1px solid transparent',
    transition: 'opacity 0.2s',
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  selfTag: {
    color: 'var(--color-gold, #c9a84c)',
    fontSize: 11,
  },
  error: {
    marginTop: 8,
    padding: '6px 8px',
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: 'var(--radius-md, 6px)',
    fontSize: 11,
    color: '#f87171',
  },
};

/**
 * Utility to dispatch voice messages from the WS handler to the VoiceChatPanel.
 * Call this in GamePage's WS message handler for voice message types.
 */
export function dispatchVoiceMessage(msg: S2C_Message): void {
  window.dispatchEvent(new CustomEvent('voice-message', { detail: msg }));
}

/**
 * Check if an S2C message is a voice signaling message.
 */
export function isVoiceMessage(msg: S2C_Message): boolean {
  return (
    msg.type === 'VOICE_OFFER' ||
    msg.type === 'VOICE_ANSWER' ||
    msg.type === 'VOICE_ICE_CANDIDATE' ||
    msg.type === 'VOICE_STATE'
  );
}
