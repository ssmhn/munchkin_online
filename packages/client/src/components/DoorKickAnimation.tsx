import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

type CardRevealType = 'MONSTER' | 'EQUIPMENT' | 'CURSE';

interface Props {
  cardType: CardRevealType;
  cardTitle: string;
  onComplete: () => void;
  'data-testid'?: string;
}

export function DoorKickAnimation({ cardType, cardTitle, onComplete, ...rest }: Props) {
  const doorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);

  useEffect(() => {
    if (!doorRef.current || !contentRef.current) return;

    const tl = gsap.timeline({ onComplete });
    tlRef.current = tl;

    // Door opens: rotateY 0 → -110°
    tl.to(doorRef.current, {
      rotateY: -110,
      duration: 0.5,
      ease: 'power2.inOut',
      transformOrigin: 'left center',
      onComplete: () => setDoorOpen(true),
    });

    // Content appears based on card type
    if (cardType === 'MONSTER') {
      gsap.set(contentRef.current, { scale: 0.3, opacity: 0, rotation: -10 });
      tl.to(contentRef.current, {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      });
    } else if (cardType === 'EQUIPMENT') {
      gsap.set(contentRef.current, { y: -100, opacity: 0, rotation: 15 });
      tl.to(contentRef.current, {
        y: 0,
        opacity: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'bounce.out',
      });
    } else if (cardType === 'CURSE') {
      gsap.set(contentRef.current, { opacity: 0 });
      // Red flash overlay
      if (flashRef.current) {
        tl.fromTo(flashRef.current,
          { opacity: 0 },
          { opacity: 0.4, duration: 0.15, ease: 'power2.out' },
        );
        tl.to(flashRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
      tl.to(contentRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      }, '-=0.3');
    }

    // Settle card in place
    tl.to(contentRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power1.out',
    });

    return () => {
      tl.kill();
    };
  }, [cardType, onComplete]);

  const borderColor = cardType === 'MONSTER'
    ? 'var(--color-munch-danger)'
    : cardType === 'EQUIPMENT'
    ? 'var(--color-munch-gold)'
    : '#7c3aed';

  return (
    <div
      data-testid={rest['data-testid'] ?? 'door-kick-animation'}
      className="relative flex items-center justify-center min-h-[240px]"
      style={{ perspective: '800px' }}
    >
      {/* Curse red flash overlay */}
      {cardType === 'CURSE' && (
        <div
          ref={flashRef}
          data-testid="curse-flash"
          className="fixed inset-0 bg-munch-danger opacity-0 pointer-events-none z-[60]"
        />
      )}

      {/* Door */}
      <div
        ref={doorRef}
        data-testid="door-panel"
        className="w-[120px] h-[180px] rounded-lg absolute flex items-center justify-center text-munch-text font-fantasy font-bold text-base shadow-card z-10"
        style={{
          background: 'linear-gradient(135deg, #5b3a1a, #8b6914)',
          transformStyle: 'preserve-3d',
        }}
      >
        {!doorOpen && 'DOOR'}
      </div>

      {/* Revealed content */}
      <div
        ref={contentRef}
        data-testid="revealed-card"
        data-card-type={cardType}
        className="w-[120px] h-[180px] bg-munch-surface rounded-lg flex items-center justify-center flex-col text-munch-text font-fantasy text-sm shadow-card opacity-0 p-3 text-center"
        style={{ border: `2px solid ${borderColor}` }}
      >
        <div className="text-[10px] mb-1" style={{ color: borderColor }}>{cardType}</div>
        {cardTitle}
      </div>
    </div>
  );
}
