import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { CardDefinition } from '@munchkin/shared';

interface Props {
  card: CardDefinition;
  onClose: () => void;
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

const TYPE_COLORS: Record<string, string> = {
  MONSTER: '#7c3aed',
  EQUIPMENT: '#d97706',
  ONE_SHOT: '#2563eb',
  CURSE: '#dc2626',
  RACE: '#059669',
  CLASS: '#7c3aed',
  MODIFIER: '#6366f1',
  SPECIAL: '#8b5cf6',
};

export function CardDetailModal({ card, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.from(ref.current, {
        scale: 0.9,
        opacity: 0,
        duration: 0.25,
        ease: 'back.out(1.5)',
      });
    }
  }, []);

  const typeColor = TYPE_COLORS[card.type] ?? '#666';

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[5000]"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="bg-munch-surface rounded-xl overflow-hidden w-[300px] shadow-2xl"
        style={{ border: `2px solid ${typeColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 text-white font-bold font-fantasy text-center"
          style={{ background: typeColor }}
        >
          {TYPE_LABELS[card.type] ?? card.type}
          {card.deck && (
            <span className="text-xs ml-2 opacity-70">({card.deck})</span>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-lg font-bold text-munch-text font-fantasy text-center mb-3">
            {card.name}
          </h2>
          {(card.baseLevel != null || card.value != null) && (
            <div className="flex justify-center gap-4 mb-3 text-sm">
              {card.baseLevel != null && (
                <span style={{ color: typeColor }}>Level {card.baseLevel}</span>
              )}
              {card.value != null && (
                <span className="text-amber-500">{card.value} gold</span>
              )}
              {card.treasures != null && (
                <span className="text-amber-400">
                  Treasures: {card.treasures}
                </span>
              )}
            </div>
          )}
          {card.slots && card.slots.length > 0 && (
            <div className="text-center text-xs text-munch-text-muted mb-3">
              Slots: {card.slots.join(', ')} {card.isBig && '[BIG]'}
            </div>
          )}
          {card.description && (
            <p className="text-sm text-munch-text-muted leading-relaxed mb-3">
              {card.description}
            </p>
          )}
          {card.badStuff?.description && (
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-2.5 mb-3">
              <div className="text-xs font-bold text-red-400 mb-1">
                Bad Stuff
              </div>
              <div className="text-xs text-red-300">
                {card.badStuff.description}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 bg-munch-surface-light border border-munch-border rounded-lg text-munch-text text-sm font-semibold cursor-pointer hover:bg-munch-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
