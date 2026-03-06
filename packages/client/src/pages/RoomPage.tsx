import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AmbientParticles } from '../components/AmbientParticles';

interface RoomPlayer {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface RoomDetails {
  id: string;
  name: string;
  phase: string;
  playerCount: number;
  maxPlayers: number;
  isAdmin: boolean;
  players: RoomPlayer[];
}

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (room?.phase === 'PLAYING') {
      navigate(`/game/${roomId}`);
    }
  }, [room?.phase, roomId, navigate]);

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/lobby/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRoom(await res.json());
      }
    } catch {}
  };

  const kickPlayer = async (playerId: string) => {
    setError('');
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/players/${playerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchRoom();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to kick player');
      }
    } catch {
      setError('Network error');
    }
  };

  const createInvite = async () => {
    setError('');
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const fullUrl = `${window.location.origin}${data.inviteUrl}`;
        setInviteUrl(fullUrl);
        setCopyMsg('');
      } else {
        setError(data.error || 'Failed to create invite');
      }
    } catch {
      setError('Network error');
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('Failed to copy');
    }
  };

  if (!room) {
    return (
      <div style={{ padding: '32px', color: 'var(--color-text)' }}>Loading room...</div>
    );
  }

  return (
    <div
      data-testid="room-page"
      style={{
        minHeight: '100vh',
        padding: '32px',
        position: 'relative',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <AmbientParticles count={10} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1
          data-testid="room-name"
          style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)', marginBottom: '4px' }}
        >
          {room.name}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 24px' }}>
          Waiting for players... ({room.playerCount}/{room.maxPlayers})
        </p>

        {error && (
          <div data-testid="room-error" style={{ color: 'var(--color-danger)', marginBottom: '12px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Players list */}
        <div data-testid="player-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {room.players.map((p) => (
            <div
              key={p.id}
              data-testid={`player-${p.id}`}
              style={{
                background: 'var(--color-surface)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${p.isAdmin ? 'var(--color-gold)' : 'var(--color-border)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.name}</span>
                {p.isAdmin && (
                  <span style={{ color: 'var(--color-gold)', fontSize: '12px', marginLeft: '8px' }}>
                    ADMIN
                  </span>
                )}
              </div>
              {room.isAdmin && !p.isAdmin && (
                <GoldButton
                  variant="danger"
                  data-testid={`kick-${p.id}`}
                  onClick={() => kickPlayer(p.id)}
                >
                  Kick
                </GoldButton>
              )}
            </div>
          ))}
        </div>

        {/* Admin controls */}
        {room.isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <GoldButton data-testid="btn-invite" onClick={createInvite}>
              Generate Invite Link
            </GoldButton>

            {inviteUrl && (
              <div
                data-testid="invite-section"
                style={{
                  background: 'var(--color-surface)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Invite link (one-time, expires in 5 min):
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    data-testid="invite-url"
                    readOnly
                    value={inviteUrl}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <GoldButton data-testid="btn-copy-invite" onClick={copyInvite}>
                    {copyMsg || 'Copy'}
                  </GoldButton>
                </div>
              </div>
            )}
          </div>
        )}

        <GoldButton
          variant="danger"
          data-testid="btn-leave"
          onClick={() => navigate('/')}
        >
          Leave Room
        </GoldButton>
      </div>
    </div>
  );
}
