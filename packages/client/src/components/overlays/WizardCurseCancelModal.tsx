import React, { useState } from 'react';
import type { CardId, CardDb, GameAction } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { GoldButton } from '../GoldButton';

interface Props {
  curseDescription: string;
  handCards: CardId[];
  cardDb: CardDb | null;
  onAction: (action: GameAction) => void;
  onSkip: () => void;
}

export function WizardCurseCancelModal({ curseDescription, handCards, cardDb, onAction, onSkip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCancel = () => {
    onAction({ type: 'WIZARD_CANCEL_CURSE', cardIds: Array.from(selected) });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[4000]">
      <div className="bg-munch-surface rounded-xl p-6 max-w-[420px] w-full mx-4 border border-munch-border">
        <h3 className="text-munch-gold font-fantasy text-lg mb-2">Wizard - Cancel Curse?</h3>
        <p className="text-sm text-munch-text-muted mb-1">Curse received:</p>
        <p className="text-sm text-red-400 mb-4">{curseDescription}</p>
        <p className="text-xs text-munch-text-muted mb-3">Discard cards from your hand to cancel (1 card = 1 curse cancelled):</p>

        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {handCards.map((cardId) => {
            const def = cardDb?.[cardId];
            return (
              <div
                key={cardId}
                onClick={() => toggleCard(cardId)}
                className={`cursor-pointer transition-all ${selected.has(cardId) ? 'ring-2 ring-munch-gold scale-105' : 'opacity-70'}`}
              >
                {def ? <GameCard card={def} compact /> : <div className="w-[54px] h-[76px] bg-munch-surface-light rounded-md border border-munch-border" />}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <GoldButton onClick={handleCancel} disabled={selected.size === 0}>
            Cancel Curse ({selected.size} card{selected.size !== 1 ? 's' : ''})
          </GoldButton>
          <GoldButton onClick={onSkip} variant="danger">
            Accept Curse
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
