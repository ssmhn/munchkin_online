import type {
  GameState,
  GameAction,
  GameEvent,
  CardDb,
  CardDefinition,
  CombatState,
  CombatMonster,
  RevealedCard,
  PlayerState,
  PendingAction,
} from '@munchkin/shared';
import { InvalidActionError, GameRuleError } from './utils/errors';
import { v4IdGen } from './utils/ids';
import { drawCard, discardCard } from './utils/deck';
import { resolveEffect } from './effects/resolver';
import type { EffectContext } from './effects/resolver';
import { handleReactionPass, handleReactionPlayCard } from './combat/reaction';
import { resolveCombatVictory } from './combat/victory';
import { handleRunAway, clearCombat } from './combat/defeat';
import { handleEquipItem, handleUnequipItem } from './mechanics/equipment';
import { applyCurseCard } from './mechanics/curses';
import { hasStatus } from './mechanics/equipment';
import {
  handleOfferHelp,
  handleAcceptHelp,
  handleDeclineHelp,
  handleCounterOffer,
  handleEndNegotiation,
} from './mechanics/trading';
import { handleSellItems } from './mechanics/selling';
import { handleCharityDiscard, handleCharityGive } from './mechanics/charity';
import { handlePutInBackpack, handleTakeFromBackpack } from './mechanics/backpack';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updatePlayer(
  state: GameState,
  playerId: string,
  updater: (p: PlayerState) => PlayerState,
): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: updater(player),
    },
  };
}

function removeFromHand(state: GameState, playerId: string, cardId: string): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    hand: p.hand.filter((c) => c !== cardId),
  }));
}

function addToHand(state: GameState, playerId: string, cardId: string): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    hand: [...p.hand, cardId],
  }));
}

// ---------------------------------------------------------------------------
// Main reducer
// ---------------------------------------------------------------------------

export function reduce(
  state: GameState,
  action: GameAction,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  switch (action.type) {
    case 'KICK_DOOR':
      return reduceKickDoor(state, playerId, cardDb);

    case 'APPLY_REVEALED_CARD':
      return reduceApplyRevealedCard(state, action.cardId, playerId, cardDb);

    case 'LOOT':
      return reduceLoot(state, action.deck, playerId, cardDb);

    case 'LOOK_FOR_TROUBLE':
      return reduceLookForTrouble(state, action.cardId, playerId, cardDb);

    case 'PLAY_CARD':
      return reducePlayCard(state, action.cardId, action.targetPlayerId, action.targetMonsterId, playerId, cardDb);

    case 'EQUIP_ITEM':
      return handleEquipItem(state, playerId, action.cardId, cardDb);

    case 'UNEQUIP_ITEM':
      return handleUnequipItem(state, playerId, action.cardId);

    case 'RESOLVE_COMBAT':
      return reduceResolveCombat(state, playerId, cardDb);

    case 'OFFER_HELP':
      return handleOfferHelp(state, playerId, action.targetPlayerId, action.treasureCount, cardDb);

    case 'ACCEPT_HELP':
      return handleAcceptHelp(state, playerId);

    case 'DECLINE_HELP':
      return handleDeclineHelp(state, playerId);

    case 'COUNTER_OFFER':
      return handleCounterOffer(state, playerId, action.treasureCount);

    case 'END_NEGOTIATION':
      return handleEndNegotiation(state);

    case 'RUN_AWAY':
      return handleRunAway(state, playerId, action.diceRoll, action.discardedCardId, cardDb);

    case 'REACT_PASS':
      return handleReactionPass(state, playerId);

    case 'REACT_CARD':
      return handleReactionPlayCard(state, playerId, action.cardId, cardDb);

    case 'SELL_ITEMS':
      return handleSellItems(state, playerId, action.cardIds, cardDb);

    case 'END_TURN':
      return reduceEndTurn(state, playerId);

    case 'CHOOSE_OPTION':
      return reduceChooseOption(state, action.optionId, playerId, cardDb);

    case 'DISCARD_CARD':
      return handleCharityDiscard(state, playerId, action.cardId, cardDb);

    case 'GIVE_CARD':
      return handleCharityGive(state, playerId, action.cardId, action.targetPlayerId);

    case 'PUT_IN_BACKPACK':
      return handlePutInBackpack(state, playerId, action.cardId, cardDb);

    case 'TAKE_FROM_BACKPACK':
      return handleTakeFromBackpack(state, playerId, action.cardId);

    case 'STEAL_ITEM':
      return reduceStealItem(state, playerId, action.targetPlayerId, action.cardId, action.diceRoll, cardDb);

    case 'WIZARD_CANCEL_CURSE':
      return reduceWizardCancelCurse(state, playerId, action.cardIds, cardDb);

    case 'CLERIC_RESURRECTION':
      return reduceClericResurrection(state, playerId, action.cardId, cardDb);

    case 'DISCARD_CLASS':
      return reduceDiscardClass(state, playerId);

    case 'DISCARD_RACE':
      return reduceDiscardRace(state, playerId);

    case 'BANISH_UNDEAD':
      return reduceBanishUndead(state, playerId, action.cardId, cardDb);

    default:
      throw new InvalidActionError(`Unknown action type: ${(action as GameAction).type}`);
  }
}

