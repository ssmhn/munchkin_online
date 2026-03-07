import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

type CombatOutcome = 'VICTORY' | 'DEFEAT' | 'ESCAPE';

interface Props {
  outcome: CombatOutcome;
  onComplete: () => void;
  'data-testid'?: string;
}

export function CombatResultAnimation({ outcome, onComplete, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({ onComplete });

    // Clash animation: both sides move toward center
    if (playerRef.current && monsterRef.current) {
      tl.to(playerRef.current, { x: 50, duration: 0.2, ease: 'power2.in' }, 0);
      tl.to(monsterRef.current, { x: -50, duration: 0.2, ease: 'power2.in' }, 0);
      tl.to(playerRef.current, { x: 0, duration: 0.15, ease: 'power2.out' }, 0.2);
      tl.to(monsterRef.current, { x: 0, duration: 0.15, ease: 'power2.out' }, 0.2);
    }

    if (outcome === 'VICTORY') {
      // Confetti burst
      if (confettiRef.current) {
        const colors = ['#c9a84c', '#f59e0b', '#16a34a', '#3b82f6', '#dc2626', '#8b5cf6'];
        for (let i = 0; i < 80; i++) {
          const dot = document.createElement('div');
          dot.style.position = 'absolute';
          dot.style.width = `${4 + Math.random() * 6}px`;
          dot.style.height = `${4 + Math.random() * 6}px`;
          dot.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
          dot.style.background = colors[Math.floor(Math.random() * colors.length)];
          dot.style.left = '50%';
          dot.style.top = '50%';
          dot.dataset.testid = 'confetti-particle';
          confettiRef.current.appendChild(dot);

          tl.to(dot, {
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            rotation: Math.random() * 720 - 360,
            opacity: 0,
            duration: 1 + Math.random() * 0.5,
            ease: 'power2.out',
          }, 0.35);
        }
      }

      // Monster flies to discard
      if (monsterRef.current) {
        tl.to(monsterRef.current, {
          x: 300,
          y: -200,
          opacity: 0,
          rotation: 30,
          duration: 0.6,
          ease: 'power2.in',
        }, 0.5);
      }

      // Victory label
      if (labelRef.current) {
        tl.fromTo(labelRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
          0.4,
        );
      }
    } else if (outcome === 'DEFEAT') {
      // Dark overlay
      if (overlayRef.current) {
        tl.to(overlayRef.current, { opacity: 0.7, duration: 0.4, ease: 'power2.out' }, 0.35);
      }

      // Player shake
      if (playerRef.current) {
        tl.to(playerRef.current, {
          keyframes: [
            { x: -10, duration: 0.1 },
            { x: 10, duration: 0.1 },
            { x: -10, duration: 0.1 },
            { x: 0, duration: 0.1 },
          ],
          ease: 'none',
        }, 0.5);
      }

      // Defeat label
      if (labelRef.current) {
        tl.fromTo(labelRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
          0.6,
        );
      }
    } else if (outcome === 'ESCAPE') {
      // Player runs off screen left
      if (playerRef.current) {
        tl.to(playerRef.current, { x: -600, duration: 0.4, ease: 'power2.in' }, 0.35);
        // Returns from right
        tl.set(playerRef.current, { x: 600 }, 0.8);
        tl.to(playerRef.current, { x: 0, duration: 0.5, ease: 'power2.out' }, 0.8);
      }

      // Escape label
      if (labelRef.current) {
        tl.fromTo(labelRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
          0.5,
        );
      }
    }

    return () => {
      tl.kill();
    };
  }, [outcome, onComplete]);

  const labelText = outcome === 'VICTORY' ? 'VICTORY!' : outcome === 'DEFEAT' ? 'DEFEAT' : 'ESCAPED!';
  const labelColor = outcome === 'VICTORY'
    ? 'var(--color-munch-gold)'
    : outcome === 'DEFEAT'
    ? 'var(--color-munch-danger)'
    : 'var(--color-munch-success)';

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'combat-result-animation'}
      className="relative flex items-center justify-center min-h-[280px] overflow-hidden"
    >
      {/* Defeat overlay */}
      <div
        ref={overlayRef}
        data-testid="defeat-overlay"
        className="absolute inset-0 bg-black opacity-0 pointer-events-none z-[5]"
      />

      {/* Confetti container */}
      <div
        ref={confettiRef}
        data-testid="confetti-container"
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* Player card */}
      <div
        ref={playerRef}
        data-testid="combat-player"
        className="w-[100px] h-[140px] bg-munch-surface border-2 border-munch-gold rounded-lg flex items-center justify-center text-munch-text font-fantasy text-sm mr-10 z-10"
      >
        Player
      </div>

      {/* Monster card */}
      <div
        ref={monsterRef}
        data-testid="combat-monster"
        className="w-[100px] h-[140px] bg-munch-surface border-2 border-munch-danger rounded-lg flex items-center justify-center text-munch-text font-fantasy text-sm z-10"
      >
        Monster
      </div>

      {/* Result label */}
      <div
        ref={labelRef}
        data-testid="result-label"
        className="absolute top-1/2 left-1/2 font-fantasy text-[32px] font-bold z-30 opacity-0 whitespace-nowrap"
        style={{
          transform: 'translate(-50%, -50%) scale(0)',
          color: labelColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {labelText}
      </div>
    </div>
  );
}
