import React from 'react';
import type { GamePhase } from '@munchkin/shared';

interface PhaseConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const PHASE_CONFIG: Record<GamePhase, PhaseConfig> = {
  WAITING: {
    label: 'Waiting',
    color: '#a39880',
    bgColor: 'rgba(163, 152, 128, 0.15)',
    description: 'Waiting for players...',
  },
  KICK_DOOR: {
    label: 'Kick Open The Door',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    description: 'Draw a door card!',
  },
  COMBAT: {
    label: 'Combat!',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.2)',
    description: 'Fight the monster!',
  },
  LOOT_ROOM: {
    label: 'Loot The Room',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    description: 'Draw a face-down door card.',
  },
  CHARITY: {
    label: 'Charity',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.15)',
    description: 'Discard down to 5 cards.',
  },
  AFTER_COMBAT: {
    label: 'After Combat',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    description: 'Collect your rewards!',
  },
  END_TURN: {
    label: 'End Turn',
    color: '#a39880',
    bgColor: 'rgba(163, 152, 128, 0.15)',
    description: 'Finishing up...',
  },
  END_GAME: {
    label: 'Game Over!',
    color: '#c9a84c',
    bgColor: 'rgba(201, 168, 76, 0.2)',
    description: 'We have a winner!',
  },
};

interface Props {
  phase: GamePhase;
  activePlayerName: string;
  isLocalPlayerActive: boolean;
}

export function PhaseBar({ phase, activePlayerName, isLocalPlayerActive }: Props) {
  const config = PHASE_CONFIG[phase];
  const isCombat = phase === 'COMBAT';

  return (
    <div
      data-testid="phase-bar"
      className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-lg min-w-[200px]"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.color}44`,
        animation: isCombat ? 'combatPulse 2s ease-in-out infinite' : undefined,
      }}
    >
      <div
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          isLocalPlayerActive ? 'text-green-400' : 'text-munch-text-muted'
        }`}
      >
        {isLocalPlayerActive ? 'Your Turn' : `${activePlayerName}'s Turn`}
      </div>
      <div
        data-testid="phase-label"
        className="text-base font-bold font-fantasy text-center leading-tight"
        style={{ color: config.color }}
      >
        {config.label}
      </div>
      <div className="text-[9px] text-munch-text-muted">
        {config.description}
      </div>
    </div>
  );
}
