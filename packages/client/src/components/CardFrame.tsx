import React from 'react';

type CardType = 'MONSTER' | 'EQUIPMENT' | 'CLASS' | 'RACE' | 'CURSE' | 'ONESHOT' | 'MODIFIER' | 'SPECIAL';

interface Props {
  type: CardType;
  title: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

const BORDER_COLORS: Record<CardType, string> = {
  MONSTER: 'var(--color-munch-danger)',
  EQUIPMENT: 'var(--color-munch-gold)',
  CLASS: 'var(--color-munch-info)',
  RACE: '#8b5cf6',
  CURSE: '#7c3aed',
  ONESHOT: 'var(--color-munch-success)',
  MODIFIER: '#f97316',
  SPECIAL: '#06b6d4',
};

export function CardFrame({ type, title, children, ...rest }: Props) {
  const borderColor = BORDER_COLORS[type] ?? 'var(--color-munch-border)';

  return (
    <div
      data-testid={rest['data-testid']}
      data-card-type={type}
      className="w-[140px] min-h-[200px] bg-gradient-to-br from-munch-surface to-munch-surface-light rounded-xl shadow-card flex flex-col overflow-hidden"
      style={{ border: `2px solid ${borderColor}` }}
    >
      <div
        className={`px-2.5 py-2 font-fantasy text-xs font-bold text-center ${
          type === 'EQUIPMENT' ? 'text-munch-bg' : 'text-munch-text'
        }`}
        style={{ background: borderColor }}
      >
        {title}
      </div>
      <div className="p-2.5 flex-1 text-xs text-munch-text-muted">
        {children}
      </div>
    </div>
  );
}
