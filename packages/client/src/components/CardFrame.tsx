import React from 'react';

type CardType = 'MONSTER' | 'EQUIPMENT' | 'CLASS' | 'RACE' | 'CURSE' | 'ONESHOT' | 'MODIFIER' | 'SPECIAL';

interface Props {
  type: CardType;
  title: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

const BORDER_COLORS: Record<CardType, string> = {
  MONSTER: 'var(--color-danger)',
  EQUIPMENT: 'var(--color-gold)',
  CLASS: 'var(--color-info)',
  RACE: '#8b5cf6',
  CURSE: '#7c3aed',
  ONESHOT: 'var(--color-success)',
  MODIFIER: '#f97316',
  SPECIAL: '#06b6d4',
};

export function CardFrame({ type, title, children, ...rest }: Props) {
  const borderColor = BORDER_COLORS[type] ?? 'var(--color-border)';

  return (
    <div
      data-testid={rest['data-testid']}
      data-card-type={type}
      style={{
        width: '140px',
        minHeight: '200px',
        background: `linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-light) 100%)`,
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          background: borderColor,
          color: type === 'EQUIPMENT' ? 'var(--color-bg)' : 'var(--color-text)',
          fontFamily: 'var(--font-fantasy)',
          fontSize: '12px',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '10px', flex: 1, fontSize: '12px', color: 'var(--color-text-muted)' }}>
        {children}
      </div>
    </div>
  );
}
