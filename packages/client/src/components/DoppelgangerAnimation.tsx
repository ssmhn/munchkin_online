import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface MonsterInfo {
  instanceId: string;
  name: string;
}

interface Props {
  originalMonster: MonsterInfo;
  /** If multiple monsters, show pulsating choice; null means auto-clone */
  allMonsters?: MonsterInfo[];
  onChoose?: (instanceId: string) => void;
  onComplete: () => void;
  'data-testid'?: string;
}

export function DoppelgangerAnimation({
  originalMonster,
  allMonsters,
  onChoose,
  onComplete,
  ...rest
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const pulseTweens = useRef<gsap.core.Tween[]>([]);
  const [cloneVisible, setCloneVisible] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const needsChoice = allMonsters && allMonsters.length > 1 && !chosen;

  useEffect(() => {
    if (!containerRef.current || !originalRef.current || !cloneRef.current) return;

    if (needsChoice) {
      // Pulsate all monsters waiting for choice
      const cards = containerRef.current.querySelectorAll<HTMLDivElement>('[data-monster-card]');
      cards.forEach((card) => {
        const tween = gsap.to(card, {
          scale: 1.05,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        pulseTweens.current.push(tween);
      });

      return () => {
        pulseTweens.current.forEach((t) => t.kill());
        pulseTweens.current = [];
      };
    }

    // Clone animation
    const tl = gsap.timeline({
      onComplete: () => {
        setCloneVisible(true);
        onComplete();
      },
    });

    // Shadow separates from original
    tl.fromTo(cloneRef.current,
      { x: 0, opacity: 0, filter: 'blur(20px)', scale: 0.8 },
      { x: 130, opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.8, ease: 'power2.out' },
    );

    // SVG arc appears
    if (arcRef.current) {
      const pathLength = arcRef.current.getTotalLength();
      gsap.set(arcRef.current, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
      tl.to(arcRef.current, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: 'power2.out',
      }, 0.3);
    }

    return () => {
      tl.kill();
    };
  }, [needsChoice, onComplete]);

  const handleChoose = (instanceId: string) => {
    // Kill all pulse tweens
    pulseTweens.current.forEach((t) => t.kill());
    pulseTweens.current = [];

    setChosen(instanceId);
    onChoose?.(instanceId);
  };

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'doppelganger-animation'}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: '16px',
      }}
    >
      {/* If choosing between multiple monsters */}
      {needsChoice && allMonsters!.map((m) => (
        <div
          key={m.instanceId}
          data-monster-card={m.instanceId}
          data-testid={`monster-choice-${m.instanceId}`}
          onClick={() => handleChoose(m.instanceId)}
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
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
            padding: '8px',
          }}
        >
          {m.name}
        </div>
      ))}

      {/* Auto-clone or post-choice clone animation */}
      {!needsChoice && (
        <>
          {/* Original */}
          <div
            ref={originalRef}
            data-testid="original-monster"
            style={{
              width: '100px',
              height: '140px',
              background: 'var(--color-surface, #2a1f10)',
              border: `2px solid ${chosen ? 'var(--color-gold, #c9a84c)' : 'var(--color-danger, #dc2626)'}`,
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text, #fff)',
              fontFamily: 'var(--font-fantasy, serif)',
              fontSize: '12px',
              boxShadow: chosen ? 'var(--shadow-glow-gold, 0 0 16px rgba(201, 168, 76, 0.5))' : 'var(--shadow-card)',
              textAlign: 'center',
              padding: '8px',
            }}
          >
            {originalMonster.name}
          </div>

          {/* SVG arc */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <path
              ref={arcRef}
              data-testid="clone-arc"
              d="M 160 100 Q 210 40 260 100"
              fill="none"
              stroke="var(--color-gold, #c9a84c)"
              strokeWidth="2"
              opacity="0.6"
            />
          </svg>

          {/* Clone */}
          <div
            ref={cloneRef}
            data-testid="clone-monster"
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
              fontSize: '12px',
              boxShadow: 'var(--shadow-card)',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: 0,
              textAlign: 'center',
              padding: '8px',
            }}
          >
            {originalMonster.name}
            <br />
            (Clone)
          </div>
        </>
      )}
    </div>
  );
}
