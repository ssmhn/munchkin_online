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
