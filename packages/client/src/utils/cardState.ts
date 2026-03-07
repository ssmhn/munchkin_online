import type { CardDefinition, GamePhase, PlayContext } from '@munchkin/shared';

export type CardHandState =
  | 'playable'
  | 'not-playable'
  | 'equippable'
  | 'reaction'
  | 'dragging'
  | 'selected';

export function getCardHandState(
  card: CardDefinition,
  phase: GamePhase,
  isMyTurn: boolean,
  inCombat: boolean,
  combatActivePlayerId?: string,
  myPlayerId?: string,
): CardHandState {
  // During combat when it's not my combat
  if (phase === 'COMBAT' && inCombat && combatActivePlayerId !== myPlayerId) {
    if (card.playableFrom?.includes('REACTION')) return 'reaction';
    if (card.playableFrom?.includes('ANY_COMBAT')) return 'reaction';
    return 'not-playable';
  }

  // My turn checks
  if (isMyTurn) {
    if (card.type === 'EQUIPMENT' && phase !== 'COMBAT') return 'equippable';
    if (isPlayableInPhase(card, phase)) return 'playable';
  }

  // Not my turn -- only reactions
  if (!isMyTurn) {
    if (card.playableFrom?.includes('REACTION')) return 'reaction';
    return 'not-playable';
  }

  return 'not-playable';
}

function isPlayableInPhase(card: CardDefinition, phase: GamePhase): boolean {
  if (!card.playableFrom || card.playableFrom.length === 0) return false;

  const phaseContextMap: Record<string, PlayContext[]> = {
    KICK_DOOR: ['YOUR_TURN_PRECOMBAT', 'ANYTIME'],
    LOOT_ROOM: ['YOUR_TURN_PRECOMBAT', 'ANYTIME'],
    COMBAT: ['YOUR_TURN_COMBAT', 'ANY_COMBAT', 'ANYTIME'],
    AFTER_COMBAT: ['YOUR_TURN_PRECOMBAT', 'ANYTIME'],
    END_TURN: ['YOUR_TURN_PRECOMBAT', 'ANYTIME'],
    CHARITY: ['ANYTIME'],
  };

  const validContexts = phaseContextMap[phase] ?? [];
  return card.playableFrom.some((ctx) => validContexts.includes(ctx));
}

export function calcHandPositions(count: number, containerWidth: number): number[] {
  const cardWidth = 120;
  const maxSpread = containerWidth - cardWidth;
  const step = Math.min(
    cardWidth + 8,
    maxSpread / Math.max(count - 1, 1),
  );

  return Array(count)
    .fill(0)
    .map((_, i) => {
      const center = (count - 1) / 2;
      return (i - center) * step;
    });
}

export function canPutInBackpack(
  card: CardDefinition,
  backpackLength: number,
  backpackSize: number,
  enableBackpack: boolean,
  phase: GamePhase,
): boolean {
  if (!enableBackpack) return false;
  if (backpackLength >= backpackSize) return false;
  if (phase === 'COMBAT') return false;
  if (card.type === 'MONSTER' || card.type === 'MODIFIER') return false;
  return true;
}

export function requiresTarget(card: CardDefinition): boolean {
  if (!card.effects) return false;
  return card.effects.some(
    (e) =>
      e.type === 'MONSTER_BONUS' ||
      e.type === 'MONSTER_PENALTY' ||
      e.type === 'COMBAT_BONUS',
  );
}
