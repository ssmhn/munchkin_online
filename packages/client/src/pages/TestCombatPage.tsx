import React from 'react';
import { CombatZone } from '../components/CombatZone';
import type { CombatState } from '@munchkin/shared';

const combat: CombatState = {
  phase: 'ACTIVE',
  monsters: [{ cardId: 'Orc', modifiers: [], instanceId: 'inst-1' }],
  activePlayerId: 'p1',
  helpers: [],
  appliedCards: [],
  reactionWindow: null,
  helpOffer: null,
  runAttempts: 0,
  resolved: false,
};

export function TestCombatPage() {
  return (
    <div>
      <CombatZone
        combat={combat}
        isActivePlayer={false}
        playerPower={3}
        monsterPower={4}
      />
    </div>
  );
}
