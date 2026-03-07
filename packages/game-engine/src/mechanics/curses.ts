import type {
  CardId,
  CardDb,
  CardEffect,
  GameState,
  GameEvent,
  PlayerState,
  ActiveCurse,
  PendingAction,
  EquipSlot,
} from '@munchkin/shared';
import { InvalidActionError } from '../utils/errors';
import { v4IdGen } from '../utils/ids';
import { discardCard } from '../utils/deck';
import { hasStatus } from './equipment';

// ---------------------------------------------------------------------------
// Equip slots for iteration
// ---------------------------------------------------------------------------

const EQUIP_SLOTS: EquipSlot[] = [
  'head',
  'body',
  'feet',
  'hand1',
  'hand2',
  'twoHands',
];

// ---------------------------------------------------------------------------
// applyCurseCard
// ---------------------------------------------------------------------------

export function applyCurseCard(
  state: GameState,
  playerId: string,
  cardId: CardId,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  const def = cardDb[cardId];
  if (!def) {
    throw new InvalidActionError('Card definition not found');
  }

  let currentState = state;
  let currentPlayer = player;
  const events: GameEvent[] = [];

  for (const effect of def.effects) {
    const result = applyImmediateEffect(currentState, playerId, effect, cardDb);
    if (result) {
      currentState = result[0];
      events.push(...result[1]);
      currentPlayer = currentState.players[playerId];
    }
  }

  // Check for WIZARD_CURSE_CANCEL status
  if (
    currentPlayer.classes.includes('WIZARD') &&
    hasStatus(currentPlayer, 'WIZARD_CURSE_CANCEL', cardDb)
  ) {
    const pendingAction: PendingAction = {
      type: 'WIZARD_CANCEL_CURSE',
      playerId,
      timeoutMs: currentState.config.reactionTimeoutMs,
      options: [
        { id: 'cancel', label: 'Cancel this curse' },
        { id: 'accept', label: 'Accept the curse' },
      ],
    };

    currentState = {
      ...currentState,
      pendingActions: [...currentState.pendingActions, pendingAction],
    };

    events.push({ type: 'PENDING_ACTION_CREATED', actionType: 'WIZARD_CANCEL_CURSE' });
  }

  // Discard curse card to door discard pile
  currentState = discardCard(currentState, cardId, 'DOOR');

  events.push({ type: 'CURSE_APPLIED', playerId, curseCardId: cardId });

  return [currentState, events];
}

// ---------------------------------------------------------------------------
// Apply individual immediate effects from a curse
// ---------------------------------------------------------------------------

