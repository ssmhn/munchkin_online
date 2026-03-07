import { useState, useEffect } from 'react';
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
    const interval = setInterval(fetchRoom, 1500);
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
      } else if (res.status === 404) {
        navigate('/');
      }
    } catch {}
  };

  const leaveRoom = async () => {
    try {
      await fetch(`/lobby/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
    } catch {}
    navigate('/');
  };

  const startGame = async () => {
    setError('');
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start game');
      }
    } catch {
      setError('Network error');
    }
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
      <div className="p-8 text-munch-text">Loading room...</div>
    );
  }

  return (
    <div
      data-testid="room-page"
      className="min-h-screen p-8 relative max-w-[600px] mx-auto"
    >
      <AmbientParticles count={10} />

      <div className="relative z-1">
        <h1
          data-testid="room-name"
          className="text-munch-gold font-fantasy mb-1"
        >
          {room.name}
        </h1>
        <p className="text-munch-text-muted m-0 mb-6">
          Waiting for players... ({room.playerCount}/{room.maxPlayers})
        </p>

        {error && (
          <div data-testid="room-error" className="text-munch-danger mb-3 text-[13px]">
            {error}
          </div>
        )}

        {/* Players list */}
        <div data-testid="player-list" className="flex flex-col gap-2 mb-6">
          {room.players.map((p) => (
            <div
              key={p.id}
              data-testid={`player-${p.id}`}
              className={`bg-munch-surface py-3 px-4 rounded-md flex justify-between items-center border ${p.isAdmin ? 'border-munch-gold' : 'border-munch-border'}`}
            >
              <div>
                <span className="text-munch-text font-semibold">{p.name}</span>
                {p.isAdmin && (
                  <span className="text-munch-gold text-xs ml-2">
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
          <div className="flex flex-col gap-3 mb-6">
            {room.playerCount >= 2 && (
              <GoldButton data-testid="btn-start-game" onClick={startGame}>
                Start Game
              </GoldButton>
            )}

            <GoldButton data-testid="btn-invite" onClick={createInvite}>
              Generate Invite Link
            </GoldButton>

            {inviteUrl && (
              <div
                data-testid="invite-section"
                className="bg-munch-surface p-3 rounded-md border border-munch-border"
              >
                <div className="text-xs text-munch-text-muted mb-1">
                  Invite link (one-time, expires in 5 min):
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    data-testid="invite-url"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 py-2 px-2.5 bg-munch-bg text-munch-text border border-munch-border rounded-sm text-xs outline-none"
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
          onClick={leaveRoom}
        >
          {room.isAdmin ? 'Close Room' : 'Leave Room'}
        </GoldButton>
      </div>
    </div>
  );
}
