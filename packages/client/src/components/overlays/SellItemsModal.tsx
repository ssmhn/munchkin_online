import React, { useState, useMemo } from 'react';
import type { CardDb, GameAction, CardId } from '@munchkin/shared';
import { GoldButton } from '../GoldButton';

interface Props {
  handCards: CardId[];
  carriedCards: CardId[];
  cardDb: CardDb | null;
  playerLevel: number;
  winLevel: number;
  soldGold?: number;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}

export function SellItemsModal({ handCards, carriedCards, cardDb, playerLevel, winLevel, soldGold = 0, onAction, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sellableCards = useMemo(() => {
    const all = [...handCards, ...carriedCards];
    return all.filter((id) => {
      const def = cardDb?.[id];
      return def && def.value != null && def.value > 0;
    });
  }, [handCards, carriedCards, cardDb]);

  const { totalGold, accumulatedGold, levelsGained } = useMemo(() => {
    let gold = 0;
    for (const id of selected) {
      const def = cardDb?.[id];
      if (def?.value) gold += def.value;
    }
    const accumulated = gold + soldGold;
    return { totalGold: gold, accumulatedGold: accumulated, levelsGained: Math.floor(accumulated / 1000) };
  }, [selected, cardDb, soldGold]);

  const wouldReachWinLevel = playerLevel + levelsGained >= winLevel;

  const toggleCard = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSell = () => {
    if (selected.size === 0 || wouldReachWinLevel) return;
    onAction({ type: 'SELL_ITEMS', cardIds: Array.from(selected) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[4000]" onClick={onClose}>
      <div className="bg-munch-surface rounded-xl p-6 max-w-[420px] w-full mx-4 border border-munch-border" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-munch-gold font-fantasy text-lg mb-4">Sell Items</h3>

        {sellableCards.length === 0 ? (
          <p className="text-sm text-munch-text-muted">No sellable items.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-4 max-h-[300px] overflow-auto">
            {sellableCards.map((id) => {
              const def = cardDb?.[id];
              if (!def) return null;
              return (
                <button
                  key={id}
                  onClick={() => toggleCard(id)}
                  className={`flex justify-between items-center py-2 px-3 rounded-lg text-left text-sm cursor-pointer transition-colors ${
                    selected.has(id) ? 'border-2 border-munch-gold bg-munch-gold/10 text-munch-text' : 'border border-munch-border bg-transparent text-munch-text'
                  }`}
                >
                  <span>{def.name}</span>
                  <span className="text-amber-500 font-bold">{def.value}gp</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-sm text-munch-text mb-1">
          Выбрано: <span className="text-amber-500 font-bold">{totalGold} gp</span>
          {soldGold > 0 && <span className="text-munch-text-muted"> + {soldGold} ранее</span>}
          {' = '}<span className="text-amber-500 font-bold">{accumulatedGold} gp</span>
          {' -> '}<span className="text-green-400 font-bold">+{levelsGained} ур.</span>
        </div>
        <div className="w-full h-1.5 bg-munch-surface-light rounded-sm mb-1">
          <div
            className="h-full bg-amber-500 rounded-sm transition-all"
            style={{ width: `${Math.min(100, (accumulatedGold % 1000) / 10)}%` }}
          />
        </div>

        {wouldReachWinLevel && (
          <div className="text-xs text-red-400 mb-3">Cannot reach winning level by selling!</div>
        )}

        <div className="flex gap-2 mt-3">
          <GoldButton onClick={handleSell} disabled={selected.size === 0 || wouldReachWinLevel}>
            Sell
          </GoldButton>
          <GoldButton onClick={onClose} variant="danger">
            Cancel
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
