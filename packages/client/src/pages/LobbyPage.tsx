import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AnimatedTitle } from '../components/AnimatedTitle';
import { AmbientParticles } from '../components/AmbientParticles';

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
      style={{
        minHeight: '100vh',
        padding: '32px',
        position: 'relative',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <AmbientParticles count={15} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', zIndex: 1, position: 'relative' }}>
        <AnimatedTitle text="Munchkin Online" />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span data-testid="user-name" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)' }}>
            {user?.name}
          </span>
          <GoldButton data-testid="btn-logout" variant="danger" onClick={logout}>
            Logout
          </GoldButton>
        </div>
      </div>

      {error && (
        <div data-testid="lobby-error" style={{ color: 'var(--color-danger)', marginBottom: '12px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Create Room */}
      <div style={{ marginBottom: '24px', zIndex: 1, position: 'relative' }}>
        {!showCreate ? (
          <GoldButton data-testid="btn-show-create" onClick={() => setShowCreate(true)}>
            Create Room
          </GoldButton>
        ) : (
          <div
            data-testid="create-room-form"
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <input
              data-testid="input-room-name"
              type="text"
              placeholder="Room name (optional)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={inputStyle}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)', cursor: 'pointer' }}>
              <input
                data-testid="input-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Public room (visible in room list)
            </label>

            <input
              data-testid="input-room-password"
              type="password"
              placeholder="Password (optional)"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <GoldButton data-testid="btn-create-room" onClick={createRoom}>
                Create
              </GoldButton>
              <GoldButton variant="danger" onClick={() => { setShowCreate(false); setRoomName(''); setRoomPassword(''); }}>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{
            background: 'var(--color-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: '300px',
          }}>
            <h3 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)', margin: 0 }}>
              Enter Room Password
            </h3>
            <input
              data-testid="input-join-password"
              type="password"
              placeholder="Password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              style={inputStyle}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordJoin()}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
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
      <h2 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)', position: 'relative', zIndex: 1 }}>
        Open Rooms
      </h2>
      <div data-testid="room-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
        {rooms.map((room) => (
          <div
            key={room.id}
            data-testid={`room-${room.id}`}
            style={{
              background: 'var(--color-surface)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                {room.hasPassword && (
                  <span data-testid={`lock-${room.id}`} style={{ marginRight: '6px' }}>🔒</span>
                )}
                {room.name}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
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
          <div style={{ color: 'var(--color-text-muted)', padding: '16px' }}>
            No rooms available. Create one!
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '14px',
  outline: 'none',
};
