import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AnimatedTitle } from '../components/AnimatedTitle';
import { AmbientParticles } from '../components/AmbientParticles';

const inputClasses = "px-3.5 py-2.5 bg-munch-bg text-munch-text border border-munch-border rounded-lg text-sm outline-none";

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  adminName: string;
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [roomPassword, setRoomPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/lobby/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch {}
  };

  const createRoom = async () => {
    setError('');
    try {
      const res = await fetch('/lobby/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName || undefined,
          isPublic,
          maxPlayers,
          password: roomPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create room');
        return;
      }

      const { roomId, token: gameToken } = await res.json();
      sessionStorage.setItem('token', gameToken);
      navigate(`/room/${roomId}`);
    } catch {
      setError('Network error');
    }
  };

  const joinRoom = async (roomId: string, password?: string) => {
    setError('');
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Password required') {
          setJoiningRoomId(roomId);
          return;
        }
        setError(data.error || 'Failed to join');
        return;
      }

      sessionStorage.setItem('token', data.token);
      navigate(`/room/${roomId}`);
    } catch {
      setError('Network error');
    }
  };

  const handlePasswordJoin = async () => {
    if (!joiningRoomId) return;
    await joinRoom(joiningRoomId, joinPassword);
    setJoiningRoomId(null);
    setJoinPassword('');
  };

  return (
    <div
      data-testid="lobby-page"
      className="min-h-screen p-8 relative max-w-[800px] mx-auto"
    >
      <AmbientParticles count={15} />

      <div className="flex justify-between items-center mb-6 z-1 relative">
        <AnimatedTitle text="Munchkin Online" />
        <div className="flex gap-3 items-center">
          <span data-testid="user-name" className="text-munch-gold font-fantasy">
            {user?.name}
          </span>
          {user?.isAdmin && (
            <GoldButton data-testid="btn-admin" onClick={() => navigate('/admin')}>
              Admin
            </GoldButton>
          )}
          <GoldButton data-testid="btn-logout" variant="danger" onClick={logout}>
            Logout
          </GoldButton>
        </div>
      </div>

      {error && (
        <div data-testid="lobby-error" className="text-munch-danger mb-3 text-[13px]">
          {error}
        </div>
      )}

      {/* Create Room */}
      <div className="mb-6 z-1 relative">
        {!showCreate ? (
          <GoldButton data-testid="btn-show-create" onClick={() => setShowCreate(true)}>
            Create Room
          </GoldButton>
        ) : (
          <div
            data-testid="create-room-form"
            className="bg-munch-surface p-5 rounded-lg border border-munch-border flex flex-col gap-3"
          >
            <input
              data-testid="input-room-name"
              type="text"
              placeholder="Room name (optional)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoComplete="off"
              className={inputClasses}
            />

            <label className="flex items-center gap-2 text-munch-text">
              <span>Max players</span>
              <input
                data-testid="input-max-players"
                type="number"
                min={2}
                max={6}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Math.min(6, Math.max(2, Number(e.target.value))))}
                autoComplete="off"
                className={`${inputClasses} w-[70px] text-center`}
              />
            </label>

            <label className="flex items-center gap-2 text-munch-text cursor-pointer">
              <input
                data-testid="input-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => { setIsPublic(e.target.checked); if (e.target.checked) setRoomPassword(''); }}
              />
              Public room (visible in room list)
            </label>

            <input
              data-testid="input-room-password"
              type="password"
              placeholder="Password (optional)"
              value={isPublic ? '' : roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              disabled={isPublic}
              autoComplete="new-password"
              className={`${inputClasses} ${isPublic ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            <div className="flex gap-2">
              <GoldButton data-testid="btn-create-room" onClick={createRoom}>
                Create
              </GoldButton>
              <GoldButton variant="danger" onClick={() => { setShowCreate(false); setRoomName(''); setRoomPassword(''); setMaxPlayers(6); }}>
                Cancel
              </GoldButton>
            </div>
          </div>
        )}
      </div>

      {/* Password prompt modal */}
      {joiningRoomId && (
        <div
          data-testid="password-modal"
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-100"
        >
          <div className="bg-munch-surface p-6 rounded-lg border border-munch-border flex flex-col gap-3 min-w-[300px]">
            <h3 className="text-munch-gold font-fantasy m-0">
              Enter Room Password
            </h3>
            <input
              data-testid="input-join-password"
              type="password"
              placeholder="Password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className={inputClasses}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordJoin()}
            />
            <div className="flex gap-2">
              <GoldButton data-testid="btn-submit-password" onClick={handlePasswordJoin}>
                Join
              </GoldButton>
              <GoldButton variant="danger" onClick={() => { setJoiningRoomId(null); setJoinPassword(''); }}>
                Cancel
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Room list */}
      <h2 className="text-munch-gold font-fantasy relative z-1">
        Open Rooms
      </h2>
      <div data-testid="room-list" className="flex flex-col gap-2 relative z-1">
        {rooms.map((room) => (
          <div
            key={room.id}
            data-testid={`room-${room.id}`}
            className="bg-munch-surface py-3.5 px-4.5 rounded-md border border-munch-border flex justify-between items-center"
          >
            <div>
              <div className="text-munch-text font-semibold">
                {room.hasPassword && (
                  <span data-testid={`lock-${room.id}`} className="mr-1.5">🔒</span>
                )}
                {room.name}
              </div>
              <div className="text-munch-text-muted text-xs">
                by {room.adminName} · {room.playerCount}/{room.maxPlayers} players
              </div>
            </div>
            <GoldButton
              data-testid={`join-${room.id}`}
              onClick={() => joinRoom(room.id)}
            >
              Join
            </GoldButton>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-munch-text-muted p-4">
            No rooms available. Create one!
          </div>
        )}
      </div>
    </div>
  );
}
