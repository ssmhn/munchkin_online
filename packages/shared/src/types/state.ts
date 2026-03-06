export type CardId = string;

export type Gender = 'MALE' | 'FEMALE';

export type Race = 'ELF' | 'DWARF' | 'HALFLING' | 'HUMAN';

export type PlayerClass = 'WARRIOR' | 'WIZARD' | 'CLERIC' | 'THIEF';

export type EquipSlot = 'head' | 'body' | 'feet' | 'leftHand' | 'rightHand' | 'twoHands';

export type MonsterTag = 'UNDEAD' | 'DEMON' | 'DRAGON';

export type StatusEffect = 'IGNORE_WEAPON_RESTRICTIONS' | 'EXTRA_BIG_ITEM' | 'ESCAPE_BONUS';

export type GamePhase =
  | 'WAITING'
  | 'KICK_DOOR'
  | 'LOOT_ROOM'
  | 'LOOK_FOR_TROUBLE'
  | 'CHARITY'
  | 'COMBAT'
  | 'AFTER_COMBAT'
  | 'END_TURN'
  | 'END_GAME';

export type CombatPhase =
  | 'REACTION_WINDOW'
  | 'NEGOTIATION'
  | 'ACTIVE'
  | 'RUN_ATTEMPT'
  | 'RESOLVING';

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
}

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
}

export interface EquippedItems {
  head: CardId | null;
  body: CardId | null;
  feet: CardId | null;
  leftHand: CardId | null;
  rightHand: CardId | null;
  twoHands: CardId | null;
  extras: CardId[];
}

export interface CombatState {
  phase: CombatPhase;
  monsters: CombatMonster[];
  activePlayerId: string;
  helpers: CombatHelper[];
  appliedCards: AppliedCard[];
  reactionWindow: ReactionWindow | null;
  runAttempts: number;
  resolved: boolean;
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
  agreedReward: CardId[];
}

export interface AppliedCard {
  cardId: CardId;
  playerId: string;
}

export interface ActiveCurse {
  curseId: string;
  cardId: CardId;
}

export interface ReactionWindow {
  trigger: ReactionTrigger;
  timeoutMs: number;
  responses: Record<string, ReactionResponse>;
  stack: StackItem[];
}

export type ReactionTrigger =
  | { type: 'DOOR_OPENED'; cardId: CardId }
  | { type: 'COMBAT_STARTED'; monsterId: CardId }
  | { type: 'CARD_PLAYED'; cardId: CardId; playerId: string }
  | { type: 'COMBAT_RESULT'; result: 'WIN' | 'LOSE' };

export interface ReactionResponse {
  playerId: string;
  passed: boolean;
  cardId?: CardId;
}

export interface StackItem {
  cardId: CardId;
  playerId: string;
}

export interface PendingAction {
  type: 'CHOOSE_MONSTER_TO_CLONE' | 'CHOOSE_PLAYER' | 'CHOOSE_ITEM_FROM_PLAYER';
  playerId: string;
  timeoutMs: number;
  options: PendingActionOption[];
}

export interface PendingActionOption {
  id: string;
  label: string;
  cardId?: string;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  playerId?: string;
  cardId?: CardId;
}
