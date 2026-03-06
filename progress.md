# Progress

## TASK-001 — Monorepo initialization
- Created Turborepo + pnpm monorepo with 5 packages: shared, game-engine, server, client, data
- All packages have package.json, tsconfig.json, and skeleton src/index.ts
- `pnpm install` and `pnpm turbo build` pass without errors
- @munchkin/shared is importable from game-engine, server, client, and data

## TASK-002 — Game state TypeScript types
- Created packages/shared/src/types/state.ts with all interfaces from spec section 2.1
- GameState, PlayerState, CombatState, EquippedItems, PendingAction, LogEntry, etc.
- All types exported from shared/src/index.ts
- Tests in __tests__/types.test.ts verify type correctness (5 tests pass)
- tsc --noEmit passes, cross-package import works

## TASK-003 — Card system TypeScript types
- Created packages/shared/src/types/card.ts with CardDefinition, CardEffect (all 28 variants), CardCondition (AND/OR/NOT), CardTrigger, BadStuff, CardDb
- CLONE_MONSTER has instanceId: 'CHOSEN' | 'CURRENT'
- 6 tests verify Sword, Helmet (CONDITIONAL), Doppelganger, Dragon badStuff, nested conditions, Elf triggers

## TASK-004 — WS protocol types
- Created packages/shared/src/types/ws.ts with GameAction, GameEvent, C2S_Message, S2C_Message, JsonPatch
- GameAction is exhaustive discriminated union (12 variants)
- S2C_Message covers all 12 message types from spec
- 4 tests verify exhaustive switch, FULL_SYNC construction, C2S messages

## TASK-005 — Game engine skeleton
- Created engine.ts with applyAction, validate.ts with phase-based validation, errors.ts, helpers.ts
- State machine: KICK_DOOR→LOOT_ROOM, LOOT_ROOM→END_TURN→KICK_DOOR (next player) or CHARITY
- Action handlers stubbed for future tasks (combat, help, sell, etc.)
- 11 tests cover phase transitions, validation, immutability, diceRoll range check

## TASK-006 — Monster JSON data
- Created packages/data/src/monsters.json with 25 unique monsters (levels 1-20)
- Key monsters: big_rat (lv1), orc (lv4), plutonium_dragon (lv20, DRAGON tag)
- BadStuff uses CardEffect types (MODIFY_LEVEL, REMOVE_EQUIPMENT, DISCARD_HAND, SET_LEVEL)
- Tags: UNDEAD, DEMON, DRAGON. Conditional effects on Amazon (+2 vs males)
- 6 tests validate structure, level ranges, effect types, key monster presence

## TASK-007 — Equipment JSON data
- Created packages/data/src/equipment.json with 41 unique items
- Slots: rightHand, leftHand, twoHands, head, body, feet
- Conditional effects (helmet_of_courage), isBig items, race/class/gender requirements
- Values 100-800 gold. 6 tests validate structure, CONDITIONAL, two-handed, big items

## TASK-008 — Remaining card data (races, classes, oneshots, modifiers, curses, special)
- races.json: 4 races (Elf with ON_HELPER_VICTORY, Dwarf with EXTRA_BIG_ITEM, Halfling with ESCAPE_BONUS, Human)
- classes.json: 4 classes (Warrior IGNORE_WEAPON_RESTRICTIONS, Wizard, Cleric, Thief)
- oneshots.json: 15 potions/spells (combat bonuses, auto-escape, level gain, curse removal)
- modifiers.json: 8 monster modifiers (+3 to +10 bonus, penalties, extra treasures)
- curses.json: 10 curses (lose class/race/gender, equipment removal, level loss, lasting curses)
- special.json: 5 specials (Doppelganger CLONE_MONSTER, Wandering Monster ADD_MONSTER, etc.)
- 13 tests verify key cards and their effects

## TASK-009 — Combat calculation system
- Created packages/game-engine/src/combat.ts
- calculatePlayerPower: level + equipment + applied cards + helpers - curses, with CONDITIONAL resolution
- calculateMonsterPower: sum of baseLevel + modifiers for all monsters
- calculateCombatResult: strict inequality (player > monster), Math.max(0, total)
- evaluateCondition: supports PLAYER_CLASS, PLAYER_RACE, PLAYER_GENDER, PLAYER_LEVEL, AND/OR/NOT
- 7 tests cover WIN/LOSE, draw-is-loss, helpers, conditional bonuses, modifiers, non-negative power

## TASK-010 — Combat victory handling
- Created packages/game-engine/src/combat-resolution.ts with resolveCombatVictory
- +1 level per monster killed, treasure draw (sum of monster treasures + EXTRA_TREASURE)
- ON_KILL_MONSTER and ON_HELPER_VICTORY triggers fire correctly (Elf gets +1 level)
- Win condition: level >= winLevel (10) → END_GAME phase, winner set
- Treasure distribution: helpers get agreed rewards, rest to active player
- 4 tests: 2-monster victory, Elf helper trigger, win at level 10, discard after combat

## TASK-011 — Combat defeat (Bad Stuff, run away)
- Created packages/game-engine/src/combat-defeat.ts with handleRunAwayFull
- Escape: diceRoll + escapeBonus >= 5 (Halfling gets +1 from race)
- Bad Stuff on failure: MODIFY_LEVEL, SET_LEVEL, REMOVE_EQUIPMENT (ALL/BEST/specific), DISCARD_HAND
- Dragon death: level=1, all equipment removed, hand discarded
- 4 tests: failed escape, successful escape, Dragon death, Halfling escape bonus
