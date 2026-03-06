import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { PlayerState } from '@munchkin/shared';

interface Props {
  player: PlayerState;
  isActive: boolean;
  isSelf: boolean;
}

export function PlayerArea({ player, isActive, isSelf }: Props) {
  const levelRef = useRef<HTMLSpanElement>(null);
  const prevLevel = useRef(player.level);

  useEffect(() => {
    if (player.level !== prevLevel.current && levelRef.current) {
      gsap.fromTo(levelRef.current,
        { scale: 1.5, color: player.level > prevLevel.current ? '#4ade80' : '#f87171' },
        { scale: 1, color: '#ffffff', duration: 0.5, ease: 'back.out' }
      );
      prevLevel.current = player.level;
    }
  }, [player.level]);

  return (
    <div
      data-testid={`player-area-${player.id}`}
      style={{
        border: isActive ? '2px solid gold' : '1px solid #444',
        padding: '8px',
        margin: '4px',
        borderRadius: '8px',
        background: '#1a1a2e',
      }}
    >
      <div data-testid={`player-name-${player.id}`}>{player.name}</div>
      <div>
        Level: <span ref={levelRef} data-testid={`player-level-${player.id}`}>{player.level}</span>
      </div>
      <div>
        {player.race && <span data-testid={`player-race-${player.id}`}>{player.race}</span>}
        {player.classes.length > 0 && (
          <span data-testid={`player-class-${player.id}`}>{player.classes.join(', ')}</span>
        )}
      </div>
      <div data-testid={`player-gender-${player.id}`}>{player.gender}</div>
      <div data-testid={`player-cards-${player.id}`}>
        Cards: {player.hand.length}
      </div>
      {isSelf && <span data-testid="self-marker">(You)</span>}
    </div>
  );
}
