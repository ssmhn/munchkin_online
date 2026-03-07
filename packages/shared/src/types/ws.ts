import type { GameState, PendingAction, ReactionWindow, CardId, RevealedCard } from './state';
import type { CardDb } from './card';

// ---------------------------------------------------------------------------
// Game actions (C2S player intents)
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'KICK_DOOR' }
  | { type: 'APPLY_REVEALED_CARD'; cardId: string }
  | { type: 'LOOT'; deck: 'DOOR' | 'TREASURE' }
  | { type: 'LOOK_FOR_TROUBLE'; cardId: string }
  | { type: 'PLAY_CARD'; cardId: string; targetPlayerId?: string; targetMonsterId?: string }
  | { type: 'EQUIP_ITEM'; cardId: string }
  | { type: 'UNEQUIP_ITEM'; cardId: string }
  | { type: 'OFFER_HELP'; targetPlayerId: string; treasureCount: number }
  | { type: 'ACCEPT_HELP' }
  | { type: 'DECLINE_HELP' }
  | { type: 'COUNTER_OFFER'; treasureCount: number }
  | { type: 'END_NEGOTIATION' }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'RUN_AWAY'; diceRoll: number; discardedCardId?: string }
  | { type: 'END_TURN' }
  | { type: 'REACT_PASS' }
  | { type: 'REACT_CARD'; cardId: string }
  | { type: 'SELL_ITEMS'; cardIds: string[] }
  | { type: 'CHOOSE_OPTION'; optionId: string }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'GIVE_CARD'; cardId: string; targetPlayerId: string }
  | { type: 'PUT_IN_BACKPACK'; cardId: string }
  | { type: 'TAKE_FROM_BACKPACK'; cardId: string }
  | { type: 'STEAL_ITEM'; targetPlayerId: string; cardId: string; diceRoll: number }
  | { type: 'WIZARD_CANCEL_CURSE'; cardIds: string[] }
  | { type: 'CLERIC_RESURRECTION'; cardId: string };

// ---------------------------------------------------------------------------
// Game events (S2C broadcast)
// ---------------------------------------------------------------------------

