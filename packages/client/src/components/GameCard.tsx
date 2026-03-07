import React from 'react';
import type { CardDefinition, CardType } from '@munchkin/shared';

const CARD_TYPE_COLORS: Record<CardType, string> = {
  MONSTER: '#7c3aed',
  EQUIPMENT: '#d97706',
  ONE_SHOT: '#2563eb',
  CURSE: '#dc2626',
  RACE: '#059669',
  CLASS: '#7c3aed',
  MODIFIER: '#6366f1',
  SPECIAL: '#8b5cf6',
};

const CARD_TYPE_LABELS: Record<CardType, string> = {
  MONSTER: 'Monster',
  EQUIPMENT: 'Equipment',
  ONE_SHOT: 'One Shot',
  CURSE: 'Curse',
  RACE: 'Race',
  CLASS: 'Class',
  MODIFIER: 'Modifier',
  SPECIAL: 'Special',
};

interface Props {
  card: CardDefinition;
  style?: React.CSSProperties;
  compact?: boolean;
  onClick?: () => void;
}

export function GameCard({ card, style, compact, onClick }: Props) {
  const typeColor = CARD_TYPE_COLORS[card.type] || '#666';
  const deckLabel = card.deck === 'DOOR' ? 'Door' : 'Treasure';

  if (compact) {
    return (
      <div
        data-testid={`card-${card.id}`}
        onClick={onClick}
        className={`w-[54px] h-[76px] rounded-md bg-munch-surface flex flex-col overflow-hidden shrink-0 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: typeColor, ...style }}
      >
        <div
          className="px-[3px] py-0.5 text-[7px] font-bold text-white uppercase tracking-tight text-center leading-tight"
          style={{ background: typeColor }}
        >
          {CARD_TYPE_LABELS[card.type]}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-0.5">
          <div className="text-[8px] font-semibold text-munch-text text-center leading-tight overflow-hidden [-webkit-line-clamp:3] [-webkit-box-orient:vertical] [display:-webkit-box]">
            {card.name}
          </div>
          {card.baseLevel != null && (
            <div
              className="mt-0.5 text-[10px] font-bold"
              style={{ color: typeColor }}
            >
              Lv.{card.baseLevel}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`card-${card.id}`}
      onClick={onClick}
      className={`w-[120px] h-[170px] rounded-lg bg-munch-surface flex flex-col overflow-hidden shrink-0 transition-[transform,box-shadow] duration-150 ease-linear shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: typeColor, ...style }}
    >
      {/* Header with type + deck */}
      <div
        className="px-1.5 py-1 flex justify-between items-center"
        style={{ background: typeColor }}
      >
        <span className="text-[9px] font-bold text-white uppercase tracking-wider">
          {CARD_TYPE_LABELS[card.type]}
        </span>
        <span className="text-[8px] text-white/70 font-semibold">
          {deckLabel}
        </span>
      </div>

      {/* Card name */}
      <div
        className="px-1.5 pt-1.5 pb-1"
        style={{ borderBottom: `1px solid ${typeColor}33` }}
      >
        <div className="text-[11px] font-bold text-munch-text font-fantasy leading-snug text-center">
          {card.name}
        </div>
      </div>

      {/* Stats row */}
      {(card.baseLevel != null || card.value != null) && (
        <div
          className="flex justify-center gap-2 px-1.5 py-[3px]"
          style={{ borderBottom: `1px solid ${typeColor}22` }}
        >
          {card.baseLevel != null && (
            <span className="text-[10px] font-bold" style={{ color: typeColor }}>
              Lv.{card.baseLevel}
            </span>
          )}
          {card.value != null && (
            <span className="text-[10px] font-bold text-amber-600">
              {card.value}gp
            </span>
          )}
          {card.treasures != null && (
            <span className="text-[10px] text-amber-600">
              T:{card.treasures}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      <div className="flex-1 px-1.5 py-1 overflow-hidden">
        <div className="text-[8px] text-munch-text-muted leading-snug overflow-hidden [-webkit-line-clamp:5] [-webkit-box-orient:vertical] [display:-webkit-box]">
          {card.description}
        </div>
      </div>

      {/* Footer with slots/requirements */}
      {card.slots && card.slots.length > 0 && (
        <div
          className="px-1.5 pt-0.5 pb-1 text-[8px] text-munch-text-muted text-center"
          style={{ borderTop: `1px solid ${typeColor}22` }}
        >
          {card.slots.join(', ')}
          {card.isBig && ' [BIG]'}
        </div>
      )}
    </div>
  );
}

export function CardBack({ deck, style }: { deck: 'DOOR' | 'TREASURE'; style?: React.CSSProperties }) {
  const color = deck === 'DOOR' ? '#7c3aed' : '#d97706';
  const label = deck === 'DOOR' ? 'DOOR' : 'TREASURE';

  return (
    <div
      className="w-20 h-28 rounded-lg flex items-center justify-center flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      style={{
        border: `2px solid ${color}`,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}44 50%, ${color}22 100%)`,
        ...style,
      }}
    >
      <div
        className="w-[50px] h-[50px] rounded-full flex items-center justify-center"
        style={{ border: `2px solid ${color}` }}
      >
        <span
          className="text-xl font-bold font-fantasy"
          style={{ color }}
        >
          {deck === 'DOOR' ? 'D' : 'T'}
        </span>
      </div>
      <span
        className="text-[8px] font-bold uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
