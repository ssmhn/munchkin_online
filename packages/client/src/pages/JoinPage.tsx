import { useState, useEffect } from 'react';
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
      className="min-h-screen flex flex-col items-center justify-center relative"
    >
      <AmbientParticles count={10} />

      <div className="bg-munch-surface p-8 rounded-lg border border-munch-border text-center z-1 min-w-[320px]">
        {status === 'checking' && (
          <p className="text-munch-text">Checking invite...</p>
        )}

        {status === 'invalid' && (
          <>
            <h2 className="text-munch-danger font-fantasy mt-0">
              Invalid Invite
            </h2>
            <p className="text-munch-text-muted mb-4">
              This invite link is invalid or has expired.
            </p>
            <GoldButton data-testid="btn-go-lobby" onClick={() => navigate('/')}>
              Go to Lobby
            </GoldButton>
          </>
        )}

        {status === 'valid' && (
          <>
            <h2 className="text-munch-gold font-fantasy mt-0">
              Join Room
            </h2>
            <p data-testid="invite-room-name" className="text-munch-text mb-4">
              You've been invited to <strong>{roomName}</strong>
            </p>
            {!token && (
              <p className="text-munch-text-muted text-[13px] mb-3">
                You need to log in first.
              </p>
            )}
            <GoldButton data-testid="btn-join-invite" onClick={handleJoin}>
              {token ? 'Join Room' : 'Log in & Join'}
            </GoldButton>
          </>
        )}

        {status === 'joining' && (
          <p className="text-munch-text">Joining room...</p>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-munch-danger font-fantasy mt-0">
              Error
            </h2>
            <p data-testid="join-error" className="text-munch-text-muted mb-4">
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
