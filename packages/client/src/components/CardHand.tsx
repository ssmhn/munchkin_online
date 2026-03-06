import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  cards: string[];
  isSelf: boolean;
}

export function CardHand({ cards, isSelf }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isSelf) {
      const children = containerRef.current.children;
      gsap.from(children, {
        y: 60,
        opacity: 0,
        stagger: 0.08,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, [cards.length, isSelf]);

  return (
    <div ref={containerRef} data-testid={isSelf ? 'own-hand' : 'other-hand'} style={{ display: 'flex', gap: '4px' }}>
      {cards.map((card, i) => (
        <div
          key={`${card}-${i}`}
          data-testid={isSelf ? `card-${card}` : 'card-back'}
          style={{
            width: '60px',
            height: '90px',
            border: '1px solid #666',
            borderRadius: '4px',
            background: isSelf ? '#2d3748' : '#4a1942',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#ccc',
          }}
        >
          {isSelf ? card : '?'}
        </div>
      ))}
    </div>
  );
}
