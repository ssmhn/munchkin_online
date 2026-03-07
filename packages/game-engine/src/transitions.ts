import type {
  GameState,
  GameEvent,
  CardDb,
} from '@munchkin/shared';
import { checkReactionWindowComplete, isReactionWindowOpen } from './combat/reaction';
import { resolveCombatVictory } from './combat/victory';
import { calculateCombatResult } from './combat/calculator';
import { needsCharity } from './mechanics/charity';

// ---------------------------------------------------------------------------
// Auto-transitions
// ---------------------------------------------------------------------------

export function runAutoTransitions(
  state: GameState,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  let s = state;
  const allEvents: GameEvent[] = [];

  // We may need multiple passes (e.g. combat resolves, then end-turn triggers charity)
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    // ----- COMBAT phase transitions -----
    if (s.phase === 'COMBAT' && s.combat) {
      // If reaction window is open but everyone has responded, resolve it
      if (isReactionWindowOpen(s)) {
        const rw = s.combat!.reactionWindow!;
        const allResponded = Object.values(rw.responses).every((r) => r.passed || r.cardId);
        if (allResponded) {
          const [resolvedState, resolvedEvents] = checkReactionWindowComplete(s, cardDb);
          s = resolvedState;
          allEvents.push(...resolvedEvents);
          changed = true;
          continue;
        }
      }

      // Only resolve combat when player explicitly clicks "Done" (resolved flag)
      if (s.combat.phase === 'ACTIVE' && s.combat.resolved && !isReactionWindowOpen(s)) {
        const result = calculateCombatResult(s, cardDb);

        if (result === 'WIN') {
          const [victoryState, victoryEvents] = resolveCombatVictory(s, cardDb);
          s = victoryState;
          allEvents.push(...victoryEvents);
          changed = true;
          continue;
        }
        // LOSE: player is not strong enough — must roll dice to run away
        s = {
          ...s,
          combat: { ...s.combat, phase: 'RUN_ATTEMPT', resolved: false },
        };
        changed = true;
        continue;
      }
    }

    // ----- END_TURN phase transitions -----
    if (s.phase === 'END_TURN') {
      // Check if charity is needed
      if (needsCharity(s)) {
        s = { ...s, phase: 'CHARITY' };
        changed = true;
        continue;
      }

      // Advance to next player
      const idx = s.playerOrder.indexOf(s.activePlayerId);
      const nextPlayerId = s.playerOrder[(idx + 1) % s.playerOrder.length];

      s = {
        ...s,
        phase: 'KICK_DOOR',
        turn: s.turn + 1,
        activePlayerId: nextPlayerId,
        combat: null,
        revealedCards: [],
      };

      changed = true;
      continue;
    }

    // ----- CHARITY phase: auto-transition to END_TURN when hand <= 5 -----
    if (s.phase === 'CHARITY') {
      const activePlayer = s.players[s.activePlayerId];
      if (activePlayer && activePlayer.hand.length <= 5) {
        s = { ...s, phase: 'END_TURN' };
        changed = true;
        continue;
      }
    }

    // ----- AFTER_COMBAT phase transitions -----
    if (s.phase === 'AFTER_COMBAT') {
      // If no pending actions and no revealed cards to handle, move to END_TURN
      if (s.pendingActions.length === 0 && s.revealedCards.length === 0) {
        s = { ...s, phase: 'END_TURN' };
        changed = true;
        continue;
      }
    }

    // ----- KICK_DOOR with revealed cards -----
    // If revealed cards exist and reaction window is closed, wait for player
    // to send APPLY_REVEALED_CARD. No auto-transition needed.
  }

  return [s, allEvents];
}
