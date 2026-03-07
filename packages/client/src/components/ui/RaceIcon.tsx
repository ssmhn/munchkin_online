import React from 'react';
import type { Race } from '@munchkin/shared';

const RACE_EMOJI: Record<Race, string> = {
  ELF: '\uD83E\uDDDD',
  DWARF: '\u26CF\uFE0F',
  HALFLING: '\uD83D\uDC63',
  HUMAN: '\uD83D\uDC64',
};

const RACE_LABELS: Record<Race, string> = {
  ELF: 'Elf',
  DWARF: 'Dwarf',
  HALFLING: 'Halfling',
  HUMAN: 'Human',
};

export function RaceIcon({
  race,
  small,
}: {
  race: Race | null;
  small?: boolean;
}) {
  const key: Race = race ?? 'HUMAN';
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${small ? 'text-[9px]' : 'text-xs'}`}
    >
      <span>{RACE_EMOJI[key]}</span>
      <span className="text-munch-text font-semibold">{RACE_LABELS[key]}</span>
    </span>
  );
}
