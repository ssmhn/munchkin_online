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

## TASK-028 — ReactionBar
- Created ReactionBar: trigger text, countdown timer, pass button, reaction card buttons
- GSAP animations: slide-in from bottom, timer progress bar linear decrease
- Pass disables button and changes text to "Passed"
- Closes when reaction window closes
- 5 Playwright E2E tests: appear, pass/disable, cards visible, close, timer

## TASK-027 — CombatZone UI
- Created CombatZone: monsters with names, combat powers, action buttons, helpers
- GSAP animations: zone scale-in, monster slide-in, button stagger
- Buttons disabled when not active player
- TestCombatPage for non-active player testing
- 6 Playwright E2E tests: combat appear, clone add, buttons disabled/enabled, powers, panel

## TASK-026 — Game board UI components
- Created PlayerArea: level, name, race, class, gender, card count, GSAP level animation
- CardHand: own hand shows real cards, other hands show backs, GSAP stagger entry animation
- DeckArea: door and treasure deck with card counts
- GameLog: last 20 entries with GSAP slideIn animation
- GameBoard: composes all components with self-player identification
- TestBoardPage: test harness with mock state and level bump button
- 9 Playwright E2E tests: player areas, levels, cards, decks, log, active highlight, reactive updates

## TASK-025 — Client skeleton
- React 18 + React Router + Zustand + GSAP 3 + @gsap/react installed
- LobbyPage: room list, create room, join room with player name input
- GamePage: WS connection with auto-reconnect, FULL_SYNC/STATE_PATCH handling
- useGameStore: Zustand store with applyFullSync, applyStatePatch
- GameWsClient: exponential backoff reconnect (up to 10 attempts)
- AnimationQueue: GSAP animation queue, STATE_PATCH applied after animation completes
- useGsapTimeline hook for reusable timelines
- Playwright config + 4 E2E tests: lobby render, input, no console errors, game loading state

## TASK-024 — Reconnect
- Created reconnect.ts with handleReconnect, handleDisconnect, applyDisconnectedTimeout
- Reconnect sends FULL_SYNC, marks player connected, notifies others with PLAYER_RECONNECTED
- Disconnect marks player offline, sends PLAYER_LEFT to others
- Timeout removes pending actions for disconnected players
- 3 tests: FULL_SYNC on reconnect, disconnect notification, timeout cleanup

## TASK-023 — Lobby HTTP API
- Created lobby-routes.ts with POST /lobby/rooms, GET /lobby/rooms, POST /lobby/rooms/:id/join
- Room creation returns roomId, join returns JWT with playerId + roomId + playerName
- Max 6 players per room, cannot join started game
- 3 tests: create room, 7th player rejected, JWT payload verification

## TASK-022 — GameRoom with state projection
- Created GameRoom: loads state from Redis, applies action, saves via compareAndSet, broadcasts
- stateProjector hides other players' hands (HIDDEN[]) and decks
- Each client gets their own projected view of state
- InvalidActionError → ERROR to client, race condition → FULL_SYNC re-sync
- 3 tests: own hand visible, decks hidden, different projections per player

## TASK-021 — WebSocket server
- Created Fastify + @fastify/websocket server with JWT auth
- WsClient wraps WebSocket with send(), ping(), playerId, roomId
- MessageRouter parses messages, handles PING/PONG, routes to GameRoom handler
- Invalid JSON returns ERROR without dropping connection
- 4 tests: reject without JWT, accept with JWT, error on invalid JSON, PING→PONG

## TASK-020 — Redis + Prisma/PostgreSQL setup
- Created docker-compose.yml with Redis 7 and PostgreSQL 16
- Created Prisma schema with User and GameSession models
- Created RedisGameStore with getState, setState, compareAndSet (atomic via Lua script), 24h TTL
- Created PgUserStore with createUser, findUserById, findUserByEmail
- 4 integration tests: setState+getState, null for missing, CAS success, CAS failure with wrong version

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

## TASK-030 — ChooseTargetOverlay UI
- Created ChooseTargetOverlay: modal for pending actions (clone monster, choose player, choose item)
- GSAP animations: overlay scale-in, progress bar countdown timer
- Dynamic title based on action type, option buttons with data-testid
- TestChoicePage: test harness with mock PendingAction and choice callback
- 3 Playwright E2E tests: overlay with options visible, choice closes overlay, timer bar exists

## TASK-031 — Server-side validation
- Created packages/server/src/game/action-validator.ts with validateActionServer
- playerId always from JWT (WsClient), never from action payload
- PLAY_CARD: validates card in hand, carried, or equipped
- SELL_ITEMS: validates all cards owned by player
- OFFER_HELP/COUNTER_OFFER: validates reward cards belong to offering player, target exists
- RUN_AWAY: diceRoll must be integer 1-6
- Unknown player → INVALID_PLAYER error
- Integrated into GameRoom.handleAction before engine call
- 10 tests: card ownership, JWT playerId, diceRoll range, trade cards, unknown player

## TASK-034 — Design system
- Created theme.css with CSS variables: --color-bg, --color-surface, --color-gold, --color-danger, --color-text, --shadow-card, etc.
- Cinzel fantasy font via Google Fonts, Inter for body text
- GoldButton: hover via GSAP scale:1.05 + box-shadow glow, primary/danger variants, disabled state
- CardFrame: border color by card type (MONSTER=red, EQUIPMENT=gold, CLASS=blue, etc.), gradient background
- LevelBadge: circular badge with GSAP scale+elastic animation on level change
- TestDesignPage at /test-design with all components
- 7 Playwright E2E tests: button variants, no CSS transition, card types, level badge, CSS vars, font

