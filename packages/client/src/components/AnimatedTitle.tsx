import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  text: string;
  'data-testid'?: string;
}

export function AnimatedTitle({ text, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const letters = containerRef.current.querySelectorAll<HTMLSpanElement>('[data-letter]');
    gsap.from(letters, {
      y: 40,
      opacity: 0,
      stagger: 0.05,
      duration: 0.6,
      ease: 'back.out(1.5)',
    });
  }, [text]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'animated-title'}
      style={{
        fontFamily: 'var(--font-fantasy, serif)',
        fontSize: '36px',
        fontWeight: 700,
        color: 'var(--color-gold, #c9a84c)',
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {text.split('').map((char, i) => (
        <span
          key={i}
          data-letter={char}
          data-testid="title-letter"
          style={{
            display: 'inline-block',
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