// ---------------------------------------------------------------------------
// KICK_DOOR
// ---------------------------------------------------------------------------

function reduceKickDoor(
  state: GameState,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const [drawnState, cardId] = drawCard(state, 'DOOR');
  const def = cardDb[cardId];

  const events: GameEvent[] = [
    { type: 'CARD_REVEALED', cardId, ownerId: playerId, source: 'KICK_DOOR' },
  ];

  // Monster: auto-start combat immediately (Munchkin rules)
  if (def?.type === 'MONSTER') {
    const instanceId = v4IdGen();
    const monster: CombatMonster = {
      cardId,
      modifiers: [],
      instanceId,
    };

    const combat: CombatState = {
      phase: 'ACTIVE',
      monsters: [monster],
      activePlayerId: playerId,
      helpers: [],
      appliedCards: [],
      reactionWindow: null,
      helpOffer: null,
      runAttempts: 0,
      resolved: false,
    };

    const s: GameState = {
      ...drawnState,
      phase: 'COMBAT',
      combat,
    };

    events.push({ type: 'COMBAT_STARTED', monsterId: cardId, instanceId });
    return [s, events];
  }

  // All non-monster cards (CURSE, RACE, CLASS, EQUIPMENT, etc.): go to hand, move to LOOT_ROOM
  let s = addToHand(drawnState, playerId, cardId);
  s = { ...s, phase: 'LOOT_ROOM' as const };
  return [s, events];
}

// ---------------------------------------------------------------------------
// APPLY_REVEALED_CARD
// ---------------------------------------------------------------------------

function reduceApplyRevealedCard(
  state: GameState,
  cardId: string,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const revealedIdx = state.revealedCards.findIndex((rc) => rc.cardId === cardId);
  if (revealedIdx === -1) {
    throw new InvalidActionError(`Card "${cardId}" is not among revealed cards`);
  }

  const revealed = state.revealedCards[revealedIdx];
  if (revealed.ownerId !== playerId) {
    throw new InvalidActionError('You can only apply your own revealed cards');
  }

  // Remove from revealedCards
  let s: GameState = {
    ...state,
    revealedCards: state.revealedCards.filter((_, i) => i !== revealedIdx),
  };

  const events: GameEvent[] = [
    { type: 'CARD_APPLIED', cardId, ownerId: playerId },
  ];

  const def: CardDefinition | undefined = cardDb[cardId];

  // If this was a LOOT source, card always goes to hand, then END_TURN
  if (revealed.source === 'LOOT_DOOR' || revealed.source === 'LOOT_TREASURE') {
    s = addToHand(s, playerId, cardId);
    s = { ...s, phase: 'END_TURN' };
    return [s, events];
  }

  // KICK_DOOR or AFTER_COMBAT_TREASURE sources
  if (!def) {
    // Unknown card -- add to hand
    s = addToHand(s, playerId, cardId);
    s = { ...s, phase: 'LOOT_ROOM' };
    return [s, events];
  }

  switch (def.type) {
    case 'MONSTER': {
      const instanceId = v4IdGen();
      const monster: CombatMonster = {
        cardId,
        modifiers: [],
        instanceId,
      };

      const combat: CombatState = {
        phase: 'ACTIVE',
        monsters: [monster],
        activePlayerId: playerId,
        helpers: [],
        appliedCards: [],
        reactionWindow: null,
        helpOffer: null,
        runAttempts: 0,
        resolved: false,
      };

      s = { ...s, phase: 'COMBAT', combat };
      events.push({ type: 'COMBAT_STARTED', monsterId: cardId, instanceId });

      return [s, events];
    }

    case 'CURSE': {
      const [cursedState, curseEvents] = applyCurseCard(s, playerId, cardId, cardDb);
      s = { ...cursedState, phase: 'LOOT_ROOM' };
      events.push(...curseEvents);
      return [s, events];
    }

    default: {
      // Other card types (EQUIPMENT, CLASS, RACE, etc.) go to hand
      s = addToHand(s, playerId, cardId);
      s = { ...s, phase: 'LOOT_ROOM' };
      return [s, events];
    }
  }
}

