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
    ? 'var(--color-danger, #dc2626)'
    : cardType === 'EQUIPMENT'
    ? 'var(--color-gold, #c9a84c)'
    : '#7c3aed';

  return (
    <div
      data-testid={rest['data-testid'] ?? 'door-kick-animation'}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        perspective: '800px',
      }}
    >
      {/* Curse red flash overlay */}
      {cardType === 'CURSE' && (
        <div
          ref={flashRef}
          data-testid="curse-flash"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-danger, #dc2626)',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 60,
          }}
        />
      )}

      {/* Door */}
      <div
        ref={doorRef}
        data-testid="door-panel"
        style={{
          width: '120px',
          height: '180px',
          background: 'linear-gradient(135deg, #5b3a1a, #8b6914)',
          borderRadius: '8px',
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text, #fff)',
          fontFamily: 'var(--font-fantasy, serif)',
          fontWeight: 700,
          fontSize: '16px',
          boxShadow: 'var(--shadow-card)',
          zIndex: 10,
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
        style={{
          width: '120px',
          height: '180px',
          background: 'var(--color-surface, #2a1f10)',
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'var(--color-text, #fff)',
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '14px',
          boxShadow: 'var(--shadow-card)',
          opacity: 0,
          padding: '12px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '10px', color: borderColor, marginBottom: '4px' }}>{cardType}</div>
        {cardTitle}
      </div>
    </div>
  );
}
