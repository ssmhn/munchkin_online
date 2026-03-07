import React, { useMemo } from 'react';
import type { PlayerState, CardDb, CombatState, AppliedCard, GamePhase } from '@munchkin/shared';
import { LevelBadge } from '../LevelBadge';
import { PowerDisplay } from '../ui/PowerDisplay';
import { GenderIcon } from '../ui/GenderIcon';
import { RaceIcon } from '../ui/RaceIcon';
import { ClassIcon } from '../ui/ClassIcon';
import { StatusTag } from '../ui/StatusTag';
import { CurseTag } from '../ui/CurseTag';

interface Props {
  player: PlayerState;
  cardDb: CardDb | null;
  combat: CombatState | null;
  backpackSize: number;
  enableBackpack: boolean;
}

export function PlayerStatsPanel({ player, cardDb, combat, backpackSize, enableBackpack }: Props) {
  // Calculate combat power — level + sum of equipment bonuses
  const combatPower = useMemo(() => {
    if (!cardDb) return player.level;
    let bonus = 0;
    const eq = player.equipped;
    const allEquipped = [eq.head, eq.body, eq.feet, eq.hand1, eq.hand2, eq.twoHands, ...eq.extras].filter(Boolean) as string[];
    for (const cardId of allEquipped) {
      const def = cardDb[cardId];
      if (!def || !def.effects) continue;
      for (const e of def.effects) {
        if (e.type === 'COMBAT_BONUS') bonus += e.value;
      }
    }
    return player.level + bonus;
  }, [player.level, player.equipped, cardDb]);

  return (
    <aside className="flex flex-col gap-2 p-3 bg-black/20 rounded-xl border border-munch-border min-w-[160px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-munch-text font-fantasy">{player.name}</span>
        <GenderIcon gender={player.gender} />
      </div>

      {/* Level + Power */}
      <div className="flex items-center gap-3">
        <LevelBadge level={player.level} size={40} />
        <PowerDisplay power={combatPower} />
      </div>

      {/* Race */}
      <div>
        <div className="text-[9px] text-munch-text-muted uppercase font-semibold mb-0.5">Race</div>
        <RaceIcon race={player.race} />
      </div>

      {/* Classes */}
      <div>
        <div className="text-[9px] text-munch-text-muted uppercase font-semibold mb-0.5">Classes</div>
        {player.classes.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {player.classes.map((cls) => (
              <ClassIcon key={cls} cls={cls} />
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-munch-text-muted">None</span>
        )}
      </div>

      {/* Curses */}
      {player.curses.length > 0 && (
        <div>
          <div className="text-[9px] text-munch-text-muted uppercase font-semibold mb-0.5">Curses</div>
          <div className="flex gap-1 flex-wrap">
            {player.curses.map((c) => (
              <CurseTag key={c.curseId} curse={c} />
            ))}
          </div>
        </div>
      )}

      {/* Statuses */}
      {player.statuses.length > 0 && (
        <div>
          <div className="text-[9px] text-munch-text-muted uppercase font-semibold mb-0.5">Statuses</div>
          <div className="flex gap-1 flex-wrap">
            {player.statuses.map((s) => (
              <StatusTag key={s} status={s} />
            ))}
          </div>
        </div>
      )}

      {/* Counts */}
      <div className="flex gap-3 text-[10px] text-munch-text-muted pt-1 border-t border-munch-border">
        <span>Hand: {player.hand.length}</span>
        {enableBackpack && <span>Backpack: {player.backpack.length}/{backpackSize}</span>}
      </div>
    </aside>
  );
}