// ---------------------------------------------------------------------------
// LOOT
// ---------------------------------------------------------------------------

function reduceLoot(
  state: GameState,
  deck: 'DOOR' | 'TREASURE',
  playerId: string,
  _cardDb: CardDb,
): [GameState, GameEvent[]] {
  const [drawnState, cardId] = drawCard(state, deck);

  const source = deck === 'DOOR' ? 'LOOT_DOOR' as const : 'LOOT_TREASURE' as const;

  const revealed: RevealedCard = {
    cardId,
    ownerId: playerId,
    source,
    revealedAt: Date.now(),
  };

  const s: GameState = {
    ...drawnState,
    revealedCards: [...drawnState.revealedCards, revealed],
  };

  const events: GameEvent[] = [
    { type: 'CARD_REVEALED', cardId, ownerId: playerId, source },
  ];

  return [s, events];
}

// ---------------------------------------------------------------------------
// LOOK_FOR_TROUBLE
// ---------------------------------------------------------------------------

function reduceLookForTrouble(
  state: GameState,
  cardId: string,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player || !player.hand.includes(cardId)) {
    throw new InvalidActionError(`Card "${cardId}" is not in your hand`);
  }

  const def = cardDb[cardId];
  if (!def || def.type !== 'MONSTER') {
    throw new InvalidActionError('You can only look for trouble with a Monster card');
  }

  // Remove card from hand
  let s = removeFromHand(state, playerId, cardId);

  const instanceId = v4IdGen();
  const monster: CombatMonster = {
    cardId,
    modifiers: [],
    instanceId,
  };

  const combat: CombatState = {
    phase: 'ACTIVE',
    monsters: [monster],
    activePlayerId: playerId,
    helpers: [],
    appliedCards: [],
    reactionWindow: null,
    helpOffer: null,
    runAttempts: 0,
    resolved: false,
  };

  s = { ...s, phase: 'COMBAT', combat };

  const events: GameEvent[] = [
    { type: 'COMBAT_STARTED', monsterId: cardId, instanceId },
  ];

  return [s, events];
}

// ---------------------------------------------------------------------------
// PLAY_CARD
// ---------------------------------------------------------------------------

