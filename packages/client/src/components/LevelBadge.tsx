import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  level: number;
  size?: number;
  'data-testid'?: string;
}

export function LevelBadge({ level, size = 48, ...rest }: Props) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef(level);

  useEffect(() => {
    if (prevLevel.current !== level && badgeRef.current) {
      const tl = gsap.timeline();
      tl.to(badgeRef.current, { scale: 1.3, duration: 0.15, ease: 'power2.out' });
      tl.to(badgeRef.current, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
      prevLevel.current = level;
    }
  }, [level]);

  return (
    <div
      ref={badgeRef}
      data-testid={rest['data-testid']}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, var(--color-gold-light), var(--color-gold))`,
        border: '2px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-fantasy)',
        fontWeight: 700,
        fontSize: `${size * 0.45}px`,
        color: 'var(--color-bg)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {level}
    </div>
  );
}
