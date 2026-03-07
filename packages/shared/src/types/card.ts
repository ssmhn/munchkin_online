import type { EquipSlot, PlayerClass, Race, Gender, MonsterTag, StatusEffect, CardId } from './state';

export type CardType =
  | 'MONSTER'
  | 'EQUIPMENT'
  | 'ONE_SHOT'
  | 'CURSE'
  | 'RACE'
  | 'CLASS'
  | 'MODIFIER'
  | 'SPECIAL';

export type PlayContext =
  | 'YOUR_TURN_PRECOMBAT'
  | 'YOUR_TURN_COMBAT'
  | 'ANY_COMBAT'
  | 'REACTION'
  | 'ANYTIME';

export type EffectTarget =
  | 'SELF'
  | 'ACTIVE_PLAYER'
  | 'ALL_PLAYERS'
  | 'OTHER_PLAYERS'
  | 'LOWEST_LEVEL'
  | 'HIGHEST_LEVEL'
  | 'CHOSEN_PLAYER';

export interface ItemFilter {
  slot?: EquipSlot;
  isBig?: boolean;
  maxValue?: number;
}

// ---------------------------------------------------------------------------
// Card conditions
// ---------------------------------------------------------------------------

export type CardCondition =
  | { type: 'PLAYER_CLASS'; class: PlayerClass }
  | { type: 'PLAYER_RACE'; race: Race }
  | { type: 'PLAYER_GENDER'; gender: Gender }
  | { type: 'PLAYER_LEVEL'; op: 'gte' | 'lte' | 'eq'; value: number }
  | { type: 'MONSTER_NAME'; name: string }
  | { type: 'MONSTER_TAG'; tag: MonsterTag }
  | { type: 'IN_COMBAT' }
  | { type: 'ITEM_EQUIPPED'; slot: EquipSlot }
  | { type: 'HAS_STATUS'; status: StatusEffect }
  | { type: 'GAME_MODE'; mode: 'EPIC' | 'NORMAL' }
  | { type: 'AND'; conditions: CardCondition[] }
  | { type: 'OR'; conditions: CardCondition[] }
  | { type: 'NOT'; condition: CardCondition };

// ---------------------------------------------------------------------------
// Card effects
// ---------------------------------------------------------------------------

export type CardEffect =
  // Combat bonuses
  | { type: 'COMBAT_BONUS'; value: number; target: EffectTarget }
  | { type: 'MONSTER_BONUS'; value: number }
  | { type: 'MONSTER_PENALTY'; value: number }

  // Level modification
  | { type: 'MODIFY_LEVEL'; value: number; target: EffectTarget }
  | { type: 'SET_LEVEL'; value: number; target: EffectTarget }
  | { type: 'GAIN_LEVELS_FROM_KILL'; value: number }

  // Adding monsters
  | { type: 'ADD_MONSTER'; source: 'DOOR_DECK' | 'DISCARD' | 'HAND' }
  | { type: 'CLONE_MONSTER'; instanceId: 'CHOSEN' | 'CURRENT' }

  // Items and inventory
  | { type: 'REMOVE_EQUIPMENT'; slot: EquipSlot | 'ALL' | 'BEST'; target: EffectTarget }
  | { type: 'STEAL_ITEM'; itemFilter?: ItemFilter; target: EffectTarget }
  | { type: 'DISCARD_HAND'; count: number | 'ALL'; target: EffectTarget }
  | { type: 'FORCE_SELL'; target: EffectTarget }

  // Races and classes
  | { type: 'REMOVE_CLASS'; target: EffectTarget }
  | { type: 'REMOVE_RACE'; target: EffectTarget }
  | { type: 'CHANGE_GENDER'; target: EffectTarget }

  // Statuses and curses
  | { type: 'APPLY_CURSE'; curseId: string; target: EffectTarget }
  | { type: 'REMOVE_CURSE'; curseId?: string; target: EffectTarget }
  | { type: 'APPLY_STATUS'; status: StatusEffect; target: EffectTarget }

  // Cards in hand
  | { type: 'DRAW_CARDS'; count: number; deck: 'DOOR' | 'TREASURE'; target: EffectTarget }
  | { type: 'GIVE_CARD_FROM_HAND'; target: EffectTarget }

  // Escape and combat
  | { type: 'AUTO_ESCAPE' }
  | { type: 'ESCAPE_BONUS'; value: number }
  | { type: 'PREVENT_ESCAPE'; target: EffectTarget }
  | { type: 'COMBAT_IMMUNITY'; condition?: CardCondition }

  // Treasures
  | { type: 'EXTRA_TREASURE'; count: number }
  | { type: 'GAIN_GOLD'; value: number; target: EffectTarget }

  // Conditional meta-effect
  | { type: 'CONDITIONAL'; condition: CardCondition; then: CardEffect[]; else?: CardEffect[] };

// ---------------------------------------------------------------------------
// Card triggers
// ---------------------------------------------------------------------------

export type TriggerEvent =
  | 'ON_EQUIP'
  | 'ON_UNEQUIP'
  | 'ON_LEVEL_UP'
  | 'ON_KILL_MONSTER'
  | 'ON_COMBAT_START'
  | 'ON_COMBAT_END'
  | 'ON_HELPER_VICTORY'
  | 'ON_CURSE_RECEIVED'
  | 'ON_DOOR_OPENED';

export interface CardTrigger {
  event: TriggerEvent;
  condition?: CardCondition;
  effects: CardEffect[];
}

// ---------------------------------------------------------------------------
// Card requirements
// ---------------------------------------------------------------------------

export interface CardRequirement {
  type: 'CLASS' | 'RACE' | 'GENDER' | 'NOT_CLASS' | 'NOT_RACE';
  value: string;
}

// ---------------------------------------------------------------------------
// Bad stuff
// ---------------------------------------------------------------------------

export interface BadStuff {
  description?: string;
  effects: CardEffect[];
}

// ---------------------------------------------------------------------------
// Card definition
// ---------------------------------------------------------------------------

export interface CardDefinition {
  id: string;
  name: string;
  deck: 'DOOR' | 'TREASURE';
  type: CardType;
  subtype?: string;
  set?: string;
  description: string;
  imageUrl?: string;
  playableFrom?: PlayContext[];
  requirements?: CardRequirement[];
  slots?: EquipSlot[];
  isBig?: boolean;
  value?: number;
  effects: CardEffect[];
  triggers?: CardTrigger[];
  // Monster-specific
  baseLevel?: number;
  treasures?: number;
  badStuff?: BadStuff;
  tags?: MonsterTag[];
}

// ---------------------------------------------------------------------------
// Card database
// ---------------------------------------------------------------------------

export type CardDb = Record<string, CardDefinition>;