function reducePlayCard(
  state: GameState,
  cardId: string,
  targetPlayerId: string | undefined,
  targetMonsterId: string | undefined,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player || !player.hand.includes(cardId)) {
    throw new InvalidActionError(`Card "${cardId}" is not in your hand`);
  }

  const def = cardDb[cardId];
  if (!def) {
    throw new InvalidActionError(`Card definition not found for "${cardId}"`);
  }

  // Validate card is playable in the current context
  if (state.combat && state.phase === 'COMBAT') {
    // During combat, only certain card types can be played
    const combatPlayable = ['MODIFIER', 'ONE_SHOT', 'SPECIAL', 'CURSE'];
    if (!combatPlayable.includes(def.type)) {
      throw new InvalidActionError(`Cannot play ${def.type} cards during combat`);
    }
    // Check playableFrom if defined
    if (def.playableFrom && def.playableFrom.length > 0) {
      const isActivePlayer = playerId === state.combat.activePlayerId;
      const allowed = def.playableFrom.some((ctx) =>
        ctx === 'ANY_COMBAT' ||
        ctx === 'REACTION' ||
        (ctx === 'YOUR_TURN_COMBAT' && isActivePlayer) ||
        ctx === 'ANYTIME'
      );
      if (!allowed) {
        throw new InvalidActionError(`This card cannot be played in the current combat context`);
      }
    }
  } else {
    // Outside combat: reject card types that have dedicated actions
    const nonPlayable = ['MONSTER', 'EQUIPMENT'];
    if (nonPlayable.includes(def.type)) {
      throw new InvalidActionError(
        `Cannot play ${def.type} cards via PLAY_CARD. Use the appropriate action instead.`
      );
    }
    // Outside combat, cannot play combat-only cards
    if (def.playableFrom && def.playableFrom.length > 0) {
      const combatOnly = def.playableFrom.every((ctx) =>
        ctx === 'ANY_COMBAT' || ctx === 'YOUR_TURN_COMBAT'
      );
      if (combatOnly) {
        throw new InvalidActionError(`This card can only be played during combat`);
      }
    }
  }

  // Remove card from hand
  let s = removeFromHand(state, playerId, cardId);
  const events: GameEvent[] = [
    { type: 'CARD_PLAYED', playerId, cardId, targetPlayerId, targetMonsterId },
  ];

  const context: EffectContext = {
    playerId,
    cardDb,
    combat: s.combat,
    targetPlayerId,
    targetMonsterId,
  };

  if (s.combat && s.phase === 'COMBAT') {
    // In combat
    switch (def.type) {
      case 'MODIFIER': {
        // Determine if this modifies a monster or a player
        const hasMonsterBonus = def.effects.some(
          (e) => e.type === 'MONSTER_BONUS' || e.type === 'MONSTER_PENALTY',
        );

        if (hasMonsterBonus && s.combat.monsters.length > 0) {
          // Add modifier to targeted monster, or first if not specified
          const monsterIdx = targetMonsterId
            ? s.combat.monsters.findIndex((m) => m.instanceId === targetMonsterId)
            : 0;
          const bonusValue = def.effects.reduce((sum, e) => {
            if (e.type === 'MONSTER_BONUS') return sum + e.value;
            if (e.type === 'MONSTER_PENALTY') return sum - e.value;
            return sum;
          }, 0);

          const effectiveIdx = monsterIdx >= 0 ? monsterIdx : 0;
          const updatedMonsters = s.combat.monsters.map((m, i) => {
            if (i !== effectiveIdx) return m;
            return {
              ...m,
              modifiers: [
                ...m.modifiers,
                { cardId, value: bonusValue },
              ],
            };
          });

          s = {
            ...s,
            combat: { ...s.combat, monsters: updatedMonsters },
          };
        } else {
          // Player-side modifier -- add to appliedCards
          s = {
            ...s,
            combat: {
              ...s.combat,
              appliedCards: [
                ...s.combat.appliedCards,
                { cardId, playerId },
              ],
            },
          };
        }
        break;
      }

      case 'ONE_SHOT': {
        // Berserk check: non-Warriors can only play 1 ONE_SHOT per combat
        const playerState = s.players[playerId];
        if (playerState && !hasStatus(playerState, 'BERSERK', cardDb)) {
          const alreadyPlayedOneShot = s.combat.appliedCards.some((ac) => {
            if (ac.playerId !== playerId) return false;
            const acDef = cardDb[ac.cardId];
            return acDef?.type === 'ONE_SHOT';
          });
          // Also check monster modifiers for ONE_SHOT cards played by this player
          const playedOnMonster = s.combat.monsters.some((m) =>
            m.modifiers.some((mod) => {
              const modDef = cardDb[mod.cardId];
              return modDef?.type === 'ONE_SHOT';
            })
          );
          if (alreadyPlayedOneShot || playedOnMonster) {
            throw new InvalidActionError('You can only play one One-Shot card per combat (Warrior can play unlimited)');
          }
        }

        // If targetMonsterId is specified, apply MONSTER_BONUS/MONSTER_PENALTY as monster modifier
        if (targetMonsterId && s.combat.monsters.length > 0) {
          const hasMonsterMod = def.effects.some((e) => e.type === 'MONSTER_BONUS' || e.type === 'MONSTER_PENALTY');
          if (hasMonsterMod) {
            const bonusValue = def.effects.reduce((sum, e) => {
              if (e.type === 'MONSTER_BONUS') return sum + e.value;
              if (e.type === 'MONSTER_PENALTY') return sum - e.value;
              return sum;
            }, 0);

            const monsterIdx = s.combat.monsters.findIndex((m) => m.instanceId === targetMonsterId);
            const effectiveIdx = monsterIdx >= 0 ? monsterIdx : 0;
            const updatedMonsters = s.combat.monsters.map((m, i) => {
              if (i !== effectiveIdx) return m;
              return {
                ...m,
                modifiers: [...m.modifiers, { cardId, value: bonusValue }],
              };
            });

            s = {
              ...s,
              combat: { ...s.combat, monsters: updatedMonsters },
            };

            // Resolve non-monster-modifier effects
            for (const effect of def.effects) {
              if (effect.type === 'MONSTER_BONUS' || effect.type === 'MONSTER_PENALTY') continue;
              const [newState, effectEvents] = resolveEffect(s, effect, context);
              s = newState;
              events.push(...effectEvents);
            }
            break;
          }
        }

        // Default: add to appliedCards (player-side bonus) and resolve effects
        s = {
          ...s,
          combat: {
            ...s.combat,
            appliedCards: [
              ...s.combat.appliedCards,
              { cardId, playerId },
            ],
          },
        };

        for (const effect of def.effects) {
          const [newState, effectEvents] = resolveEffect(s, effect, context);
          s = newState;
          events.push(...effectEvents);
        }
        break;
      }

      case 'CURSE': {
        // Curse in combat — needs a target player
        if (targetPlayerId) {
          const [cursedState, curseEvents] = applyCurseCard(s, targetPlayerId, cardId, cardDb);
          s = cursedState;
          events.push(...curseEvents);
        } else {
          // Create pending action to choose player
          const otherPlayers = s.playerOrder.filter((id) => id !== playerId);
          const pendingAction: PendingAction = {
            type: 'CHOOSE_PLAYER',
            playerId,
            timeoutMs: s.config.reactionTimeoutMs,
            options: otherPlayers.map((id) => ({
              id,
              label: s.players[id]?.name ?? id,
            })),
            availableCards: [cardId],
          };
          s = {
            ...s,
            pendingActions: [...s.pendingActions, pendingAction],
          };
        }
        break;
      }

      default: {
        // Other card types in combat -- resolve effects
        for (const effect of def.effects) {
          const [newState, effectEvents] = resolveEffect(s, effect, context);
          s = newState;
          events.push(...effectEvents);
        }
        break;
      }
    }
  } else {
    // CURSE cards: need to choose a target player
    if (def.type === 'CURSE') {
      if (targetPlayerId) {
        const [cursedState, curseEvents] = applyCurseCard(s, targetPlayerId, cardId, cardDb);
        s = cursedState;
        events.push(...curseEvents);
      } else {
        // Create pending action to choose player
        const otherPlayers = s.playerOrder.filter((id) => id !== playerId);
        const pendingAction: PendingAction = {
          type: 'CHOOSE_PLAYER',
          playerId,
          timeoutMs: s.config.reactionTimeoutMs,
          options: otherPlayers.map((id) => ({
            id,
            label: s.players[id]?.name ?? id,
          })),
          availableCards: [cardId],
        };
        s = {
          ...s,
          pendingActions: [...s.pendingActions, pendingAction],
        };
      }
      return [s, events];
    }

    // Not in combat -- resolve card effects
    for (const effect of def.effects) {
      const [newState, effectEvents] = resolveEffect(s, effect, context);
      s = newState;
      events.push(...effectEvents);
    }

    // CLASS cards: set the player's class
    if (def.type === 'CLASS') {
      const className = cardId.replace('class_', '').toUpperCase() as any;
      const curPlayer = s.players[playerId];
      if (curPlayer) {
        s = {
          ...s,
          players: {
            ...s.players,
            [playerId]: { ...curPlayer, classes: [className] },
          },
        };
        events.push({ type: 'CLASS_CHANGED', playerId, classes: [className] });
      }
    }

    // RACE cards: set the player's race
    if (def.type === 'RACE') {
      const raceName = cardId.replace('race_', '').toUpperCase() as any;
      const curPlayer = s.players[playerId];
      if (curPlayer) {
        s = {
          ...s,
          players: {
            ...s.players,
            [playerId]: { ...curPlayer, race: raceName === 'HUMAN' ? null : raceName },
          },
        };
        events.push({ type: 'RACE_CHANGED', playerId, from: curPlayer.race, to: raceName === 'HUMAN' ? null : raceName });
      }
    }
  }

  // Discard the played card — but NOT if it was added to combat.appliedCards,
  // because clearCombat will discard all appliedCards when combat ends.
  // Also skip for CURSE cards (applyCurseCard handles discard) and pending actions.
  const addedToApplied = s.combat?.appliedCards.some((ac) => ac.cardId === cardId);
  const isPendingCurse = s.pendingActions.some((pa) => pa.availableCards?.includes(cardId));
  if (!addedToApplied && def.type !== 'CURSE' && !isPendingCurse) {
    s = discardCard(s, cardId, def.deck);
  }

  return [s, events];
}

