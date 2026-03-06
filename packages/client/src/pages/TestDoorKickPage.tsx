import React, { useState } from 'react';
import { DoorKickAnimation } from '../components/DoorKickAnimation';

type CardRevealType = 'MONSTER' | 'EQUIPMENT' | 'CURSE';

export function TestDoorKickPage() {
  const [active, setActive] = useState<{ type: CardRevealType; title: string } | null>(null);
  const [completed, setCompleted] = useState('none');

  const kick = (type: CardRevealType, title: string) => {
    setCompleted('none');
    setActive({ type, title });
  };

  const handleComplete = () => {
    setCompleted(active?.type ?? 'unknown');
    setActive(null);
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Door Kick Animation Test
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button data-testid="kick-monster" onClick={() => kick('MONSTER', 'Orc (Level 4)')}>
          Kick: Monster
        </button>
        <button data-testid="kick-equipment" onClick={() => kick('EQUIPMENT', 'Sword of Slaying')}>
          Kick: Equipment
        </button>
        <button data-testid="kick-curse" onClick={() => kick('CURSE', 'Lose a Level')}>
          Kick: Curse
        </button>
      </div>

      <div data-testid="completed-type">{completed}</div>

      {active && (
        <DoorKickAnimation
          cardType={active.type}
          cardTitle={active.title}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
