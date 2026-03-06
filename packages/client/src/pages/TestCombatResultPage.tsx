import React, { useState } from 'react';
import { CombatResultAnimation } from '../components/CombatResultAnimation';

type CombatOutcome = 'VICTORY' | 'DEFEAT' | 'ESCAPE';

export function TestCombatResultPage() {
  const [active, setActive] = useState<CombatOutcome | null>(null);
  const [completed, setCompleted] = useState('none');

  const play = (outcome: CombatOutcome) => {
    setCompleted('none');
    setActive(outcome);
  };

  const handleComplete = () => {
    setCompleted(active ?? 'unknown');
    setActive(null);
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Combat Result Animation Test
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button data-testid="play-victory" onClick={() => play('VICTORY')}>Victory</button>
        <button data-testid="play-defeat" onClick={() => play('DEFEAT')}>Defeat</button>
        <button data-testid="play-escape" onClick={() => play('ESCAPE')}>Escape</button>
      </div>

      <div data-testid="completed-outcome">{completed}</div>

      {active && (
        <CombatResultAnimation outcome={active} onComplete={handleComplete} />
      )}
    </div>
  );
}
