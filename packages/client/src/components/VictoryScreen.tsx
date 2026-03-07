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
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });

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
      tl.fromTo(trophyRef.current, { y: -200 }, {
        y: 0,
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
      tl.fromTo(letters, { y: -50, opacity: 0, scale: 0 }, {
        y: 0,
        opacity: 1,
        scale: 1,
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
      gsap.fromTo(btnRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, [showButton]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'victory-screen'}
      className="fixed inset-0 bg-black/85 flex flex-col items-center justify-center z-[200]"
    >
      <div
        ref={confettiRef}
        data-testid="victory-confetti-container"
        className="absolute inset-0 pointer-events-none overflow-hidden"
      />

      <div
        ref={trophyRef}
        data-testid="victory-trophy"
        className="text-[80px] mb-4"
      >
        🏆
      </div>

      <div
        ref={nameRef}
        data-testid="winner-name"
        className="font-fantasy text-[42px] font-bold text-munch-gold mb-2 flex"
        style={{ textShadow: '0 0 20px rgba(201, 168, 76, 0.5)' }}
      >
        {winnerName.split('').map((char, i) => (
          <span key={i} data-letter className={`inline-block ${char === ' ' ? 'whitespace-pre' : ''}`}>
            {char}
          </span>
        ))}
      </div>

      <div
        data-testid="victory-subtitle"
        className="font-fantasy text-xl text-munch-text-muted mb-8"
      >
        Wins the Game!
      </div>

      {showButton && (
        <button
          ref={btnRef}
          data-testid="play-again-btn"
          onClick={onPlayAgain}
          className="py-3 px-8 bg-munch-gold text-munch-bg border-none rounded-lg font-fantasy font-bold text-base cursor-pointer"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
