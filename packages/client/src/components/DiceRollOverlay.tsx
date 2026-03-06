import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface Props {
  result: number;
  successThreshold?: number;
  onComplete: () => void;
  'data-testid'?: string;
}

export function DiceRollOverlay({ result, successThreshold = 5, onComplete, ...rest }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const diceRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const [displayNumber, setDisplayNumber] = useState(1);
  const [settled, setSettled] = useState(false);

  const isSuccess = result >= successThreshold;

  useEffect(() => {
    if (!diceRef.current || !numberRef.current) return;

    const tl = gsap.timeline({ onComplete });

    // Overlay fade in
    if (overlayRef.current) {
      tl.from(overlayRef.current, { opacity: 0, duration: 0.2 });
    }

    // Dice spin with random numbers flickering
    const flickerInterval = { value: 0 };
    tl.to(diceRef.current, {
      rotationX: 720 + Math.random() * 360,
      rotationY: 540 + Math.random() * 360,
      duration: 1.5,
      ease: 'power4.out',
      onStart: () => {
        flickerInterval.value = window.setInterval(() => {
          setDisplayNumber(Math.floor(Math.random() * 6) + 1);
        }, 80);
      },
      onComplete: () => {
        clearInterval(flickerInterval.value);
        setDisplayNumber(result);
        setSettled(true);
      },
    }, 0.2);

    // Land: scale pulse
    tl.fromTo(diceRef.current,
      { scale: 1.3 },
      { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' },
      1.7,
    );

    // Success/fail glow
    const glowColor = isSuccess
      ? 'drop-shadow(0 0 20px rgba(22, 163, 74, 0.8))'
      : 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.8))';
    tl.to(diceRef.current, {
      filter: glowColor,
      duration: 0.3,
    }, 2.0);

    // Fail: screen shake
    if (!isSuccess && overlayRef.current) {
      tl.to(overlayRef.current, {
        x: [0, -5, 5, -5, 0],
        duration: 0.3,
        ease: 'none',
      }, 2.0);
    }

    // Hold result visible
    tl.to({}, { duration: 0.8 });

    return () => {
      clearInterval(flickerInterval.value);
      tl.kill();
    };
  }, [result, isSuccess, onComplete]);

  return (
    <div
      ref={overlayRef}
      data-testid={rest['data-testid'] ?? 'dice-roll-overlay'}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      <div
        ref={diceRef}
        data-testid="dice-cube"
        style={{
          width: '100px',
          height: '100px',
          background: '#fff',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          transformStyle: 'preserve-3d',
          perspective: '600px',
        }}
      >
        <span
          ref={numberRef}
          data-testid="dice-number"
          style={{
            fontSize: '48px',
            fontWeight: 700,
            fontFamily: 'var(--font-fantasy, serif)',
            color: settled
              ? isSuccess ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)'
              : '#333',
          }}
        >
          {displayNumber}
        </span>
      </div>

      {settled && (
        <div
          data-testid="dice-result-label"
          style={{
            marginTop: '16px',
            fontFamily: 'var(--font-fantasy, serif)',
            fontSize: '24px',
            fontWeight: 700,
            color: isSuccess ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
          }}
        >
          {isSuccess ? 'Success!' : 'Failed!'}
        </div>
      )}
    </div>
  );
}
