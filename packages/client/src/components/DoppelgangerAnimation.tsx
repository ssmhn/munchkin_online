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
      className="relative flex items-center justify-center min-h-[200px] gap-4"
    >
      {/* If choosing between multiple monsters */}
      {needsChoice && allMonsters!.map((m) => (
        <div
          key={m.instanceId}
          data-monster-card={m.instanceId}
          data-testid={`monster-choice-${m.instanceId}`}
          onClick={() => handleChoose(m.instanceId)}
          className="w-[100px] h-[140px] bg-munch-surface border-2 border-munch-danger rounded-lg flex items-center justify-center text-munch-text font-fantasy text-xs cursor-pointer shadow-card text-center p-2"
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
            className={`w-[100px] h-[140px] bg-munch-surface rounded-lg flex items-center justify-center text-munch-text font-fantasy text-xs text-center p-2 ${
              chosen ? 'border-2 border-munch-gold shadow-glow-gold' : 'border-2 border-munch-danger shadow-card'
            }`}
          >
            {originalMonster.name}
          </div>

          {/* SVG arc */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          >
            <path
              ref={arcRef}
              data-testid="clone-arc"
              d="M 160 100 Q 210 40 260 100"
              fill="none"
              stroke="var(--color-munch-gold)"
              strokeWidth="2"
              opacity="0.6"
            />
          </svg>

          {/* Clone */}
          <div
            ref={cloneRef}
            data-testid="clone-monster"
            className="w-[100px] h-[140px] bg-munch-surface border-2 border-munch-danger rounded-lg flex items-center justify-center text-munch-text font-fantasy text-xs shadow-card absolute left-1/2 -translate-x-1/2 opacity-0 text-center p-2"
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
