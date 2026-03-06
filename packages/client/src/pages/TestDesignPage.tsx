import React, { useState } from 'react';
import { GoldButton } from '../components/GoldButton';
import { CardFrame } from '../components/CardFrame';
import { LevelBadge } from '../components/LevelBadge';

export function TestDesignPage() {
  const [level, setLevel] = useState(1);

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <section>
        <h2 data-testid="section-buttons" style={{ fontFamily: 'var(--font-fantasy)', color: 'var(--color-gold)' }}>
          GoldButton
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <GoldButton data-testid="btn-primary" onClick={() => {}}>
            Primary Action
          </GoldButton>
          <GoldButton data-testid="btn-danger" variant="danger" onClick={() => {}}>
            Danger Action
          </GoldButton>
          <GoldButton data-testid="btn-disabled" disabled>
            Disabled
          </GoldButton>
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-fantasy)', color: 'var(--color-gold)' }}>
          CardFrame
        </h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <CardFrame data-testid="card-monster" type="MONSTER" title="Orc">
            Level 4 • 1 Treasure
          </CardFrame>
          <CardFrame data-testid="card-equipment" type="EQUIPMENT" title="Sword of Slaying">
            +3 Bonus • Big
          </CardFrame>
          <CardFrame data-testid="card-class" type="CLASS" title="Warrior">
            Can use any weapon
          </CardFrame>
          <CardFrame data-testid="card-curse" type="CURSE" title="Lose a Level">
            You feel weaker...
          </CardFrame>
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-fantasy)', color: 'var(--color-gold)' }}>
          LevelBadge
        </h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <LevelBadge data-testid="level-badge" level={level} />
          <GoldButton data-testid="btn-level-up" onClick={() => setLevel((l) => Math.min(l + 1, 10))}>
            Level Up
          </GoldButton>
          <GoldButton data-testid="btn-level-down" variant="danger" onClick={() => setLevel((l) => Math.max(l - 1, 1))}>
            Level Down
          </GoldButton>
          <span data-testid="level-value" style={{ color: 'var(--color-text-muted)' }}>
            Current: {level}
          </span>
        </div>
      </section>
    </div>
  );
}
