import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AnimatedTitle } from '../components/AnimatedTitle';
import { AmbientParticles } from '../components/AmbientParticles';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, name, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setAuth(data.token, data.user);
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      if (pendingInvite) {
        sessionStorage.removeItem('pendingInvite');
        navigate(pendingInvite);
      } else {
        navigate('/');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="auth-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <AmbientParticles count={15} />

      <div style={{ marginBottom: '32px', zIndex: 1 }}>
        <AnimatedTitle text="Munchkin Online" />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--color-surface)',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              padding: '8px 20px',
              background: mode === 'login' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'login' ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-fantasy)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <button
            type="button"
            data-testid="tab-register"
            onClick={() => { setMode('register'); setError(''); }}
            style={{
              padding: '8px 20px',
              background: mode === 'register' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'register' ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-fantasy)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>

        <input
          data-testid="input-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        {mode === 'register' && (
          <input
            data-testid="input-name"
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        )}

        <input
          data-testid="input-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && (
          <div data-testid="auth-error" style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <GoldButton data-testid="auth-submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Create Account'}
        </GoldButton>
      </form>
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
  fontFamily: 'var(--font-body)',
  outline: 'none',
};