// ---------------------------------------------------------------------------
// END_TURN
// ---------------------------------------------------------------------------

function reduceEndTurn(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  const s: GameState = { ...state, phase: 'END_TURN' };
  const events: GameEvent[] = [
    { type: 'TURN_ENDED', playerId },
  ];
  return [s, events];
}

// ---------------------------------------------------------------------------
// CHOOSE_OPTION
// ---------------------------------------------------------------------------

function reduceChooseOption(
  state: GameState,
  optionId: string,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const pendingIdx = state.pendingActions.findIndex(
    (pa) => pa.playerId === playerId,
  );

  if (pendingIdx === -1) {
    throw new InvalidActionError('No pending action found for this player');
  }

  const pending = state.pendingActions[pendingIdx];
  const option = pending.options.find((o) => o.id === optionId);

  if (!option) {
    throw new InvalidActionError(`Option "${optionId}" not found in pending action`);
  }

  // Remove the pending action
  let s: GameState = {
    ...state,
    pendingActions: state.pendingActions.filter((_, i) => i !== pendingIdx),
  };

  const events: GameEvent[] = [];

  switch (pending.type) {
    case 'CHOOSE_MONSTER_TO_CLONE': {
      if (s.combat) {
        const target = s.combat.monsters.find((m) => m.instanceId === optionId);
        if (target) {
          const cloneInstanceId = v4IdGen();
          const clone: CombatMonster = {
            cardId: target.cardId,
            modifiers: target.modifiers.map((m) => ({ ...m })),
            instanceId: cloneInstanceId,
          };

          s = {
            ...s,
            combat: {
              ...s.combat,
              monsters: [...s.combat.monsters, clone],
            },
          };

          events.push({
            type: 'MONSTER_CLONED',
            originalInstanceId: target.instanceId,
            cloneInstanceId,
          });
        }
      }
      break;
    }

    case 'CHOOSE_MONSTER_FROM_HAND': {
      // Player chose a monster from hand to add to combat
      const chosenCardId = optionId; // optionId is the cardId for this action
      if (s.combat && s.players[playerId]) {
        const def = cardDb[chosenCardId];
        if (def?.type === 'MONSTER') {
          const instanceId = v4IdGen();
          const newMonster: CombatMonster = {
            cardId: chosenCardId,
            modifiers: [],
            instanceId,
          };

          // Remove card from player's hand
          s = removeFromHand(s, playerId, chosenCardId);

          const combat = s.combat!;
          s = {
            ...s,
            combat: {
              ...combat,
              monsters: [...combat.monsters, newMonster],
            },
          };

          events.push({ type: 'MONSTER_ADDED', cardId: chosenCardId, instanceId });
        }
      }
      break;
    }

    case 'CHOOSE_CARDS_TO_DISCARD': {
      if (option.cardId) {
        const cid = option.cardId;
        const def = cardDb[cid];
        const discardDeck = def?.deck ?? 'DOOR';
        s = removeFromHand(s, playerId, cid);
        s = discardCard(s, cid, discardDeck);
        events.push({ type: 'CARD_DISCARDED', playerId, cardId: cid });
      }
      break;
    }

    case 'CHOOSE_PLAYER': {
      // If this was a curse targeting selection
      if (pending.availableCards && pending.availableCards.length > 0) {
        const curseCardId = pending.availableCards[0];
        const targetId = optionId;
        const [cursedState, curseEvents] = applyCurseCard(s, targetId, curseCardId, cardDb);
        s = cursedState;
        events.push(...curseEvents);
      }
      break;
    }

    case 'CLERIC_CANCEL_CURSE': {
      if (optionId === 'cancel') {
        // Cleric discards 1 card to cancel curse — remove most recent curse
        const clericPlayer = s.players[playerId];
        if (clericPlayer && clericPlayer.hand.length >= 1 && clericPlayer.curses.length > 0) {
          // Auto-discard first card from hand
          const discardCid = clericPlayer.hand[0];
          s = removeFromHand(s, playerId, discardCid);
          const discDef = cardDb[discardCid];
          s = discardCard(s, discardCid, discDef?.deck ?? 'DOOR');
          events.push({ type: 'CARD_DISCARDED', playerId, cardId: discardCid });

          // Remove last curse
          const curses = s.players[playerId].curses;
          const removedCurse = curses[curses.length - 1];
          s = updatePlayer(s, playerId, (p) => ({
            ...p,
            curses: p.curses.slice(0, -1),
          }));
          events.push({ type: 'CURSE_REMOVED', playerId, curseId: removedCurse.curseId });
        }
      }
      break;
    }

    case 'HALFLING_CANCEL_CURSE': {
      if (optionId === 'cancel') {
        // Halfling discards 2 cards to cancel curse
        const halflingPlayer = s.players[playerId];
        if (halflingPlayer && halflingPlayer.hand.length >= 2 && halflingPlayer.curses.length > 0) {
          // Discard first 2 cards from hand
          for (let i = 0; i < 2; i++) {
            const discardCid = s.players[playerId].hand[0];
            s = removeFromHand(s, playerId, discardCid);
            const discDef = cardDb[discardCid];
            s = discardCard(s, discardCid, discDef?.deck ?? 'DOOR');
            events.push({ type: 'CARD_DISCARDED', playerId, cardId: discardCid });
          }

          // Remove last curse
          const curses = s.players[playerId].curses;
          const removedCurse = curses[curses.length - 1];
          s = updatePlayer(s, playerId, (p) => ({
            ...p,
            curses: p.curses.slice(0, -1),
          }));
          events.push({ type: 'CURSE_REMOVED', playerId, curseId: removedCurse.curseId });
        }
      }
      break;
    }

    case 'CHOOSE_ITEM_FROM_PLAYER':
    case 'HALFLING_ESCAPE_BONUS_CHOICE':
    case 'RESPOND_TO_HELP_OFFER':
    case 'WIZARD_CANCEL_CURSE':
    case 'CLERIC_RESURRECTION':
      // These are handled by the specific action types or have generic handling
      break;

    default:
      break;
  }

  return [s, events];
}

