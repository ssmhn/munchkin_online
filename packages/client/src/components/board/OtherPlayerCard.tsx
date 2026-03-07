import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { PlayerState, CardDb } from '@munchkin/shared';
import { RaceIcon } from '../ui/RaceIcon';
import { ClassIcon } from '../ui/ClassIcon';
import { GenderIcon } from '../ui/GenderIcon';
import { CurseTag } from '../ui/CurseTag';

interface Props {
  player: PlayerState;
  isActive: boolean;
  isHelper?: boolean;
  cardDb: CardDb | null;
  onClick?: () => void;
}

export function OtherPlayerCard({ player, isActive, isHelper, cardDb, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (isActive) {
      gsap.to(ref.current, {
        boxShadow: '0 0 20px rgba(201,168,76,0.5)',
        repeat: -1, yoyo: true, duration: 1.5,
      });
    } else {
      gsap.killTweensOf(ref.current);
      gsap.to(ref.current, { boxShadow: 'none', duration: 0.3 });
    }
  }, [isActive]);

  // Simple combat power estimate
  let power = player.level;
  const eq = player.equipped;
  const allEquipped = [eq.head, eq.body, eq.feet, eq.hand1, eq.hand2, eq.twoHands, ...eq.extras].filter(Boolean) as string[];
  for (const cardId of allEquipped) {
    const def = cardDb?.[cardId];
    if (def?.effects) {
      for (const e of def.effects) {
        if (e.type === 'COMBAT_BONUS') power += (e as any).value ?? 0;
      }
    }
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border cursor-pointer transition-all duration-200 min-w-[100px] ${
        isActive ? 'border-munch-gold bg-munch-gold/10' : 'border-munch-border bg-black/20'
      } ${isHelper ? 'ring-1 ring-green-500' : ''} ${!player.isConnected ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-bold text-munch-text">{player.name}</span>
        <GenderIcon gender={player.gender} size={11} />
        {!player.isConnected && <span className="text-[9px] text-red-400">DC</span>}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-munch-gold font-bold">Lv.{player.level}</span>
        <span className="text-munch-text-muted">Pw.{power}</span>
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
        {player.race && <RaceIcon race={player.race} small />}
        {player.classes.map((c) => <ClassIcon key={c} cls={c} small />)}
      </div>
      {/* Hand cards - backs */}
      <div className="flex gap-[2px]">
        {Array(Math.min(player.hand.length, 8)).fill(null).map((_, i) => (
          <div key={i} className="w-[6px] h-[9px] rounded-[1px] bg-violet-600/30 border border-violet-600/50" />
        ))}
        {player.hand.length > 8 && <span className="text-[7px] text-munch-text-muted">+{player.hand.length - 8}</span>}
      </div>
      {/* Curses */}
      {player.curses.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {player.curses.map((c) => <CurseTag key={c.curseId} curse={c} />)}
        </div>
      )}
    </div>
  );
}
