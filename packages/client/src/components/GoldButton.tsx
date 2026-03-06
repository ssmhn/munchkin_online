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
    const color = variant === 'danger' ? 'var(--color-danger)' : 'var(--color-gold)';
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

  const bg = variant === 'danger' ? 'var(--color-danger)' : 'var(--color-gold)';
  const color = variant === 'danger' ? 'var(--color-text)' : 'var(--color-bg)';

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={rest['data-testid']}
      style={{
        padding: '10px 20px',
        background: bg,
        color,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-fantasy)',
        fontWeight: 700,
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </button>
  );
}
