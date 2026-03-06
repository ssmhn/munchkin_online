import type { GameState, CombatMonster, PendingAction } from '@munchkin/shared';
import type { GameEvent } from '@munchkin/shared';
import { v4IdGen } from './id-gen';

export function handleDoppelganger(
  state: GameState,
  playerId: string
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  const events: GameEvent[] = [];
  const monsters = state.combat.monsters;

  if (monsters.length === 1) {
    // Auto-clone the only monster
    const original = monsters[0];
    const clone = cloneMonster(original);
    state.combat.monsters.push(clone);
    events.push({
      type: 'MONSTER_CLONED',
      originalInstanceId: original.instanceId,
      cloneInstanceId: clone.instanceId,
    });
  } else if (monsters.length > 1) {
    // Create pending action for player to choose which monster to clone
    const pendingAction: PendingAction = {
      type: 'CHOOSE_MONSTER_TO_CLONE',
      playerId,
      timeoutMs: 30000,
      options: monsters.map(m => ({
        id: m.instanceId,
        label: m.cardId,
        cardId: m.cardId,
      })),
    };
    state.pendingActions.push(pendingAction);
  }

  return [state, events];
}

export function handleChooseMonsterToClone(
  state: GameState,
  instanceId: string
): [GameState, GameEvent[]] {
  if (!state.combat) return [state, []];

  const events: GameEvent[] = [];

  // Find the chosen monster
  const original = state.combat.monsters.find(m => m.instanceId === instanceId);
  if (!original) return [state, []];

  const clone = cloneMonster(original);
  state.combat.monsters.push(clone);
  events.push({
    type: 'MONSTER_CLONED',
    originalInstanceId: original.instanceId,
    cloneInstanceId: clone.instanceId,
  });

  // Remove the pending action
  state.pendingActions = state.pendingActions.filter(
    a => a.type !== 'CHOOSE_MONSTER_TO_CLONE'
  );

  return [state, events];
}

function cloneMonster(original: CombatMonster): CombatMonster {
  return {
    cardId: original.cardId,
    modifiers: [...original.modifiers.map(m => ({ ...m }))],
    instanceId: v4IdGen(),
  };
}
