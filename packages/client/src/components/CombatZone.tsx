import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { CombatState } from '@munchkin/shared';

interface Props {
  combat: CombatState;
  isActivePlayer: boolean;
  playerPower: number;
  monsterPower: number;
  onRunAway?: () => void;
  onOfferHelp?: () => void;
}

export function CombatZone({ combat, isActivePlayer, playerPower, monsterPower, onRunAway, onOfferHelp }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const monstersRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (zoneRef.current) {
      gsap.fromTo(zoneRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
    }
  }, []);

  useEffect(() => {
    if (monstersRef.current) {
      const monsterEls = monstersRef.current.children;
      gsap.fromTo(monsterEls, { x: -300, rotation: -15, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, ease: 'power3.out', duration: 0.6, stagger: 0.15 });
    }
  }, [combat.monsters.length]);

  useEffect(() => {
    if (buttonsRef.current) {
      gsap.fromTo(buttonsRef.current.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.3 });
    }
  }, []);

  return (
    <div
      ref={zoneRef}
      data-testid="combat-zone"
      className="bg-[#2d1b1b] border-2 border-munch-danger rounded-xl p-4 my-2"
    >
      <h3>Combat!</h3>

      <div ref={monstersRef} data-testid="monsters-area" className="flex gap-3 flex-wrap">
        {combat.monsters.map((monster) => (
          <div
            key={monster.instanceId}
            data-testid={`monster-${monster.instanceId}`}
            className="bg-[#4a1515] p-3 rounded-lg border border-[#991b1b] min-w-[120px]"
          >
            <div data-testid={`monster-name-${monster.instanceId}`}>{monster.cardId}</div>
            <div>
              Modifiers: {monster.modifiers.length > 0
                ? monster.modifiers.map(m => `+${m.value}`).join(', ')
                : 'none'}
            </div>
          </div>
        ))}
      </div>

      <div data-testid="combat-powers" className="flex gap-6 my-3 text-xl">
        <div>
          Players: <span data-testid="player-power">{playerPower}</span>
        </div>
        <div>vs</div>
        <div>
          Monsters: <span data-testid="monster-power">{monsterPower}</span>
        </div>
      </div>

      {combat.helpers.length > 0 && (
        <div data-testid="helpers-area">
          Helpers: {combat.helpers.map(h => h.playerId).join(', ')}
        </div>
      )}

      <div ref={buttonsRef} data-testid="action-panel" className="flex gap-2 mt-3">
        <button
          data-testid="btn-run-away"
          disabled={!isActivePlayer}
          onClick={onRunAway}
        >
          Run Away
        </button>
        <button
          data-testid="btn-offer-help"
          disabled={!isActivePlayer}
          onClick={onOfferHelp}
        >
          Ask for Help
        </button>
      </div>
    </div>
  );
}
