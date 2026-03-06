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

## TASK-012 — Doppelganger mechanics
- Created packages/game-engine/src/doppelganger.ts + id-gen.ts
- Auto-clone when 1 monster, CHOOSE_MONSTER_TO_CLONE pending action when multiple
- Clone inherits all modifiers (independent copies)
- handleChooseMonsterToClone resolves pending action and adds clone
- 4 tests: auto-clone, pending action creation, choice resolution, modifier inheritance

## TASK-013 — Reaction Window system
- Created packages/game-engine/src/reactions.ts
- openReactionWindow: creates window with trigger, responses for all connected players
- handleReactionPass/handleReactionPlayCard: collect responses, check completion
- Stack resolves in reverse order (LIFO like MTG)
- applyAutoPassForDisconnected for timeout handling
- 3 tests: open window, all-pass closure, reverse stack resolution

## TASK-015 — Equipment system
- Created packages/game-engine/src/equipment.ts with handleEquipItemFull
- Slot validation (no duplicate slots), two-handed blocks both hands
- Big item limit (1 normally, 2 for Dwarf with EXTRA_BIG_ITEM status)
- Warrior IGNORE_WEAPON_RESTRICTIONS bypasses requirements
- Requirements: CLASS, RACE, GENDER, NOT_CLASS, NOT_RACE
- 5 tests: equip, duplicate slot, two-handed blocking, big item limit, Dwarf exception

## TASK-014 — Help negotiation
- Created packages/game-engine/src/negotiation.ts with OFFER_HELP, ACCEPT_HELP, DECLINE_HELP, COUNTER_OFFER
- Added HelpOffer interface to CombatState in shared types
- Active player offers help during combat → NEGOTIATION phase
- Target can accept (adds helper with agreedReward), decline, or counter-offer (swaps direction)
- Engine stubs replaced with real implementations
- 5 tests: offer, accept, decline, counter-offer, reward verification

## TASK-019 — Passive race/class abilities
- Verified all passive abilities already implemented: Elf ON_HELPER_VICTORY, Halfling ESCAPE_BONUS, Dwarf EXTRA_BIG_ITEM
- Created packages/game-engine/__tests__/passive-abilities.test.ts consolidating 3 integration tests
- Triggers fire automatically via combat-resolution, combat-defeat, and equipment modules

## TASK-018 — Charity phase
- Created packages/game-engine/src/charity.ts with handleCharityDiscard and needsCharity
- >5 cards → CHARITY phase; excess cards go to lowest-level player round-robin
- If no other players, cards are discarded to treasure pile
- 3 tests: CHARITY transition, give cards, skip when ≤5 cards

## TASK-017 — Sell items for levels
- Created packages/game-engine/src/sell.ts with handleSellItems
- Sells items from hand/carried for gold, 1000 gold = +1 level
- Cannot sell to reach level 10, cannot sell during combat
- Cards discarded to appropriate deck, added cardDb param to applyAction
- 3 tests: sell for levels, level 10 restriction, combat restriction

## TASK-016 — Curses system
- Created packages/game-engine/src/curses.ts with applyCurseCard and removeCurse
- Immediate effects: REMOVE_CLASS, REMOVE_RACE, CHANGE_GENDER, MODIFY_LEVEL, REMOVE_EQUIPMENT
- Lasting curses via APPLY_CURSE effect → added to player.curses, affect calculatePlayerPower
- removeCurse removes by curseId or shifts first curse
- Curse cards discarded after application
- 4 tests: lose class, change gender, lasting combat curse, remove curse restores power
