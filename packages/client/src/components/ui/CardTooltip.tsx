import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { CardDefinition } from '@munchkin/shared';

interface Props {
  card: CardDefinition;
  position?: { x: number; y: number };
}

const TYPE_LABELS: Record<string, string> = {
  MONSTER: 'Monster',
  EQUIPMENT: 'Equipment',
  ONE_SHOT: 'One Shot',
  CURSE: 'Curse',
  RACE: 'Race',
  CLASS: 'Class',
  MODIFIER: 'Modifier',
  SPECIAL: 'Special',
};

export function CardTooltip({ card, position }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.from(ref.current, {
        opacity: 0,
        y: 8,
        duration: 0.15,
        ease: 'power2.out',
      });
    }
  }, []);

  const isMonster = card.type === 'MONSTER';

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none bg-munch-surface border border-munch-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <div className="text-sm font-bold text-munch-text font-fantasy mb-1">
        {card.name}
      </div>
      <div className="text-[10px] text-munch-text-muted mb-2 flex gap-2">
        <span>{TYPE_LABELS[card.type] ?? card.type}</span>
        {card.slots && card.slots.length > 0 && (
          <span>{card.slots.join(', ')}</span>
        )}
        {card.value != null && <span>{card.value} gold</span>}
      </div>
      {isMonster && (
        <div className="text-xs text-munch-text mb-1">
          <div>Level: {card.baseLevel}</div>
          {card.treasures != null && <div>Treasures: {card.treasures}</div>}
        </div>
      )}
      {card.description && (
        <div className="text-[11px] text-munch-text-muted leading-snug">
          {card.description}
        </div>
      )}
      {isMonster && card.badStuff?.description && (
        <div className="mt-1.5 pt-1.5 border-t border-munch-border">
          <div className="text-[10px] font-bold text-red-400 mb-0.5">
            Bad Stuff:
          </div>
          <div className="text-[10px] text-red-300">
            {card.badStuff.description}
          </div>
        </div>
      )}
      {card.isBig && (
        <div className="mt-1 text-[9px] font-bold text-amber-500 uppercase">
          Big Item
        </div>
      )}
    </div>
  );
}
