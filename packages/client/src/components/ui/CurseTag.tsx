import React from 'react';
import type { ActiveCurse, CardDb } from '@munchkin/shared';

export function CurseTag({ curse, cardDb }: { curse: ActiveCurse; cardDb?: CardDb | null }) {
  const def = cardDb?.[curse.cardId];
  const label = def?.name ?? curse.cardId;
  const description = def?.description;

  return (
    <span
      className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-red-600/15 border border-red-600/30 text-red-400 font-semibold"
      title={description ?? undefined}
    >
      {label}
    </span>
  );
}
