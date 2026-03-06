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

  const bgColor = deckType === 'DOOR' ? 'var(--color-info, #7c3aed)' : 'var(--color-gold, #d97706)';

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'card-draw-animation'}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          data-draw-card={card.id}
          data-testid={`draw-card-${card.id}`}
          style={{
            position: 'absolute',
            width: '100px',
            height: '140px',
            borderRadius: 'var(--radius-md, 8px)',
            background: flippedCards.has(card.id)
              ? 'var(--color-surface, #2a1f10)'
              : bgColor,
            border: flippedCards.has(card.id)
              ? '2px solid var(--color-gold, #c9a84c)'
              : '2px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'var(--font-fantasy, serif)',
            color: 'var(--color-text, #fff)',
            boxShadow: 'var(--shadow-card, 0 4px 12px rgba(0,0,0,0.5))',
            opacity: 0,
            backfaceVisibility: 'hidden',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          {flippedCards.has(card.id) ? card.label : deckType === 'DOOR' ? 'Door' : 'Treasure'}
        </div>
      ))}
    </div>
  );
}
