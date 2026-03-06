import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
}

export function LobbyPage() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/lobby/rooms')
      .then(res => res.json())
      .then(data => setRooms(data.rooms || []))
      .catch(() => {});
  }, []);

  const createRoom = async () => {
    const res = await fetch('/lobby/rooms', { method: 'POST' });
    const { roomId } = await res.json();
    await joinRoom(roomId);
  };

  const joinRoom = async (roomId: string) => {
    const res = await fetch(`/lobby/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: playerName || 'Player' }),
    });
    const { token } = await res.json();
    sessionStorage.setItem('token', token);
    navigate(`/game/${roomId}`);
  };

  return (
    <div data-testid="lobby-page">
      <h1>Munchkin Online</h1>
      <div>
        <input
          data-testid="player-name"
          placeholder="Your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
        <button data-testid="create-room" onClick={createRoom}>
          Create Room
        </button>
      </div>
      <h2>Open Rooms</h2>
      <ul data-testid="room-list">
        {rooms.map(room => (
          <li key={room.id}>
            Room {room.id} ({room.playerCount}/{room.maxPlayers})
            <button onClick={() => joinRoom(room.id)}>Join</button>
          </li>
        ))}
        {rooms.length === 0 && <li>No rooms available</li>}
      </ul>
    </div>
  );
}
