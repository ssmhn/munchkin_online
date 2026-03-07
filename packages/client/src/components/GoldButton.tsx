import React, { useRef, useCallback } from 'react';
import gsap from 'gsap';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
  'data-testid'?: string;
}

export function GoldButton({ children, onClick, disabled, variant = 'primary', ...rest }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (disabled || !btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1.05,
      boxShadow: `0 0 16px ${variant === 'danger' ? 'rgba(220, 38, 38, 0.5)' : 'rgba(201, 168, 76, 0.5)'}`,
      duration: 0.2,
      ease: 'power2.out',
    });
  }, [disabled, variant]);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1,
      boxShadow: 'none',
      duration: 0.2,
      ease: 'power2.out',
    });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={rest['data-testid']}
      className={`px-5 py-2.5 border-none rounded-lg font-fantasy font-bold text-sm tracking-wide ${
        variant === 'danger'
          ? 'bg-munch-danger text-munch-text'
          : 'bg-munch-gold text-munch-bg'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}
