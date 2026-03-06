import React, { useState } from 'react';
import { DiceRollOverlay } from '../components/DiceRollOverlay';

export function TestDiceRollPage() {
  const [active, setActive] = useState<number | null>(null);
  const [completed, setCompleted] = useState('none');

  const roll = (value: number) => {
    setCompleted('none');
    setActive(value);
  };

  const handleComplete = () => {
    setCompleted(active !== null && active >= 5 ? 'success' : 'fail');
    setActive(null);
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Dice Roll Animation Test
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button data-testid="roll-success" onClick={() => roll(5)}>Roll 5 (Success)</button>
        <button data-testid="roll-fail" onClick={() => roll(3)}>Roll 3 (Fail)</button>
        <button data-testid="roll-six" onClick={() => roll(6)}>Roll 6 (Crit)</button>
      </div>

      <div data-testid="roll-completed">{completed}</div>

      {active !== null && (
        <DiceRollOverlay result={active} onComplete={handleComplete} />
      )}
    </div>
  );
}
