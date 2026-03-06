import React, { useState } from 'react';
import { DoppelgangerAnimation } from '../components/DoppelgangerAnimation';

const singleMonster = { instanceId: 'inst-1', name: 'Orc (Lv 4)' };
const twoMonsters = [
  { instanceId: 'inst-1', name: 'Orc (Lv 4)' },
  { instanceId: 'inst-2', name: 'Dragon (Lv 20)' },
];

export function TestDoppelgangerPage() {
  const [mode, setMode] = useState<'none' | 'auto' | 'choose' | 'clone-after-choose'>('none');
  const [completed, setCompleted] = useState('none');
  const [chosenId, setChosenId] = useState('none');

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Doppelganger Animation Test
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button data-testid="auto-clone" onClick={() => { setMode('auto'); setCompleted('none'); setChosenId('none'); }}>
          Auto Clone (1 monster)
        </button>
        <button data-testid="choose-clone" onClick={() => { setMode('choose'); setCompleted('none'); setChosenId('none'); }}>
          Choose Clone (2 monsters)
        </button>
      </div>

      <div data-testid="completed-status">{completed}</div>
      <div data-testid="chosen-id">{chosenId}</div>

      {mode === 'auto' && (
        <DoppelgangerAnimation
          originalMonster={singleMonster}
          onComplete={() => setCompleted('auto-done')}
        />
      )}

      {mode === 'choose' && (
        <DoppelgangerAnimation
          originalMonster={twoMonsters[0]}
          allMonsters={twoMonsters}
          onChoose={(id) => { setChosenId(id); setMode('clone-after-choose'); }}
          onComplete={() => setCompleted('choose-done')}
        />
      )}

      {mode === 'clone-after-choose' && (
        <DoppelgangerAnimation
          originalMonster={singleMonster}
          onComplete={() => setCompleted('choose-done')}
        />
      )}
    </div>
  );
}