function applyImmediateEffect(
  state: GameState,
  playerId: string,
  effect: CardEffect,
  cardDb: CardDb,
): [GameState, GameEvent[]] | null {
  const player = state.players[playerId];
  if (!player) return null;

  switch (effect.type) {
    case 'REMOVE_CLASS': {
      const updatedPlayer: PlayerState = {
        ...player,
        classes: [],
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'CLASS_CHANGED', playerId, classes: [] }],
      ];
    }

    case 'REMOVE_RACE': {
      const oldRace = player.race;
      const updatedPlayer: PlayerState = {
        ...player,
        race: null,
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'RACE_CHANGED', playerId, from: oldRace, to: null }],
      ];
    }

    case 'CHANGE_GENDER': {
      const oldGender = player.gender;
      const newGender = oldGender === 'MALE' ? 'FEMALE' : 'MALE';
      const updatedPlayer: PlayerState = {
        ...player,
        gender: newGender,
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'GENDER_CHANGED', playerId, from: oldGender, to: newGender }],
      ];
    }

    case 'MODIFY_LEVEL': {
      const oldLevel = player.level;
      const newLevel = Math.max(1, player.level + effect.value);
      const updatedPlayer: PlayerState = {
        ...player,
        level: newLevel,
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'LEVEL_CHANGED', playerId, oldLevel, newLevel }],
      ];
    }

    case 'SET_LEVEL': {
      const oldLevel = player.level;
      const newLevel = Math.max(1, effect.value);
      const updatedPlayer: PlayerState = {
        ...player,
        level: newLevel,
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [
        newState,
        [{ type: 'LEVEL_CHANGED', playerId, oldLevel, newLevel }],
      ];
    }

    case 'REMOVE_EQUIPMENT': {
      const events: GameEvent[] = [];
      let currentEquipped = { ...player.equipped };
      let discardState = state;

      if (effect.slot === 'ALL') {
        for (const slot of EQUIP_SLOTS) {
          const cid = currentEquipped[slot];
          if (cid) {
            const cardDef = cardDb[cid];
            discardState = discardCard(discardState, cid, cardDef?.deck ?? 'TREASURE');
            currentEquipped = { ...currentEquipped, [slot]: null };
            events.push({ type: 'EQUIPMENT_REMOVED', playerId, slot });
          }
        }
        // Clear extras
        for (const cid of currentEquipped.extras) {
          const cardDef = cardDb[cid];
          discardState = discardCard(discardState, cid, cardDef?.deck ?? 'TREASURE');
        }
        if (currentEquipped.extras.length > 0) {
          events.push({ type: 'EQUIPMENT_REMOVED', playerId, slot: 'extras' });
        }
        currentEquipped = { ...currentEquipped, extras: [] };
      } else if (effect.slot === 'BEST') {
        // Find highest-value equipped item
        let bestSlot: string | null = null;
        let bestValue = -1;
        let bestCardId: CardId | null = null;

        for (const slot of EQUIP_SLOTS) {
          const cid = currentEquipped[slot];
          if (!cid) continue;
          const cardDef = cardDb[cid];
          const val = cardDef?.value ?? 0;
          if (val > bestValue) {
            bestValue = val;
            bestSlot = slot;
            bestCardId = cid;
          }
        }

        for (const cid of currentEquipped.extras) {
          const cardDef = cardDb[cid];
          const val = cardDef?.value ?? 0;
          if (val > bestValue) {
            bestValue = val;
            bestSlot = 'extras';
            bestCardId = cid;
          }
        }

        if (bestCardId && bestSlot) {
          const cardDef = cardDb[bestCardId];
          discardState = discardCard(discardState, bestCardId, cardDef?.deck ?? 'TREASURE');
          if (bestSlot === 'extras') {
            currentEquipped = {
              ...currentEquipped,
              extras: currentEquipped.extras.filter((c) => c !== bestCardId),
            };
          } else {
            currentEquipped = { ...currentEquipped, [bestSlot]: null };
          }
          events.push({ type: 'EQUIPMENT_REMOVED', playerId, slot: bestSlot });
        }
      } else {
        // Specific slot
        const cid = currentEquipped[effect.slot as EquipSlot];
        if (cid) {
          const cardDef = cardDb[cid];
          discardState = discardCard(discardState, cid, cardDef?.deck ?? 'TREASURE');
          currentEquipped = { ...currentEquipped, [effect.slot]: null };
          events.push({ type: 'EQUIPMENT_REMOVED', playerId, slot: effect.slot });
        }
      }

      const updatedPlayer: PlayerState = {
        ...player,
        equipped: currentEquipped,
      };
      const newState: GameState = {
        ...discardState,
        players: { ...discardState.players, [playerId]: updatedPlayer },
      };
      return [newState, events];
    }

    case 'APPLY_CURSE': {
      const activeCurse: ActiveCurse = {
        curseId: v4IdGen(),
        cardId: effect.curseId as CardId,
      };
      const updatedPlayer: PlayerState = {
        ...player,
        curses: [...player.curses, activeCurse],
      };
      const newState: GameState = {
        ...state,
        players: { ...state.players, [playerId]: updatedPlayer },
      };
      return [newState, []];
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// removeCurse
// ---------------------------------------------------------------------------

export function removeCurse(
  state: GameState,
  playerId: string,
  curseId?: string,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError(`Player ${playerId} not found`);
  }

  if (player.curses.length === 0) {
    throw new InvalidActionError('Player has no curses');
  }

  let removedCurseId: string;
  let newCurses: ActiveCurse[];

  if (curseId) {
    const curseIdx = player.curses.findIndex((c) => c.curseId === curseId);
    if (curseIdx === -1) {
      throw new InvalidActionError(`Curse ${curseId} not found`);
    }
    removedCurseId = curseId;
    newCurses = [
      ...player.curses.slice(0, curseIdx),
      ...player.curses.slice(curseIdx + 1),
    ];
  } else {
    removedCurseId = player.curses[0].curseId;
    newCurses = player.curses.slice(1);
  }

  const updatedPlayer: PlayerState = {
    ...player,
    curses: newCurses,
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: updatedPlayer,
    },
  };

  const events: GameEvent[] = [
    { type: 'CURSE_REMOVED', playerId, curseId: removedCurseId },
  ];

  return [newState, events];
}