export type GameEvent =
  // Cards
  | { type: 'CARD_REVEALED'; cardId: CardId; ownerId: string; source: RevealedCard['source'] }
  | { type: 'CARD_APPLIED'; cardId: CardId; ownerId: string }
  | { type: 'CARDS_DRAWN'; playerId: string; count: number; deck: 'DOOR' | 'TREASURE' }
  | { type: 'CARD_PLAYED'; playerId: string; cardId: CardId; targetPlayerId?: string; targetMonsterId?: string }
  | { type: 'CARD_DISCARDED'; playerId: string; cardId: CardId }
  | { type: 'CARD_GIVEN'; fromPlayerId: string; toPlayerId: string; cardId: CardId }

  // Levels
  | { type: 'LEVEL_CHANGED'; playerId: string; oldLevel: number; newLevel: number }

  // Combat
  | { type: 'COMBAT_STARTED'; monsterId: CardId; instanceId: string }
  | { type: 'COMBAT_WON'; playerId: string; monsters: CardId[] }
  | { type: 'COMBAT_LOST'; playerId: string; monsters: CardId[] }
  | { type: 'COMBAT_ENDED' }
  | { type: 'MONSTER_ADDED'; cardId: CardId; instanceId: string }
  | { type: 'MONSTER_CLONED'; originalInstanceId: string; cloneInstanceId: string }
  | { type: 'RUN_ATTEMPTED'; playerId: string; diceRoll: number; success: boolean; monsterId?: CardId }
  | { type: 'PLAYER_ESCAPED'; playerId: string; automatic?: boolean }
  | { type: 'BAD_STUFF_APPLIED'; playerId: string; monsterId: CardId }

  // Equipment
  | { type: 'ITEM_EQUIPPED'; playerId: string; cardId: CardId; slot: string }
  | { type: 'ITEM_UNEQUIPPED'; playerId: string; cardId: CardId; slot: string }
  | { type: 'EQUIPMENT_REMOVED'; playerId: string; slot: string }

  // Races/Classes/Gender
  | { type: 'RACE_CHANGED'; playerId: string; from: string | null; to: string | null }
  | { type: 'CLASS_CHANGED'; playerId: string; classes: string[] }
  | { type: 'GENDER_CHANGED'; playerId: string; from: string; to: string }

  // Curses
  | { type: 'CURSE_APPLIED'; playerId: string; curseCardId: CardId }
  | { type: 'CURSE_REMOVED'; playerId: string; curseId: string }

  // Trading
  | { type: 'HELP_OFFERED'; fromPlayerId: string; toPlayerId: string }
  | { type: 'HELP_ACCEPTED'; helperId: string }
  | { type: 'HELP_DECLINED'; helperId: string }
  | { type: 'HELPER_JOINED'; helperId: string; activePlayerId: string }

  // Reactions
  | { type: 'REACTION_WINDOW_OPEN'; trigger: unknown; timeoutMs: number }
  | { type: 'REACTION_WINDOW_CLOSE' }

  // Statuses
  | { type: 'STATUS_APPLIED'; playerId: string; status: string }

  // Pending actions
  | { type: 'PENDING_ACTION_CREATED'; actionType: string }

  // Selling
  | { type: 'ITEMS_SOLD'; playerId: string; cardIds: CardId[]; goldTotal: number; levelsGained: number }

  // Backpack
  | { type: 'CARD_PUT_IN_BACKPACK'; playerId: string; cardId: CardId }
  | { type: 'CARD_TAKEN_FROM_BACKPACK'; playerId: string; cardId: CardId }

  // Stealing
  | { type: 'STEAL_ATTEMPTED'; playerId: string; targetPlayerId: string; cardId: CardId; success: boolean }

  // Game flow
  | { type: 'TURN_ENDED'; playerId: string }
  | { type: 'GAME_WON'; winnerId: string }
  | { type: 'GAME_OVER'; winnerId: string };

// ---------------------------------------------------------------------------
// JSON Patch (RFC 6902)
// ---------------------------------------------------------------------------

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// ---------------------------------------------------------------------------
// State projection
// ---------------------------------------------------------------------------

export type GameStateProjection = GameState;

// ---------------------------------------------------------------------------
// Voice chat signaling
// ---------------------------------------------------------------------------

export interface VoiceOffer {
  targetPlayerId: string;
  sdp: string;
}

export interface VoiceAnswer {
  targetPlayerId: string;
  sdp: string;
}

export interface VoiceIceCandidate {
  targetPlayerId: string;
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface VoiceState {
  muted: boolean;
}

// ---------------------------------------------------------------------------
// C2S messages
// ---------------------------------------------------------------------------

export type C2S_Message =
  | { type: 'GAME_ACTION'; payload: GameAction }
  | { type: 'PING' }
  | { type: 'RECONNECT'; token: string }
  | { type: 'VOICE_OFFER'; payload: VoiceOffer }
  | { type: 'VOICE_ANSWER'; payload: VoiceAnswer }
  | { type: 'VOICE_ICE_CANDIDATE'; payload: VoiceIceCandidate }
  | { type: 'VOICE_STATE'; payload: VoiceState };

// ---------------------------------------------------------------------------
// S2C messages
// ---------------------------------------------------------------------------

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
  | { type: 'PONG' }
  | { type: 'VOICE_OFFER'; payload: VoiceOffer & { fromPlayerId: string } }
  | { type: 'VOICE_ANSWER'; payload: VoiceAnswer & { fromPlayerId: string } }
  | { type: 'VOICE_ICE_CANDIDATE'; payload: VoiceIceCandidate & { fromPlayerId: string } }
  | { type: 'VOICE_STATE'; payload: VoiceState & { playerId: string } };