// ---------------------------------------------------------------------------
// STEAL_ITEM
// ---------------------------------------------------------------------------

function reduceStealItem(
  state: GameState,
  playerId: string,
  targetPlayerId: string,
  cardId: string,
  diceRoll: number,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  // Must be a Thief
  if (!player.classes.includes('THIEF')) {
    throw new InvalidActionError('Only a Thief can steal items');
  }

  // Cannot steal from yourself
  if (playerId === targetPlayerId) {
    throw new InvalidActionError('Cannot steal from yourself');
  }

  // Cannot steal from the active combat player (the one in combat)
  if (state.combat && targetPlayerId === state.combat.activePlayerId) {
    throw new InvalidActionError('Cannot steal from the player currently in combat');
  }

  const targetPlayer = state.players[targetPlayerId];
  if (!targetPlayer) {
    throw new InvalidActionError('Target player not found');
  }

  const success = diceRoll >= 4;

  const events: GameEvent[] = [
    { type: 'STEAL_ATTEMPTED', playerId, targetPlayerId, cardId, success },
  ];

  if (!success) {
    return [state, events];
  }

  // Find the card in target's equipped items or carried
  let s = state;
  let found = false;

  // Check equipped slots
  const slots = ['head', 'body', 'feet', 'hand1', 'hand2', 'twoHands'] as const;
  for (const slot of slots) {
    if (targetPlayer.equipped[slot] === cardId) {
      s = updatePlayer(s, targetPlayerId, (p) => ({
        ...p,
        equipped: { ...p.equipped, [slot]: null },
      }));
      found = true;
      break;
    }
  }

  if (!found) {
    // Check extras
    const extraIdx = targetPlayer.equipped.extras.indexOf(cardId);
    if (extraIdx >= 0) {
      s = updatePlayer(s, targetPlayerId, (p) => ({
        ...p,
        equipped: {
          ...p.equipped,
          extras: p.equipped.extras.filter((_, i) => i !== extraIdx),
        },
      }));
      found = true;
    }
  }

  if (!found) {
    // Check carried
    const carriedIdx = targetPlayer.carried.indexOf(cardId);
    if (carriedIdx >= 0) {
      s = updatePlayer(s, targetPlayerId, (p) => ({
        ...p,
        carried: p.carried.filter((c) => c !== cardId),
      }));
      found = true;
    }
  }

  if (!found) {
    throw new InvalidActionError(`Card "${cardId}" not found on target player`);
  }

  // Add to thief's hand
  s = addToHand(s, playerId, cardId);

  return [s, events];
}

