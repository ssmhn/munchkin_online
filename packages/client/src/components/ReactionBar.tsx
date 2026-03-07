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
      gsap.fromTo(barRef.current, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
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
      case 'DOOR_REVEALED': return `Door revealed: ${rw.trigger.cardId}`;
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
      className="fixed bottom-0 left-0 right-0 bg-munch-surface border-t-2 border-munch-info py-3 px-4"
    >
      <div data-testid="reaction-trigger" className="text-munch-info mb-2">
        {triggerText}
      </div>

      <div className="bg-munch-surface-light h-1 rounded-sm mb-2">
        <div
          ref={progressRef}
          data-testid="reaction-timer"
          className="w-full h-full bg-munch-info rounded-sm"
        />
      </div>

      <div className="flex gap-2 items-center">
        <button
          data-testid="btn-pass"
          onClick={onPass}
          disabled={hasPassed}
          className={`py-2 px-4 text-white border-none rounded cursor-pointer ${
            hasPassed ? 'bg-gray-600 cursor-default' : 'bg-munch-info'
          }`}
        >
          {hasPassed ? 'Passed' : 'Pass'}
        </button>

        {reactionCards.map(cardId => (
          <button
            key={cardId}
            data-testid={`reaction-card-${cardId}`}
            onClick={() => onPlayCard?.(cardId)}
            disabled={hasPassed}
            className="py-2 px-3 bg-munch-monster text-white border-none rounded"
          >
            Play {cardId}
          </button>
        ))}
      </div>
    </div>
  );
}
