import React from 'react';
import type { ActiveCurse } from '@munchkin/shared';

export function CurseTag({ curse }: { curse: ActiveCurse }) {
  return (
    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-red-600/15 border border-red-600/30 text-red-400 font-semibold">
      {curse.curseId}
    </span>
  );
}
