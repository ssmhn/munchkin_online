import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';
import { AnimatedTitle } from '../components/AnimatedTitle';
import { AmbientParticles } from '../components/AmbientParticles';

const inputClasses = "px-3.5 py-2.5 bg-munch-bg text-munch-text border border-munch-border rounded-lg text-sm font-body outline-none";

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
      className="min-h-screen flex flex-col items-center justify-center relative"
    >
      <AmbientParticles count={15} />

      <div className="mb-8 z-1">
        <AnimatedTitle text="Munchkin Online" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-munch-surface p-8 rounded-lg border border-munch-border w-[360px] flex flex-col gap-4 z-1"
      >
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2 px-5 border border-munch-border rounded-md font-fantasy font-bold cursor-pointer ${mode === 'login' ? 'bg-munch-gold text-munch-bg' : 'bg-transparent text-munch-text-muted'}`}
          >
            Login
          </button>
          <button
            type="button"
            data-testid="tab-register"
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2 px-5 border border-munch-border rounded-md font-fantasy font-bold cursor-pointer ${mode === 'register' ? 'bg-munch-gold text-munch-bg' : 'bg-transparent text-munch-text-muted'}`}
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
          className={inputClasses}
        />

        {mode === 'register' && (
          <input
            data-testid="input-name"
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClasses}
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
          className={inputClasses}
        />

        {error && (
          <div data-testid="auth-error" className="text-munch-danger text-[13px]">
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
