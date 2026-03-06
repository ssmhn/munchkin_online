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
