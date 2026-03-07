import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EquippedItems, CardDb, GameAction, CardId, GamePhase } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { useDropZone, type DragPayload } from '../../hooks/useDragAndDrop';

interface SlotConfig {
  id: string;
  label: string;
  icon: string;
  key: keyof Omit<EquippedItems, 'extras'>;
}

const SLOTS: SlotConfig[] = [
  { id: 'head', label: 'Head', icon: 'H', key: 'head' },
  { id: 'body', label: 'Body', icon: 'B', key: 'body' },
  { id: 'feet', label: 'Feet', icon: 'F', key: 'feet' },
  { id: 'hand1', label: 'Hand', icon: '✋', key: 'hand1' },
  { id: 'hand2', label: 'Hand', icon: '✋', key: 'hand2' },
  { id: 'twoHands', label: '2-Hand', icon: '2H', key: 'twoHands' },
];

interface Props {
  equipped: EquippedItems;
  cardDb: CardDb | null;
  phase: GamePhase;
  onAction: (action: GameAction) => void;
}

export function EquipmentZone({ equipped, cardDb, phase, onAction }: Props) {
  const isCombat = phase === 'COMBAT';
  const showTwoHands = !!equipped.twoHands;
  const [selectedSlotCardId, setSelectedSlotCardId] = useState<CardId | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside
  useEffect(() => {
    if (!selectedSlotCardId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setSelectedSlotCardId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedSlotCardId]);

  const handleSlotAction = useCallback(
    (action: GameAction) => {
      setSelectedSlotCardId(null);
      onAction(action);
    },
    [onAction],
  );

  return (
    <div ref={zoneRef} className="flex flex-col gap-1.5 p-2 bg-black/15 rounded-lg border border-munch-border">
      <div className="text-[9px] text-munch-text-muted uppercase font-bold text-center">Equipment</div>
      <div className="grid grid-cols-3 gap-1.5 justify-items-center">
        {/* Top row: Head */}
        <div className="col-start-2">
          <EquipSlot slot={SLOTS[0]} cardId={equipped.head} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
        </div>
        {/* Middle row: Hand(s)/2-Hand, Body */}
        {showTwoHands ? (
          <>
            <EquipSlot slot={SLOTS[5]} cardId={equipped.twoHands} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
            <EquipSlot slot={SLOTS[1]} cardId={equipped.body} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
            <div />
          </>
        ) : (
          <>
            <EquipSlot slot={SLOTS[3]} cardId={equipped.hand1} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
            <EquipSlot slot={SLOTS[1]} cardId={equipped.body} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
            <EquipSlot slot={SLOTS[4]} cardId={equipped.hand2} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
          </>
        )}
        {/* Bottom row: Feet */}
        <div className="col-start-2">
          <EquipSlot slot={SLOTS[2]} cardId={equipped.feet} cardDb={cardDb} isCombat={isCombat} onAction={handleSlotAction} selectedSlotCardId={selectedSlotCardId} onSelect={setSelectedSlotCardId} />
        </div>
      </div>
      {/* Extras */}
      {equipped.extras.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center pt-1 border-t border-munch-border">
          {equipped.extras.map((id) => {
            const def = cardDb?.[id];
            return def ? <GameCard key={id} card={def} compact /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function EquipSlot({
  slot, cardId, cardDb, isCombat, onAction, selectedSlotCardId, onSelect,
}: {
  slot: SlotConfig; cardId: CardId | null; cardDb: CardDb | null; isCombat: boolean;
  onAction: (action: GameAction) => void;
  selectedSlotCardId: CardId | null;
  onSelect: (cardId: CardId | null) => void;
}) {
  const handleDrop = useCallback(
    (payload: DragPayload) => {
      if (isCombat) return;
      if (payload.sourceZone === 'HAND') {
        onAction({ type: 'EQUIP_ITEM', cardId: payload.cardId });
      }
    },
    [isCombat, onAction],
  );

  const dropProps = useDropZone(handleDrop);
  const def = cardId && cardDb ? cardDb[cardId] : null;
  const isSelected = cardId != null && cardId === selectedSlotCardId;
  const goldValue = def?.value ?? null;

  return (
    <div className="relative">
      <div
        {...dropProps}
        className={`w-[54px] h-[72px] rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer ${
          cardId
            ? isSelected
              ? 'border-2 border-amber-400 bg-amber-600/20'
              : 'border border-amber-600/40 bg-amber-600/10'
            : 'border border-dashed border-munch-border bg-munch-surface-light/30'
        } [&.drop-hover]:border-munch-gold [&.drop-hover]:bg-munch-gold/10`}
        onClick={() => {
          if (cardId) {
            onSelect(isSelected ? null : cardId);
          }
        }}
        onDoubleClick={() => {
          if (cardId && !isCombat) onAction({ type: 'UNEQUIP_ITEM', cardId });
        }}
      >
        {def ? (
          <GameCard card={def} compact />
        ) : (
          <div className="text-center">
            <div className="text-[10px] font-bold text-munch-text-muted">{slot.icon}</div>
            <div className="text-[7px] text-munch-text-muted">{slot.label}</div>
          </div>
        )}
      </div>

      {/* Action popup menu */}
      {isSelected && cardId && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-munch-surface border border-munch-border rounded-md shadow-lg p-1 flex flex-col gap-0.5 min-w-[80px]">
          <button
            className="text-[10px] px-2 py-1 rounded text-left hover:bg-munch-surface-light disabled:opacity-40 disabled:cursor-not-allowed text-munch-text whitespace-nowrap"
            disabled={isCombat}
            onClick={(e) => {
              e.stopPropagation();
              if (cardId && !isCombat) onAction({ type: 'UNEQUIP_ITEM', cardId });
            }}
          >
            Unequip
          </button>
          {goldValue != null && (
            <button
              className="text-[10px] px-2 py-1 rounded text-left hover:bg-munch-surface-light disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 whitespace-nowrap"
              disabled={isCombat}
              onClick={(e) => {
                e.stopPropagation();
                if (cardId && !isCombat) onAction({ type: 'SELL_ITEMS', cardIds: [cardId] } as GameAction);
              }}
            >
              Sell ({goldValue}g)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
