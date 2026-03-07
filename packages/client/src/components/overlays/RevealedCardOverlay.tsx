import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { RevealedCard, CardDb, GameAction } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { GoldButton } from '../GoldButton';

interface Props {
  revealed: RevealedCard;
  cardDb: CardDb | null;
  isOwner: boolean;
  reactionWindowOpen: boolean;
  onAction: (action: GameAction) => void;
}

export function RevealedCardOverlay({ revealed, cardDb, isOwner, reactionWindowOpen, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    }
    if (cardRef.current) {
      if (revealed.source === 'KICK_DOOR') {
        gsap.fromTo(cardRef.current,
          { scale: 0.3, rotation: -10, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1, ease: 'elastic.out(1, 0.5)', duration: 0.6 },
        );
      } else {
        gsap.fromTo(cardRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
      }
    }
  }, [revealed.source]);

  const card = cardDb?.[revealed.cardId];

  const handleApply = () => {
    onAction({ type: 'APPLY_REVEALED_CARD', cardId: revealed.cardId });
  };

  const sourceLabel = {
    KICK_DOOR: 'Door Card',
    LOOT_DOOR: 'Looted Door',
    LOOT_TREASURE: 'Looted Treasure',
    AFTER_COMBAT_TREASURE: 'Combat Reward',
  }[revealed.source];

  return (
    <div
      ref={ref}
      data-testid="revealed-card-overlay"
      className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[3000] pointer-events-auto"
    >
      <div className="text-xs text-munch-text-muted uppercase tracking-wider mb-3 font-semibold">
        {sourceLabel}
      </div>

      <div ref={cardRef} className="transform scale-150 mb-6">
        {card ? (
          <GameCard card={card} />
        ) : (
          /* Fallback when card definition is not in cardDb */
          <div className="w-[120px] h-[170px] rounded-lg bg-munch-surface border-2 border-munch-gold flex flex-col items-center justify-center p-3 shadow-[0_2px_16px_rgba(201,168,76,0.3)]">
            <div className="text-[10px] text-munch-gold uppercase font-bold mb-2">
              {revealed.source === 'KICK_DOOR' ? 'Door' : 'Treasure'}
            </div>
            <div className="text-xs font-bold text-munch-text text-center font-fantasy leading-snug">
              {revealed.cardId.replace(/_/g, ' ')}
            </div>
          </div>
        )}
      </div>

      {reactionWindowOpen && (
        <div className="text-sm text-munch-info font-semibold mb-3 animate-pulse">
          Waiting for reactions...
        </div>
      )}

      {isOwner && !reactionWindowOpen && (
        <GoldButton
          onClick={handleApply}
          data-testid="btn-apply-revealed"
        >
          Apply Card
        </GoldButton>
      )}

      {isOwner && reactionWindowOpen && (
        <div className="text-sm text-munch-text-muted font-semibold">
          Waiting for reactions...
        </div>
      )}

      {!isOwner && (
        <div className="text-xs text-munch-text-muted">
          {revealed.ownerId}&apos;s card
        </div>
      )}
    </div>
  );
}
