import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AmbientParticles } from '../components/AmbientParticles';

export function JoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'joining' | 'error'>('checking');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken || !roomId) {
      setStatus('invalid');
      return;
    }
    validateInvite();
  }, [roomId, inviteToken]);

  const validateInvite = async () => {
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/invite/validate?token=${inviteToken}`);
      const data = await res.json();
      if (data.valid) {
        setRoomName(data.roomName);
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
    } catch {
      setStatus('invalid');
    }
  };

  const handleJoin = async () => {
    if (!token) {
      // Save invite URL and redirect to auth
      sessionStorage.setItem('pendingInvite', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }

    setStatus('joining');
    try {
      const res = await fetch(`/lobby/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteToken }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('token', data.token);
        navigate(`/room/${roomId}`);
      } else {
        setError(data.error || 'Failed to join room');
        setStatus('error');
      }
    } catch {
      setError('Network error');
      setStatus('error');
    }
  };

  return (
    <div
      data-testid="join-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <AmbientParticles count={10} />

      <div
        style={{
          background: 'var(--color-surface)',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
          zIndex: 1,
          minWidth: '320px',
        }}
      >
        {status === 'checking' && (
          <p style={{ color: 'var(--color-text)' }}>Checking invite...</p>
        )}

        {status === 'invalid' && (
          <>
            <h2 style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-fantasy)', marginTop: 0 }}>
              Invalid Invite
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              This invite link is invalid or has expired.
            </p>
            <GoldButton data-testid="btn-go-lobby" onClick={() => navigate('/')}>
              Go to Lobby
            </GoldButton>
          </>
        )}

        {status === 'valid' && (
          <>
            <h2 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)', marginTop: 0 }}>
              Join Room
            </h2>
            <p data-testid="invite-room-name" style={{ color: 'var(--color-text)', marginBottom: '16px' }}>
              You've been invited to <strong>{roomName}</strong>
            </p>
            {!token && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                You need to log in first.
              </p>
            )}
            <GoldButton data-testid="btn-join-invite" onClick={handleJoin}>
              {token ? 'Join Room' : 'Log in & Join'}
            </GoldButton>
          </>
        )}

        {status === 'joining' && (
          <p style={{ color: 'var(--color-text)' }}>Joining room...</p>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-fantasy)', marginTop: 0 }}>
              Error
            </h2>
            <p data-testid="join-error" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              {error}
            </p>
            <GoldButton data-testid="btn-go-lobby" onClick={() => navigate('/')}>
              Go to Lobby
            </GoldButton>
          </>
        )}
      </div>
    </div>
  );
}
