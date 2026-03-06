import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { PendingAction, PendingActionOption } from '@munchkin/shared';

interface Props {
  action: PendingAction;
  onChoose: (optionId: string) => void;
}

export function ChooseTargetOverlay({ action, onChoose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlayRef.current) {
      gsap.from(overlayRef.current, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'back.out' });
    }
  }, []);

  useEffect(() => {
    if (progressRef.current && action.timeoutMs > 0) {
      gsap.to(progressRef.current, {
        width: '0%',
        duration: action.timeoutMs / 1000,
        ease: 'none',
      });
    }
  }, [action.timeoutMs]);

  const title = (() => {
    switch (action.type) {
      case 'CHOOSE_MONSTER_TO_CLONE': return 'Choose a monster to clone';
      case 'CHOOSE_PLAYER': return 'Choose a player';
      case 'CHOOSE_ITEM_FROM_PLAYER': return 'Choose an item';
      default: return 'Make a choice';
    }
  })();

  return (
    <div
      ref={overlayRef}
      data-testid="choose-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '300px',
        maxWidth: '500px',
      }}>
        <h3 data-testid="choose-title" style={{ color: '#fff', marginBottom: '16px' }}>
          {title}
        </h3>

        <div style={{ background: '#334155', height: '4px', borderRadius: '2px', marginBottom: '16px' }}>
          <div
            ref={progressRef}
            data-testid="choose-timer"
            style={{ width: '100%', height: '100%', background: '#f59e0b', borderRadius: '2px' }}
          />
        </div>

        <div data-testid="choose-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {action.options.map((option) => (
            <button
              key={option.id}
              data-testid={`option-${option.id}`}
              onClick={() => onChoose(option.id)}
              style={{
                padding: '12px 16px',
                background: '#374151',
                color: '#fff',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
