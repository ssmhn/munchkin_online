import React, { useState } from 'react';
import type { CardId, CardDb } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { GoldButton } from '../GoldButton';

interface Props {
  handCards: CardId[];
  cardDb: CardDb | null;
  onChoose: (discardedCardId?: string) => void;
}

export function HalflingEscapeModal({ handCards, cardDb, onChoose }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[4000]">
      <div className="bg-munch-surface rounded-xl p-6 max-w-[420px] w-full mx-4 border border-munch-border">
        <h3 className="text-munch-gold font-fantasy text-lg mb-2">Halfling - Escape Bonus?</h3>
        <p className="text-sm text-munch-text-muted mb-4">
          Discard a card from your hand for +1 to your escape roll.
        </p>

        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {handCards.map((cardId) => {
            const def = cardDb?.[cardId];
            return (
              <div
                key={cardId}
                onClick={() => setSelectedCard(cardId === selectedCard ? null : cardId)}
                className={`cursor-pointer transition-all ${selectedCard === cardId ? 'ring-2 ring-munch-gold scale-105' : 'opacity-70'}`}
              >
                {def ? <GameCard card={def} compact /> : <div className="w-[54px] h-[76px] bg-munch-surface-light rounded-md border border-munch-border" />}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <GoldButton onClick={() => onChoose(selectedCard ?? undefined)} disabled={!selectedCard}>
            Discard for +1
          </GoldButton>
          <GoldButton onClick={() => onChoose()} variant="danger">
            Skip - No Bonus
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
