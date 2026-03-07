import React, { useState, useCallback, useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { CardId, CardDb, GameAction, GamePhase } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { useDropZone, type DragPayload } from '../../hooks/useDragAndDrop';
import { HoverTooltip } from '../ui/CardTooltip';

interface Props {
  backpack: CardId[];
  backpackSize: number;
  cardDb: CardDb | null;
  phase: GamePhase;
  onAction: (action: GameAction) => void;
}

export function BackpackPanel({ backpack, backpackSize, cardDb, phase, onAction }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isCombat = phase === 'COMBAT';
  const isFull = backpack.length >= backpackSize;

  useEffect(() => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        x: collapsed ? 200 : 0,
        duration: 0.35,
        ease: collapsed ? 'power2.in' : 'power2.out',
      });
    }
  }, [collapsed]);

  const handleDrop = useCallback(
    (payload: DragPayload) => {
      if (isCombat || isFull) return;
      if (payload.sourceZone === 'HAND') {
        onAction({ type: 'PUT_IN_BACKPACK', cardId: payload.cardId });
      }
    },
    [isCombat, isFull, onAction],
  );

  const dropProps = useDropZone(handleDrop);
  const emptySlots = Math.max(0, backpackSize - backpack.length);

  return (
    <div ref={panelRef} className="flex flex-col gap-2 min-w-[120px]">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between text-[10px] font-bold text-munch-text-muted uppercase px-2 py-1 bg-black/20 rounded border border-munch-border cursor-pointer"
      >
        <span>Backpack {backpack.length}/{backpackSize}</span>
        <span>{collapsed ? '<' : '>'}</span>
      </button>

      {!collapsed && (
        <div
          {...dropProps}
          className={`grid grid-cols-2 gap-1.5 p-2 bg-black/15 rounded-lg border border-munch-border min-h-[100px] transition-colors ${
            isCombat ? 'opacity-50' : ''
          } [&.drop-hover]:border-munch-gold [&.drop-hover]:bg-munch-gold/5`}
        >
          {backpack.map((cardId) => {
            const def = cardDb?.[cardId];
            return (
              <div
                key={cardId}
                className="cursor-pointer"
                onDoubleClick={() => {
                  if (!isCombat) onAction({ type: 'TAKE_FROM_BACKPACK', cardId });
                }}
              >
                {def ? <HoverTooltip card={def}><GameCard card={def} compact /></HoverTooltip> : (
                  <div className="w-[54px] h-[76px] bg-munch-surface-light rounded-md border border-munch-border flex items-center justify-center text-[8px] text-munch-text-muted">
                    {cardId}
                  </div>
                )}
              </div>
            );
          })}
          {Array(emptySlots).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="w-[54px] h-[76px] rounded-md border border-dashed border-munch-border/40 bg-munch-surface-light/20" />
          ))}
        </div>
      )}
    </div>
  );
}
