import React, { useState } from 'react';
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

const RACE_DESCRIPTIONS: Record<Race, string> = {
  ELF: 'Помощник победителя: каждый раз, когда Эльф помогает другому игроку победить монстра, Эльф получает +1 уровень.',
  DWARF: 'Носить всё: Дварф может носить любое количество Больших Шмоток одновременно.',
  HALFLING: 'Избавление от проклятия: сбросить 2 карты с руки, чтобы отменить Проклятие.',
  HUMAN: 'Дополнительная Шмотка: Человек может носить одну дополнительную Большую Шмотку (итого две).',
};

export function RaceIcon({
  race,
  small,
}: {
  race: Race | null;
  small?: boolean;
}) {
  const key: Race = race ?? 'HUMAN';
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <span
      className={`inline-flex items-center gap-0.5 cursor-help ${small ? 'text-[9px]' : 'text-xs'}`}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top });
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      <span>{RACE_EMOJI[key]}</span>
      <span className="text-munch-text font-semibold">{RACE_LABELS[key]}</span>
      {show && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-munch-surface border border-munch-border rounded-lg shadow-xl p-2.5 max-w-[240px] mb-1.5">
            <div className="text-[11px] font-bold text-amber-400 mb-1">{RACE_LABELS[key]}</div>
            <div className="text-[10px] text-munch-text/80 leading-snug">{RACE_DESCRIPTIONS[key]}</div>
          </div>
        </div>
      )}
    </span>
  );
}