// ---------------------------------------------------------------------------
// WIZARD_CANCEL_CURSE
// ---------------------------------------------------------------------------

function reduceWizardCancelCurse(
  state: GameState,
  playerId: string,
  cardIds: string[],
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (!player.classes.includes('WIZARD')) {
    throw new InvalidActionError('Only a Wizard can cancel curses this way');
  }

  if (!player.statuses.includes('WIZARD_CURSE_CANCEL')) {
    throw new InvalidActionError('Wizard curse cancellation not available');
  }

  let s = state;
  const events: GameEvent[] = [];

  // Discard the specified cards from hand
  for (const cid of cardIds) {
    if (!s.players[playerId].hand.includes(cid)) {
      throw new InvalidActionError(`Card "${cid}" is not in your hand`);
    }
    const def = cardDb[cid];
    const deck = def?.deck ?? 'DOOR';
    s = removeFromHand(s, playerId, cid);
    s = discardCard(s, cid, deck);
    events.push({ type: 'CARD_DISCARDED', playerId, cardId: cid });
  }

  // Remove the most recent curse from the player
  const curses = s.players[playerId].curses;
  if (curses.length > 0) {
    const removedCurse = curses[curses.length - 1];
    s = updatePlayer(s, playerId, (p) => ({
      ...p,
      curses: p.curses.slice(0, -1),
    }));
    events.push({ type: 'CURSE_REMOVED', playerId, curseId: removedCurse.curseId });
  }

  return [s, events];
}

// ---------------------------------------------------------------------------
// CLERIC_RESURRECTION
// ---------------------------------------------------------------------------

