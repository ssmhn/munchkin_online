export type CardId = string;

export type Gender = 'MALE' | 'FEMALE';

export type Race = 'ELF' | 'DWARF' | 'HALFLING' | 'HUMAN';

export type PlayerClass = 'WARRIOR' | 'WIZARD' | 'CLERIC' | 'THIEF';

export type EquipSlot = 'head' | 'body' | 'feet' | 'hand' | 'twoHands';

export type MonsterTag = 'UNDEAD' | 'DEMON' | 'DRAGON';

export type StatusEffect =
  | 'IGNORE_WEAPON_RESTRICTIONS'
  | 'EXTRA_BIG_ITEM'
  | 'ESCAPE_BONUS'
  | 'HALFLING_ESCAPE_BONUS'
  | 'WIZARD_CURSE_CANCEL'
  | 'CLERIC_RESURRECTION_AVAILABLE'
  | 'CARRY_EXTRA_BIG_ITEM';

export type GamePhase =
  | 'WAITING'
  | 'KICK_DOOR'
  | 'LOOT_ROOM'
  | 'COMBAT'
  | 'AFTER_COMBAT'
  | 'END_TURN'
  | 'CHARITY'
  | 'END_GAME';

export type CombatPhase =
  | 'REACTION_WINDOW'
  | 'NEGOTIATION'
  | 'ACTIVE'
  | 'RUN_ATTEMPT'
  | 'RESOLVING';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface GameConfig {
  winLevel: number;
  epicMode: boolean;
  allowedSets: string[];
  maxPlayers: number;
  enableBackpack: boolean;
  backpackSize: number;
  reactionTimeoutMs: number;
  revealTimeoutMs: number;
}

// ---------------------------------------------------------------------------
// Revealed card (face-up on table, not yet applied)
// ---------------------------------------------------------------------------

export interface RevealedCard {
  cardId: CardId;
  ownerId: string;
  source: 'KICK_DOOR' | 'LOOT_DOOR' | 'LOOT_TREASURE' | 'AFTER_COMBAT_TREASURE';
  revealedAt: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface GameState {
  id: string;
  phase: GamePhase;
  turn: number;
  activePlayerId: string;
  playerOrder: string[];
  players: Record<string, PlayerState>;
  doorDeck: CardId[];
  treasureDeck: CardId[];
  discardDoor: CardId[];
  discardTreasure: CardId[];
  combat: CombatState | null;
  pendingActions: PendingAction[];
  log: LogEntry[];
  winner: string | null;
  revealedCards: RevealedCard[];
  config: GameConfig;
}

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

export interface PlayerState {
  id: string;
  name: string;
  level: number;
  gender: Gender;
  race: Race | null;
  classes: PlayerClass[];
  hand: CardId[];
  equipped: EquippedItems;
  carried: CardId[];
  curses: ActiveCurse[];
  isConnected: boolean;
  statuses: StatusEffect[];
  backpack: CardId[];
}

export interface EquippedItems {
  head: CardId | null;
  body: CardId | null;
  feet: CardId | null;
  hand1: CardId | null;
  hand2: CardId | null;
  twoHands: CardId | null;
  extras: CardId[];
}

// ---------------------------------------------------------------------------
// Combat state
// ---------------------------------------------------------------------------

export interface CombatState {
  phase: CombatPhase;
  monsters: CombatMonster[];
  activePlayerId: string;
  helpers: CombatHelper[];
  appliedCards: AppliedCard[];
  reactionWindow: ReactionWindow | null;
  helpOffer: HelpOffer | null;
  runAttempts: number;
  resolved: boolean;
}

export interface HelpOffer {
  fromPlayerId: string;
  toPlayerId: string;
  treasureCount: number;
}

export interface CombatMonster {
  cardId: CardId;
  modifiers: MonsterModifier[];
  instanceId: string;
}

export interface MonsterModifier {
  cardId: CardId;
  value: number;
}

export interface CombatHelper {
  playerId: string;
  agreedTreasureCount: number;
}

export interface AppliedCard {
  cardId: CardId;
  playerId: string;
  targetPlayerId?: string;
  targetMonsterId?: string;
}

// ---------------------------------------------------------------------------
// Active curse
// ---------------------------------------------------------------------------

export interface ActiveCurse {
  curseId: string;
  cardId: CardId;
}

// ---------------------------------------------------------------------------
// Reaction window
// ---------------------------------------------------------------------------

export interface ReactionWindow {
  trigger: ReactionTrigger;
  timeoutMs: number;
  responses: Record<string, ReactionResponse>;
  stack: StackItem[];
}

export type ReactionTrigger =
  | { type: 'DOOR_REVEALED'; cardId: CardId }
  | { type: 'COMBAT_STARTED'; monsterId: CardId }
  | { type: 'CARD_PLAYED'; cardId: CardId; playerId: string }
  | { type: 'COMBAT_RESULT'; result: 'WIN' | 'LOSE' }
  | { type: 'LOOK_FOR_TROUBLE' };

export interface ReactionResponse {
  playerId: string;
  passed: boolean;
  cardId?: CardId;
}

export interface StackItem {
  cardId: CardId;
  playerId: string;
}

// ---------------------------------------------------------------------------
// Pending actions
// ---------------------------------------------------------------------------

export type PendingActionType =
  | 'CHOOSE_MONSTER_TO_CLONE'
  | 'CHOOSE_MONSTER_FROM_HAND'
  | 'CHOOSE_PLAYER'
  | 'CHOOSE_ITEM_FROM_PLAYER'
  | 'CHOOSE_CARDS_TO_DISCARD'
  | 'WIZARD_CANCEL_CURSE'
  | 'HALFLING_ESCAPE_BONUS_CHOICE'
  | 'RESPOND_TO_HELP_OFFER'
  | 'CLERIC_RESURRECTION';

export interface PendingAction {
  type: PendingActionType;
  playerId: string;
  timeoutMs: number;
  options: PendingActionOption[];
  count?: number;
  availableCards?: CardId[];
}

export interface PendingActionOption {
  id: string;
  label: string;
  cardId?: string;
}

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

export interface LogEntry {
  timestamp: number;
  message: string;
  playerId?: string;
  cardId?: CardId;
}