## TASK-029 — NegotiationModal UI
- Created NegotiationModal: send mode (select target player + reward cards) and receive mode (accept/decline/counter)
- GSAP animations: overlay scale-in, progress bar countdown (30s timeout)
- Send mode: player target buttons, toggleable reward card selection, send/cancel actions
- Receive mode: shows incoming offer rewards, accept/decline/counter-offer buttons
- TestNegotiationPage at /test-negotiation with mode switching
- 7 Playwright E2E tests: send with targets/cards, send offer, cancel, receive offer, accept, decline, timer

## TASK-032 — Integration tests
- Created packages/server/__tests__/integration.test.ts with 8 integration tests
- setupTestGame(n) creates n players with hands, decks, correct state
- Full cycle test: kick door → loot room → end turn → next player's turn
- Non-active player rejection, phase validation, card ownership validation
- State projection: own hand visible, other hands hidden
- diceRoll range validation (1-6), reconnect state reflection
- Run 3 times consecutively — 0 flaky tests

## TASK-035 — Card draw animation
- Created CardDrawAnimation: GSAP flight from deck to hand with flip effect
- Cards fly from deck getBoundingClientRect to hand area with stagger 0.15s
- Flip: rotateY 0→90 (hides back), swap content, rotateY 90→0 (shows face)
- State not updated until animation completes (AnimationQueue pattern)
- TestCardDrawPage at /test-card-draw with draw 1 / draw 3 buttons
- 4 Playwright E2E tests: draw+appear, 3-card stagger, state-pending, button-disabled

## TASK-036 — Door kick animation
- Created DoorKickAnimation: GSAP timeline with door opening and card reveal
- Door rotateY 0→-110° on hinge, perspective 3D effect
- Monster: elastic.out scale+rotation appearance
- Equipment: bounce.out drop from above
- Curse: red flash overlay opacity 0→0.4→0, then card appears
- Timeline ref for cancellation on reconnect
- TestDoorKickPage at /test-door-kick with 3 card type buttons
- 4 Playwright E2E tests: monster elastic, equipment bounce, curse flash, door panel

## TASK-037 — Combat result animation
- Created CombatResultAnimation: GSAP timelines for victory, defeat, escape outcomes
- Clash: player+monster move toward center then bounce back
- Victory: 80 confetti particles with random colors/positions, monster flies to discard, "VICTORY!" label
- Defeat: dark overlay opacity→0.7, player shake x:[0,-10,10,-10,0], "DEFEAT" label
- Escape: player runs off-screen left (x:-600), returns from right, "ESCAPED!" label
- TestCombatResultPage at /test-combat-result
- 3 Playwright E2E tests: victory+confetti, defeat+overlay, escape+return

## TASK-038 — Card hand interactions
- Created InteractiveCardHand: hover lift, play card fly, forbidden shake
- Hover: GSAP y:-20, scale:1.1 (no CSS transition)
- Play: card flies to center with rotation, fades out, remaining cards re-layout with stagger
- Forbidden: shake x:[0,-5,5,-5,0] + red border flash, card stays in hand
- Touch events mapped for mobile compatibility
- Playable cards have gold border, forbidden have muted border + 0.6 opacity
- TestCardHandPage at /test-card-hand
- 5 Playwright E2E tests: render, hover GSAP, play+remove, forbidden shake, border styles

## TASK-039 — Doppelganger clone animation
- Created DoppelgangerAnimation: shadow separation, blur materialization, SVG arc
- Auto-clone: shadow separates right with blur 20px→0, opacity 0→1, scale 0.8→1
- SVG arc between original and clone via strokeDashoffset animation
- Choose mode: multiple monsters pulsate (scale:1.05, yoyo, repeat:-1)
- After choice: pulsation killed, clone animation plays, chosen gets gold glow
- TestDoppelgangerPage at /test-doppelganger
- 3 Playwright E2E tests: auto-clone blur, choose pulsation, choose+clone

## TASK-040 — Dice roll animation
- Created DiceRollOverlay: 3D-rotating dice with flickering numbers
- GSAP rotationX:720+, rotationY:540+, power4.out over 1.5s
- Random number flicker during spin (80ms interval), settles to result
- Scale pulse 1.3→1 on landing with elastic ease
- Success (>=5): green glow drop-shadow + "Success!" label
- Fail (<5): red glow + screen shake x:[0,-5,5,-5,0] + "Failed!" label
- TestDiceRollPage at /test-dice-roll
- 4 Playwright E2E tests: spin duration, success glow, fail glow, result number

## TASK-041 — Ambient effects
- Created AmbientParticles: 20-30 floating dust particles, GSAP repeat:-1 yoyo motion + opacity flicker
- ActivePlayerGlow: pulsating gold boxShadow for active player, smooth removal on deactivation
- AnimatedTitle: letters appear with gsap.from y:40, opacity:0, stagger:0.05 with back.out ease
- Performance: only transform and opacity animated, no width/height/top/left
- TestAmbientPage at /test-ambient
- 4 Playwright E2E tests: title letters, particle count, glow switching, transform-only animation

## TASK-042 — Victory screen
- Created VictoryScreen: 100+ confetti particles, trophy bounce, letter-by-letter winner name
- Confetti: gsap.to random x/y/rotation/scale/color from center, 8 colors
- Trophy: gsap.from y:-200 bounce.out + wobble rotation repeat:-1 yoyo
- Winner name: letter stagger gsap.from y:-50, opacity:0, scale:0→1 with back.out
- Play Again button appears after 2s delay with gsap.from opacity:0, y:30
- TestVictoryPage at /test-victory
- 4 Playwright E2E tests: 100+ confetti, letter count, trophy, button delay+navigate
