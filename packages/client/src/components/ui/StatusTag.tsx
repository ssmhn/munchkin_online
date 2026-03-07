import React from 'react';
import type { StatusEffect } from '@munchkin/shared';

const STATUS_LABELS: Record<StatusEffect, string> = {
  IGNORE_WEAPON_RESTRICTIONS: 'Weapon Master',
  EXTRA_BIG_ITEM: 'Extra Big Item',
  ESCAPE_BONUS: 'Escape Bonus',
  HALFLING_ESCAPE_BONUS: 'Halfling Escape',
  WIZARD_CURSE_CANCEL: 'Anti-Magic',
  CLERIC_RESURRECTION_AVAILABLE: 'Resurrection Ready',
  CARRY_EXTRA_BIG_ITEM: 'Strong Back',
};

export function StatusTag({ status }: { status: StatusEffect }) {
  return (
    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-400/25 text-indigo-400 font-semibold">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
