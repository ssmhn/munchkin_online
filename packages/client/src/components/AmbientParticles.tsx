import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  count?: number;
  'data-testid'?: string;
}

export function AmbientParticles({ count = 25, ...rest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const tweens: gsap.core.Tween[] = [];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = `${2 + Math.random() * 4}px`;
      particle.style.height = particle.style.width;
      particle.style.borderRadius = '50%';
      particle.style.background = `rgba(201, 168, 76, ${0.2 + Math.random() * 0.4})`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.dataset.testid = 'ambient-particle';
      container.appendChild(particle);

      // Float motion — only using transform
      const moveTween = gsap.to(particle, {
        x: `+=${(Math.random() - 0.5) * 200}`,
        y: `+=${(Math.random() - 0.5) * 200}`,
        duration: 5 + Math.random() * 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 3,
      });
      tweens.push(moveTween);

      // Opacity flicker
      const flickerTween = gsap.to(particle, {
        opacity: 0.1 + Math.random() * 0.3,
        duration: 1 + Math.random() * 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 2,
      });
      tweens.push(flickerTween);
    }

    return () => {
      tweens.forEach((t) => t.kill());
      container.innerHTML = '';
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      data-testid={rest['data-testid'] ?? 'ambient-particles'}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
