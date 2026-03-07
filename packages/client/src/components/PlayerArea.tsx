import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { PlayerState, CardDb } from '@munchkin/shared';

interface Props {
  player: PlayerState;
  isActive: boolean;
  isSelf: boolean;
  compact?: boolean;
}

function countEquipped(player: PlayerState): number {
  const eq = player.equipped;
  let count = 0;
  if (eq.head) count++;
  if (eq.body) count++;
  if (eq.feet) count++;
  if (eq.leftHand) count++;
  if (eq.rightHand) count++;
  if (eq.twoHands) count++;
  count += eq.extras.length;
  return count;
}

export function PlayerArea({ player, isActive, isSelf, compact }: Props) {
  const levelRef = useRef<HTMLSpanElement>(null);
  const prevLevel = useRef(player.level);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (player.level !== prevLevel.current && levelRef.current) {
      gsap.fromTo(
        levelRef.current,
        { scale: 1.5, color: player.level > prevLevel.current ? '#4ade80' : '#f87171' },
        { scale: 1, color: '#fff', duration: 0.5, ease: 'back.out' }
      );
      prevLevel.current = player.level;
    }
  }, [player.level]);

  const equipCount = countEquipped(player);
  const avatarSize = compact ? 40 : 52;
  const initials = player.name.slice(0, 2).toUpperCase();

  return (
    <div
      ref={containerRef}
      data-testid={`player-area-${player.id}`}
      className={`flex flex-col items-center gap-1 transition-opacity duration-300 ${compact ? 'p-1.5' : 'p-2'} ${player.isConnected ? 'opacity-100' : 'opacity-50'}`}
    >
      {/* Avatar circle */}
      <div className="relative" style={{ width: avatarSize, height: avatarSize }}>
        <div
          className={`rounded-full flex items-center justify-center font-bold font-fantasy transition-all duration-300 ${
            isActive
              ? 'bg-gradient-to-br from-munch-gold to-munch-gold-light border-2 border-munch-gold text-munch-bg shadow-glow-gold'
              : 'bg-munch-surface-light border-2 border-munch-border text-munch-text shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
          } ${compact ? 'text-[13px]' : 'text-base'}`}
          style={{ width: avatarSize, height: avatarSize }}
        >
          {initials}
        </div>
        {/* Level badge */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-munch-bg border-2 border-munch-gold"
          style={{
            bottom: -2,
            right: -2,
            width: compact ? 18 : 22,
            height: compact ? 18 : 22,
          }}
        >
          <span
            ref={levelRef}
            data-testid={`player-level-${player.id}`}
            className={`font-bold text-white ${compact ? 'text-[9px]' : 'text-[11px]'}`}
          >
            {player.level}
          </span>
        </div>
      </div>

      {/* Player name */}
      <div
        data-testid={`player-name-${player.id}`}
        className={`font-semibold text-center max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap ${
          compact ? 'text-[10px]' : 'text-[11px]'
        } ${isSelf ? 'text-green-400' : 'text-munch-text'}`}
      >
        {player.name}
        {isSelf && <span data-testid="self-marker" className="text-[8px] ml-0.5 text-green-400">(You)</span>}
      </div>

      {/* Race / Class tags */}
      <div className="flex gap-[3px] flex-wrap justify-center">
        {player.race && (
          <span
            data-testid={`player-race-${player.id}`}
            className="text-[8px] px-1 py-px rounded-sm bg-emerald-600 text-white font-semibold"
          >
            {player.race}
          </span>
        )}
        {player.classes.map((cls) => (
          <span
            key={cls}
            data-testid={`player-class-${player.id}`}
            className="text-[8px] px-1 py-px rounded-sm bg-violet-600 text-white font-semibold"
          >
            {cls}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex gap-1.5 text-[9px] text-munch-text-muted">
        <span data-testid={`player-gender-${player.id}`}>{player.gender === 'MALE' ? 'M' : 'F'}</span>
        <span data-testid={`player-cards-${player.id}`} title="Cards in hand">{player.hand.length}c</span>
        {equipCount > 0 && <span title="Equipped items">{equipCount}eq</span>}
      </div>

      {/* Disconnected indicator */}
      {!player.isConnected && (
        <div className="text-[8px] text-red-600 font-semibold">
          Disconnected
        </div>
      )}
    </div>
  );
}