function reduceClericResurrection(
  state: GameState,
  playerId: string,
  cardId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (!player.classes.includes('CLERIC')) {
    throw new InvalidActionError('Only a Cleric can use resurrection');
  }

  if (!player.statuses.includes('CLERIC_RESURRECTION_AVAILABLE')) {
    throw new InvalidActionError('Cleric resurrection not available');
  }

  // Find the card in the appropriate discard pile
  const def = cardDb[cardId];
  const deck = def?.deck ?? 'DOOR';
  const discardKey = deck === 'DOOR' ? 'discardDoor' : 'discardTreasure';

  const discardPile = state[discardKey] as string[];
  const discardIdx = discardPile.indexOf(cardId);
  if (discardIdx === -1) {
    throw new InvalidActionError(`Card "${cardId}" not found in the discard pile`);
  }

  // Remove from discard and add to hand
  let s: GameState = {
    ...state,
    [discardKey]: discardPile.filter((_, i) => i !== discardIdx),
  };

  s = addToHand(s, playerId, cardId);

  // Remove the resurrection status so it can't be used again this turn
  s = updatePlayer(s, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((st) => st !== 'CLERIC_RESURRECTION_AVAILABLE'),
  }));

  const events: GameEvent[] = [];

  return [s, events];
}

// ---------------------------------------------------------------------------
// RESOLVE_COMBAT
// ---------------------------------------------------------------------------

function reduceResolveCombat(
  state: GameState,
  playerId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  if (state.phase !== 'COMBAT' || !state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (state.combat.activePlayerId !== playerId) {
    throw new InvalidActionError('Only the active combat player can resolve combat');
  }

  // calculateCombatResult is called by auto-transitions after this action
  // We just mark combat as ready to resolve by ensuring phase is ACTIVE
  const s: GameState = {
    ...state,
    combat: { ...state.combat, phase: 'ACTIVE' as const, resolved: true },
  };

  return [s, []];
}

// ---------------------------------------------------------------------------
// DISCARD_CLASS
// ---------------------------------------------------------------------------

function reduceDiscardClass(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (player.classes.length === 0) {
    throw new InvalidActionError('Player has no class to discard');
  }

  const s = updatePlayer(state, playerId, (p) => ({
    ...p,
    classes: [],
  }));

  return [s, [{ type: 'CLASS_CHANGED', playerId, classes: [] }]];
}

// ---------------------------------------------------------------------------
// DISCARD_RACE
// ---------------------------------------------------------------------------

function reduceDiscardRace(
  state: GameState,
  playerId: string,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (player.race === null) {
    throw new InvalidActionError('Player is already Human (no race)');
  }

  const oldRace = player.race;
  const s = updatePlayer(state, playerId, (p) => ({
    ...p,
    race: null,
  }));

  return [s, [{ type: 'RACE_CHANGED', playerId, from: oldRace, to: null }]];
}

// ---------------------------------------------------------------------------
// BANISH_UNDEAD (Cleric ability)
// ---------------------------------------------------------------------------

function reduceBanishUndead(
  state: GameState,
  playerId: string,
  discardCardId: string,
  cardDb: CardDb,
): [GameState, GameEvent[]] {
  const player = state.players[playerId];
  if (!player) {
    throw new InvalidActionError('Player not found');
  }

  if (!hasStatus(player, 'CLERIC_BANISH_UNDEAD', cardDb)) {
    throw new InvalidActionError('Only a Cleric can banish undead');
  }

  if (!state.combat) {
    throw new InvalidActionError('Not in combat');
  }

  if (state.combat.activePlayerId !== playerId) {
    throw new InvalidActionError('Only the active player can banish undead');
  }

  // Check all monsters are undead
  const allUndead = state.combat.monsters.every((m) => {
    const def = cardDb[m.cardId];
    return def?.tags?.includes('UNDEAD');
  });
  if (!allUndead) {
    throw new InvalidActionError('Can only banish undead monsters');
  }

  if (!player.hand.includes(discardCardId)) {
    throw new InvalidActionError('Discarded card is not in your hand');
  }

  let s: GameState = state;
  const events: GameEvent[] = [];

  // Discard a card from hand
  s = removeFromHand(s, playerId, discardCardId);
  const discardDef = cardDb[discardCardId];
  s = discardCard(s, discardCardId, discardDef?.deck ?? 'DOOR');
  events.push({ type: 'CARD_DISCARDED', playerId, cardId: discardCardId });

  // Discard all monsters (no rewards)
  for (const monster of state.combat.monsters) {
    s = discardCard(s, monster.cardId, 'DOOR');
  }

  // Clear combat, move to END_TURN
  s = { ...s, combat: null, phase: 'END_TURN' };

  events.push({ type: 'COMBAT_WON', playerId, monsters: state.combat.monsters.map((m) => m.cardId) });

  return [s, events];
}
