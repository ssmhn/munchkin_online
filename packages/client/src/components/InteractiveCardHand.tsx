import React, { useRef, useCallback } from 'react';
import gsap from 'gsap';

interface CardInfo {
  id: string;
  label: string;
  playable: boolean;
}

interface Props {
  cards: CardInfo[];
  onPlayCard: (cardId: string) => void;
  'data-testid'?: string;
}

export function InteractiveCardHand({ cards, onPlayCard, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { y: -20, scale: 1.1, duration: 0.2, ease: 'power2.out', zIndex: 10 });
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { y: 0, scale: 1, duration: 0.2, ease: 'power2.out', zIndex: 1 });
  }, []);

  const handleClick = useCallback((card: CardInfo, el: HTMLDivElement) => {
    if (!card.playable) {
      // Shake + red flash for forbidden card
      const tl = gsap.timeline();
      tl.to(el, { keyframes: [
        { x: -5, duration: 0.075 },
        { x: 5, duration: 0.075 },
        { x: -5, duration: 0.075 },
        { x: 0, duration: 0.075 },
      ], ease: 'none' });
      tl.to(el, { borderColor: 'var(--color-munch-danger)', duration: 0.1 }, 0);
      tl.to(el, { borderColor: 'var(--color-munch-border)', duration: 0.3 }, 0.2);
      return;
    }

    // Play card: fly to center then fade out
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = el.getBoundingClientRect();
    const targetX = containerRect.width / 2 - cardRect.width / 2 - (cardRect.left - containerRect.left);
    const targetY = -containerRect.height - 50;

    const tl = gsap.timeline({
      onComplete: () => {
        onPlayCard(card.id);
        // Re-layout remaining cards
        if (container) {
          const remaining = container.querySelectorAll<HTMLDivElement>('[data-hand-card]');
          gsap.to(remaining, { x: 0, stagger: 0.05, duration: 0.3, ease: 'power2.out' });
        }
      },
    });

    tl.to(el, {
      x: targetX,
      y: targetY,
      rotation: 15,
      scale: 0.8,
      duration: 0.4,
      ease: 'power2.in',
    });
    tl.to(el, { opacity: 0, duration: 0.2, ease: 'power2.in' });
  }, [onPlayCard]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'interactive-hand'}
      className="flex gap-2 justify-center p-4 relative"
    >
      {cards.map((card) => (
        <div
          key={card.id}
          data-hand-card={card.id}
          data-testid={`hand-card-${card.id}`}
          data-playable={card.playable ? 'true' : 'false'}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => handleMouseEnter(e as unknown as React.MouseEvent<HTMLDivElement>)}
          onTouchEnd={(e) => handleMouseLeave(e as unknown as React.MouseEvent<HTMLDivElement>)}
          onClick={(e) => handleClick(card, e.currentTarget)}
          className={`w-[100px] h-[140px] bg-munch-surface rounded-lg flex items-center justify-center text-munch-text font-fantasy text-xs shadow-card relative z-[1] p-2 text-center border-2 ${
            card.playable
              ? 'border-munch-gold cursor-pointer opacity-100'
              : 'border-munch-border cursor-not-allowed opacity-60'
          }`}
        >
          {card.label}
        </div>
      ))}
    </div>
  );
}
