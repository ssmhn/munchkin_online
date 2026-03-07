import React from 'react';
import type { CardDefinition, CardType, CardEffect, CardCondition } from '@munchkin/shared';

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

function describeCondition(cond: CardCondition): string {
  switch (cond.type) {
    case 'PLAYER_GENDER': return `${cond.gender === 'MALE' ? 'males' : 'females'}`;
    case 'PLAYER_RACE': return `${cond.race.charAt(0) + cond.race.slice(1).toLowerCase()}s`;
    case 'PLAYER_CLASS': return `${cond.class.charAt(0) + cond.class.slice(1).toLowerCase()}s`;
    case 'PLAYER_LEVEL': return `Lv ${cond.op} ${cond.value}`;
    case 'MONSTER_TAG': return `${cond.tag.toLowerCase()}s`;
    case 'NOT': return `non-${describeCondition(cond.condition)}`;
    default: return '';
  }
}

function getConditionalBonuses(effects: CardEffect[]): string[] {
  const bonuses: string[] = [];
  for (const e of effects) {
    if (e.type === 'CONDITIONAL' && e.condition) {
      const condLabel = describeCondition(e.condition);
      for (const sub of e.then) {
        if (sub.type === 'MONSTER_BONUS' || sub.type === 'COMBAT_BONUS') {
          bonuses.push(`${sub.value >= 0 ? '+' : ''}${sub.value} vs ${condLabel}`);
        }
      }
    }
  }
  return bonuses;
}

interface Props {
  card: CardDefinition;
  style?: React.CSSProperties;
  compact?: boolean;
  onClick?: () => void;
}

export function GameCard({ card, style, compact, onClick }: Props) {
  const typeColor = CARD_TYPE_COLORS[card.type] || '#666';
  const deckLabel = card.deck === 'DOOR' ? 'Door' : 'Treasure';
  const isMonster = card.type === 'MONSTER';

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
      className={`w-[120px] rounded-lg bg-munch-surface flex flex-col overflow-hidden shrink-0 transition-[transform,box-shadow] duration-150 ease-linear shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: typeColor, minHeight: '170px', ...style }}
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
            <span className="text-[10px] text-amber-400 font-bold">
              T:{card.treasures}
            </span>
          )}
        </div>
      )}

      {/* Monster rewards */}
      {isMonster && (
        <div className="flex justify-center gap-2 px-1.5 py-[2px] bg-green-900/20">
          <span className="text-[8px] text-green-400 font-semibold">
            +1 Lv
          </span>
          {card.treasures != null && card.treasures > 0 && (
            <span className="text-[8px] text-amber-400 font-semibold">
              {card.treasures} Treasure{card.treasures > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Conditional bonuses for monsters */}
      {isMonster && card.effects && (() => {
        const bonuses = getConditionalBonuses(card.effects);
        return bonuses.length > 0 ? (
          <div className="px-1.5 py-0.5 flex flex-wrap gap-1 justify-center" style={{ borderBottom: `1px solid ${typeColor}22` }}>
            {bonuses.map((b, i) => (
              <span key={i} className="text-[8px] font-bold text-orange-400">
                {b}
              </span>
            ))}
          </div>
        ) : null;
      })()}

      {/* Description */}
      <div className="flex-1 px-1.5 py-1 overflow-hidden">
        <div className="text-[8px] text-munch-text-muted leading-snug overflow-hidden [-webkit-line-clamp:3] [-webkit-box-orient:vertical] [display:-webkit-box]">
          {card.description}
        </div>
      </div>

      {/* Bad Stuff for monsters */}
      {isMonster && card.badStuff?.description && (
        <div
          className="px-1.5 py-1 overflow-hidden"
          style={{ borderTop: `1px solid ${typeColor}22`, background: 'rgba(220,38,38,0.08)' }}
        >
          <div className="text-[7px] font-bold text-red-500 uppercase mb-0.5">Bad Stuff</div>
          <div className="text-[8px] text-red-400/80 leading-snug overflow-hidden [-webkit-line-clamp:3] [-webkit-box-orient:vertical] [display:-webkit-box]">
            {card.badStuff.description}
          </div>
        </div>
      )}

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
