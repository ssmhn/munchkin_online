import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import type { ReactionWindow } from '@munchkin/shared';

interface Props {
  window: ReactionWindow;
  onPass: () => void;
  onPlayCard?: (cardId: string) => void;
  hasPassed: boolean;
  reactionCards?: string[];
}

export function ReactionBar({ window: rw, onPass, onPlayCard, hasPassed, reactionCards = [] }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      gsap.from(barRef.current, { y: 100, opacity: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, []);

  useEffect(() => {
    if (progressRef.current && rw.timeoutMs > 0) {
      gsap.to(progressRef.current, {
        width: '0%',
        duration: rw.timeoutMs / 1000,
        ease: 'none',
      });
    }
  }, [rw.timeoutMs]);

  const triggerText = (() => {
    switch (rw.trigger.type) {
      case 'DOOR_OPENED': return `Door opened: ${rw.trigger.cardId}`;
      case 'COMBAT_STARTED': return `Combat started: ${rw.trigger.monsterId}`;
      case 'CARD_PLAYED': return `Card played: ${rw.trigger.cardId}`;
      case 'COMBAT_RESULT': return `Combat result: ${rw.trigger.result}`;
      default: return 'Reaction window open';
    }
  })();

  return (
    <div
      ref={barRef}
      data-testid="reaction-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1e293b',
        borderTop: '2px solid #3b82f6',
        padding: '12px 16px',
      }}
    >
      <div data-testid="reaction-trigger" style={{ color: '#93c5fd', marginBottom: '8px' }}>
        {triggerText}
      </div>

      <div
        style={{ background: '#334155', height: '4px', borderRadius: '2px', marginBottom: '8px' }}
      >
        <div
          ref={progressRef}
          data-testid="reaction-timer"
          style={{ width: '100%', height: '100%', background: '#3b82f6', borderRadius: '2px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          data-testid="btn-pass"
          onClick={onPass}
          disabled={hasPassed}
          style={{
            padding: '8px 16px',
            background: hasPassed ? '#475569' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: hasPassed ? 'default' : 'pointer',
          }}
        >
          {hasPassed ? 'Passed' : 'Pass'}
        </button>

        {reactionCards.map(cardId => (
          <button
            key={cardId}
            data-testid={`reaction-card-${cardId}`}
            onClick={() => onPlayCard?.(cardId)}
            disabled={hasPassed}
            style={{
              padding: '8px 12px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Play {cardId}
          </button>
        ))}
      </div>
    </div>
  );
}
