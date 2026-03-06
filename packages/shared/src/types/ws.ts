import type { GameState, PendingAction, ReactionWindow, CardId } from './state';
import type { CardDb } from './card';

// --- Game Actions (player intents) ---

export type GameAction =
  | { type: 'KICK_DOOR' }
  | { type: 'PLAY_CARD'; cardId: string; targetId?: string }
  | { type: 'EQUIP_ITEM'; cardId: string }
  | { type: 'OFFER_HELP'; targetPlayerId: string; rewardCardIds: string[] }
  | { type: 'ACCEPT_HELP' }
  | { type: 'DECLINE_HELP' }
  | { type: 'COUNTER_OFFER'; rewardCardIds: string[] }
  | { type: 'RUN_AWAY'; diceRoll: number }
  | { type: 'END_TURN' }
  | { type: 'REACT_PASS' }
  | { type: 'SELL_ITEMS'; cardIds: string[] }
  | { type: 'CHOOSE_OPTION'; optionId: string };

// --- Game Events (broadcast to clients) ---

export type GameEvent =
  | { type: 'DOOR_KICKED'; playerId: string; cardId: CardId }
  | { type: 'CARD_PLAYED'; playerId: string; cardId: CardId; targetId?: string }
  | { type: 'ITEM_EQUIPPED'; playerId: string; cardId: CardId }
  | { type: 'COMBAT_STARTED'; monsterId: CardId }
  | { type: 'COMBAT_WON'; playerId: string; monsters: CardId[] }
  | { type: 'COMBAT_LOST'; playerId: string; monsters: CardId[] }
  | { type: 'RUN_ATTEMPTED'; playerId: string; diceRoll: number; success: boolean }
  | { type: 'BAD_STUFF_APPLIED'; playerId: string; monsterId: CardId }
  | { type: 'LEVEL_CHANGED'; playerId: string; oldLevel: number; newLevel: number }
  | { type: 'CARDS_DRAWN'; playerId: string; count: number; deck: 'DOOR' | 'TREASURE' }
  | { type: 'CARD_DISCARDED'; playerId: string; cardId: CardId }
  | { type: 'ITEMS_SOLD'; playerId: string; cardIds: CardId[]; goldTotal: number; levelsGained: number }
  | { type: 'HELPER_JOINED'; helperId: string; activePlayerId: string }
  | { type: 'CURSE_APPLIED'; playerId: string; curseId: string }
  | { type: 'MONSTER_CLONED'; originalInstanceId: string; cloneInstanceId: string }
  | { type: 'TURN_ENDED'; playerId: string }
  | { type: 'GAME_WON'; winnerId: string };

// --- JSON Patch (RFC 6902) ---

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// --- State Projection (what client sees) ---

export type GameStateProjection = GameState;

// --- Client → Server messages ---

export type C2S_Message =
  | { type: 'GAME_ACTION'; payload: GameAction }
  | { type: 'PING' }
  | { type: 'RECONNECT'; token: string };

// --- Server → Client messages ---

export type S2C_Message =
  | { type: 'FULL_SYNC'; payload: { gameState: GameStateProjection; cardDb: CardDb } }
  | { type: 'STATE_PATCH'; payload: { patch: JsonPatch[]; events: GameEvent[] } }
  | { type: 'ACTION_REQUIRED'; payload: PendingAction }
  | { type: 'REACTION_WINDOW_OPEN'; payload: ReactionWindow }
  | { type: 'REACTION_WINDOW_CLOSE' }
  | { type: 'GAME_EVENT'; payload: GameEvent }
  | { type: 'PLAYER_JOINED'; payload: { playerId: string; name: string } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'PLAYER_RECONNECTED'; payload: { playerId: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } }
  | { type: 'GAME_OVER'; payload: { winnerId: string } }
  | { type: 'PONG' };
