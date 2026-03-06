import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  isActive: boolean;
  children: React.ReactNode;
  'data-testid'?: string;
}

export function ActivePlayerGlow({ isActive, children, ...rest }: Props) {
  const glowRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!glowRef.current) return;

    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
    }

    if (isActive) {
      tweenRef.current = gsap.to(glowRef.current, {
        boxShadow: '0 0 24px rgba(201, 168, 76, 0.6)',
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    } else {
      gsap.to(glowRef.current, {
        boxShadow: 'none',
        duration: 0.3,
      });
    }

    return () => {
      tweenRef.current?.kill();
    };
  }, [isActive]);

  return (
    <div
      ref={glowRef}
      data-testid={rest['data-testid'] ?? 'player-glow'}
      data-active={isActive ? 'true' : 'false'}
      style={{
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '4px',
      }}
    >
      {children}
    </div>
  );
}
