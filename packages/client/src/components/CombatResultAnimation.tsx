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
          x: [0, -10, 10, -10, 0],
          duration: 0.4,
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
    ? 'var(--color-gold, #c9a84c)'
    : outcome === 'DEFEAT'
    ? 'var(--color-danger, #dc2626)'
    : 'var(--color-success, #16a34a)';

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'combat-result-animation'}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '280px',
        overflow: 'hidden',
      }}
    >
      {/* Defeat overlay */}
      <div
        ref={overlayRef}
        data-testid="defeat-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Confetti container */}
      <div
        ref={confettiRef}
        data-testid="confetti-container"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}
      />

      {/* Player card */}
      <div
        ref={playerRef}
        data-testid="combat-player"
        style={{
          width: '100px',
          height: '140px',
          background: 'var(--color-surface, #2a1f10)',
          border: '2px solid var(--color-gold, #c9a84c)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text, #fff)',
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '14px',
          marginRight: '40px',
          zIndex: 10,
        }}
      >
        Player
      </div>

      {/* Monster card */}
      <div
        ref={monsterRef}
        data-testid="combat-monster"
        style={{
          width: '100px',
          height: '140px',
          background: 'var(--color-surface, #2a1f10)',
          border: '2px solid var(--color-danger, #dc2626)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text, #fff)',
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '14px',
          zIndex: 10,
        }}
      >
        Monster
      </div>

      {/* Result label */}
      <div
        ref={labelRef}
        data-testid="result-label"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0)',
          fontFamily: 'var(--font-fantasy, serif)',
          fontSize: '32px',
          fontWeight: 700,
          color: labelColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          zIndex: 30,
          opacity: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {labelText}
      </div>
    </div>
  );
}
