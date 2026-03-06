import React, { useState } from 'react';
import { VictoryScreen } from '../components/VictoryScreen';

export function TestVictoryPage() {
  const [visible, setVisible] = useState(true);
  const [result, setResult] = useState('none');

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Victory Screen Test
      </h2>

      <button data-testid="show-victory" onClick={() => { setVisible(true); setResult('none'); }}>
        Show Victory
      </button>
      <div data-testid="play-again-result">{result}</div>

      {visible && (
        <VictoryScreen
          winnerName="DragonSlayer"
          onPlayAgain={() => { setVisible(false); setResult('lobby'); }}
        />
      )}
    </div>
  );
}
