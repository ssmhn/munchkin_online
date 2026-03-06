import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface Props {
  winnerName: string;
  onPlayAgain: () => void;
  'data-testid'?: string;
}

export function VictoryScreen({ winnerName, onPlayAgain, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline();

    // Fade in overlay
    tl.from(containerRef.current, { opacity: 0, duration: 0.3 });

    // Confetti burst (100+ particles)
    if (confettiRef.current) {
      const colors = ['#c9a84c', '#f59e0b', '#16a34a', '#3b82f6', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4'];
      for (let i = 0; i < 100; i++) {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = `${3 + Math.random() * 7}px`;
        dot.style.height = `${3 + Math.random() * 7}px`;
        dot.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        dot.style.background = colors[Math.floor(Math.random() * colors.length)];
        dot.style.left = '50%';
        dot.style.top = '40%';
        dot.dataset.testid = 'victory-confetti';
        confettiRef.current.appendChild(dot);

        tl.to(dot, {
          x: (Math.random() - 0.5) * 600,
          y: (Math.random() - 0.5) * 500,
          rotation: Math.random() * 1080 - 540,
          scale: Math.random() * 2,
          opacity: 0,
          duration: 1.5 + Math.random() * 1,
          ease: 'power2.out',
        }, 0.3);
      }
    }

    // Trophy drops with bounce
    if (trophyRef.current) {
      tl.from(trophyRef.current, {
        y: -200,
        duration: 0.8,
        ease: 'bounce.out',
      }, 0.3);

      // Trophy gentle wobble
      tl.to(trophyRef.current, {
        rotation: 5,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      }, 1.1);
    }

    // Winner name: letter-by-letter stagger
    if (nameRef.current) {
      const letters = nameRef.current.querySelectorAll<HTMLSpanElement>('[data-letter]');
      tl.from(letters, {
        y: -50,
        opacity: 0,
        scale: 0,
        stagger: 0.05,
        duration: 0.5,
        ease: 'back.out(2)',
      }, 0.8);
    }

    // Button appears after 2s delay
    tl.call(() => setShowButton(true), [], 2.0);

    return () => {
      tl.kill();
    };
  }, [winnerName]);

  useEffect(() => {
    if (showButton && btnRef.current) {
      gsap.from(btnRef.current, { opacity: 0, y: 30, duration: 0.4, ease: 'power2.out' });
    }
  }, [showButton]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'victory-screen'}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        ref={confettiRef}
        data-testid="victory-confetti-container"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      />

      <div
        ref={trophyRef}
        data-testid="victory-trophy"
        style={{ fontSize: '80px', marginBottom: '16px' }}
      >
        🏆
      </div>

      <div
        ref={nameRef}
        data-testid="winner-name"
        style={{
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '42px',
          fontWeight: 700,
          color: 'var(--color-gold, #c9a84c)',
          textShadow: '0 0 20px rgba(201, 168, 76, 0.5)',
          marginBottom: '8px',
          display: 'flex',
        }}
      >
        {winnerName.split('').map((char, i) => (
          <span key={i} data-letter style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : undefined }}>
            {char}
          </span>
        ))}
      </div>

      <div
        data-testid="victory-subtitle"
        style={{
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '20px',
          color: 'var(--color-text-muted, #a39880)',
          marginBottom: '32px',
        }}
      >
        Wins the Game!
      </div>

      {showButton && (
        <button
          ref={btnRef}
          data-testid="play-again-btn"
          onClick={onPlayAgain}
          style={{
            padding: '12px 32px',
            background: 'var(--color-gold, #c9a84c)',
            color: 'var(--color-bg, #1a1208)',
            border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            fontFamily: 'var(--font-fantasy, serif)',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
      )}
    </div>
  );
}
