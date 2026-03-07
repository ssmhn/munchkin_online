import React from 'react';
import type { PlayerClass } from '@munchkin/shared';

const CLASS_EMOJI: Record<PlayerClass, string> = {
  WARRIOR: '\u2694\uFE0F',
  WIZARD: '\uD83E\uDDD9',
  CLERIC: '\u271D\uFE0F',
  THIEF: '\uD83D\uDDE1\uFE0F',
};

const CLASS_LABELS: Record<PlayerClass, string> = {
  WARRIOR: 'Warrior',
  WIZARD: 'Wizard',
  CLERIC: 'Cleric',
  THIEF: 'Thief',
};

export function ClassIcon({
  cls,
  small,
}: {
  cls: PlayerClass;
  small?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${small ? 'text-[9px]' : 'text-xs'}`}
    >
      <span>{CLASS_EMOJI[cls]}</span>
      <span className="text-munch-text font-semibold">{CLASS_LABELS[cls]}</span>
    </span>
  );
}
