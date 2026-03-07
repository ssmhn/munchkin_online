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
      gsap.fromTo(overlayRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
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
      case 'CHOOSE_MONSTER_FROM_HAND': return 'Choose a monster from your hand';
      case 'CHOOSE_CARDS_TO_DISCARD': return 'Choose a card to discard';
      case 'CHOOSE_PLAYER': return 'Choose a player';
      case 'CHOOSE_ITEM_FROM_PLAYER': return 'Choose an item';
      default: return 'Make a choice';
    }
  })();

  return (
    <div
      ref={overlayRef}
      data-testid="choose-overlay"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
    >
      <div className="bg-munch-surface rounded-xl p-6 min-w-[300px] max-w-[500px]">
        <h3 data-testid="choose-title" className="text-munch-text mb-4">
          {title}
        </h3>

        <div className="bg-munch-surface-light h-1 rounded-sm mb-4">
          <div
            ref={progressRef}
            data-testid="choose-timer"
            className="w-full h-full bg-munch-gold rounded-sm"
          />
        </div>

        <div data-testid="choose-options" className="flex flex-col gap-2">
          {action.options.map((option) => (
            <button
              key={option.id}
              data-testid={`option-${option.id}`}
              onClick={() => onChoose(option.id)}
              className="py-3 px-4 bg-munch-surface-light text-munch-text border border-munch-border rounded-lg cursor-pointer text-left text-sm"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
