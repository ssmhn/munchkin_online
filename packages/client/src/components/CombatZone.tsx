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
      gsap.from(zoneRef.current, { scale: 0.8, opacity: 0, duration: 0.4, ease: 'back.out' });
    }
  }, []);

  useEffect(() => {
    if (monstersRef.current) {
      const monsterEls = monstersRef.current.children;
      gsap.from(monsterEls, { x: -300, rotation: -15, ease: 'power3.out', duration: 0.6, stagger: 0.15 });
    }
  }, [combat.monsters.length]);

  useEffect(() => {
    if (buttonsRef.current) {
      gsap.from(buttonsRef.current.children, { y: 20, opacity: 0, stagger: 0.1, duration: 0.3 });
    }
  }, []);

  return (
    <div ref={zoneRef} data-testid="combat-zone" style={{
      background: '#2d1b1b', border: '2px solid #dc2626', borderRadius: '12px',
      padding: '16px', margin: '8px 0',
    }}>
      <h3>Combat!</h3>

      <div ref={monstersRef} data-testid="monsters-area" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {combat.monsters.map((monster) => (
          <div
            key={monster.instanceId}
            data-testid={`monster-${monster.instanceId}`}
            style={{
              background: '#4a1515', padding: '12px', borderRadius: '8px',
              border: '1px solid #991b1b', minWidth: '120px',
            }}
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

      <div data-testid="combat-powers" style={{ display: 'flex', gap: '24px', margin: '12px 0', fontSize: '20px' }}>
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

      <div ref={buttonsRef} data-testid="action-panel" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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
