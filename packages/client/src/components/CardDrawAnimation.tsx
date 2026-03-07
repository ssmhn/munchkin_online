import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';

interface DrawCard {
  id: string;
  label: string;
}

interface Props {
  cards: DrawCard[];
  deckType: 'DOOR' | 'TREASURE';
  /** Ref to the deck element to get starting position */
  deckRef: React.RefObject<HTMLElement | null>;
  /** Ref to the hand area to get ending position */
  handRef: React.RefObject<HTMLElement | null>;
  onComplete: () => void;
  'data-testid'?: string;
}

export function CardDrawAnimation({ cards, deckType, deckRef, handRef, onComplete, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!containerRef.current || !deckRef.current || !handRef.current || cards.length === 0) {
      onComplete();
      return;
    }

    const deckRect = deckRef.current.getBoundingClientRect();
    const handRect = handRef.current.getBoundingClientRect();

    const cardEls = containerRef.current.querySelectorAll<HTMLDivElement>('[data-draw-card]');
    if (cardEls.length === 0) {
      onComplete();
      return;
    }

    const tl = gsap.timeline({
      onComplete,
    });

    cardEls.forEach((el, i) => {
      const cardId = el.dataset.drawCard!;

      // Start from deck position
      gsap.set(el, {
        x: deckRect.left + deckRect.width / 2 - 50,
        y: deckRect.top + deckRect.height / 2 - 70,
        opacity: 1,
        rotateY: 0,
      });

      const targetX = handRect.left + i * 60 + 20;
      const targetY = handRect.top + handRect.height / 2 - 70;
      const delay = i * 0.15;

      // Fly to hand
      tl.to(el, {
        x: targetX,
        y: targetY,
        duration: 0.4,
        ease: 'power2.out',
      }, delay);

      // Flip: rotate to 90 (hide face)
      tl.to(el, {
        rotateY: 90,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          setFlippedCards((prev) => new Set(prev).add(cardId));
        },
      }, delay + 0.4);

      // Flip back: rotate to 0 (show face)
      tl.to(el, {
        rotateY: 0,
        duration: 0.15,
        ease: 'power2.out',
      }, delay + 0.55);
    });

    return () => {
      tl.kill();
    };
  }, [cards, deckRef, handRef, onComplete]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'card-draw-animation'}
      className="fixed inset-0 pointer-events-none z-50"
    >
      {cards.map((card) => (
        <div
          key={card.id}
          data-draw-card={card.id}
          data-testid={`draw-card-${card.id}`}
          className={`absolute w-[100px] h-[140px] rounded-lg flex items-center justify-center text-[11px] font-fantasy text-munch-text shadow-card opacity-0 p-2 text-center ${
            flippedCards.has(card.id)
              ? 'bg-munch-surface border-2 border-munch-gold'
              : deckType === 'DOOR'
              ? 'bg-munch-monster border-2 border-white/30'
              : 'border-2 border-white/30'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            ...(!flippedCards.has(card.id) && deckType === 'TREASURE'
              ? { background: 'var(--color-munch-gold)' }
              : {}),
          }}
        >
          {flippedCards.has(card.id) ? card.label : deckType === 'DOOR' ? 'Door' : 'Treasure'}
        </div>
      ))}
    </div>
  );
}
