import React, { useState } from 'react';
import { AmbientParticles } from '../components/AmbientParticles';
import { ActivePlayerGlow } from '../components/ActivePlayerGlow';
import { AnimatedTitle } from '../components/AnimatedTitle';

export function TestAmbientPage() {
  const [activePlayer, setActivePlayer] = useState('p1');

  return (
    <div style={{ padding: '32px', position: 'relative', minHeight: '100vh' }}>
      <AmbientParticles count={25} />

      <AnimatedTitle text="Munchkin Online" />

      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        {['p1', 'p2', 'p3'].map((pid) => (
          <ActivePlayerGlow key={pid} isActive={activePlayer === pid} data-testid={`glow-${pid}`}>
            <div
              data-testid={`player-${pid}`}
              onClick={() => setActivePlayer(pid)}
              style={{
                padding: '16px 24px',
                background: 'var(--color-surface, #2a1f10)',
                borderRadius: 'var(--radius-md, 8px)',
                color: 'var(--color-text, #fff)',
                cursor: 'pointer',
                fontFamily: 'var(--font-fantasy, serif)',
              }}
            >
              Player {pid.toUpperCase()}
            </div>
          </ActivePlayerGlow>
        ))}
      </div>

      <div data-testid="active-player" style={{ marginTop: '16px', color: 'var(--color-text-muted, #999)' }}>
        Active: {activePlayer}
      </div>
    </div>
  );
}
