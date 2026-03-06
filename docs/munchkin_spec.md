# Munchkin Online — Техническая спецификация

> Браузерная мультиплеерная реализация настольной игры Манчкин (базовый набор)  
> TypeScript • WebSockets • GSAP 3 • Тёмная фэнтези-тема

---

## Содержание

1. [Обзор и технологический стек](#1-обзор-и-технологический-стек)
2. [Игровой движок](#2-игровой-движок)
3. [Система карт](#3-система-карт)
4. [Примеры JSON-описаний карт](#4-примеры-json-описаний-карт)
5. [База данных карт](#5-база-данных-карт)
6. [WS-протокол](#6-ws-протокол)
7. [Серверная архитектура](#7-серверная-архитектура)
8. [Клиентская архитектура и GSAP-анимации](#8-клиентская-архитектура-и-gsap-анимации)
9. [Стратегия тестирования](#9-стратегия-тестирования)
10. [Дорожная карта](#10-дорожная-карта)
11. [Ключевые решения и риски](#11-ключевые-решения-и-риски)
12. [Локальная разработка и секреты](#12-локальная-разработка-и-секреты)

---

## 1. Обзор и технологический стек

Проект представляет собой браузерную мультиплеерную реализацию настольной игры Манчкин (базовый набор). Вся игровая логика выполняется на сервере; клиент является тонким и только отображает стейт и отправляет действия игроков.

### 1.1 Принципы архитектуры

- **Server-authoritative** — клиент никогда не изменяет стейт самостоятельно
- **Иммутабельный стейт** — каждое действие порождает новую копию состояния игры
- **Event-sourcing** — все изменения стейта — следствие событий, которые можно логировать и воспроизводить
- **Декларативные карты** — логика каждой карты описана в JSON, а не в коде
- **Разделение движка и транспорта** — `game-engine` — чистая функция без I/O
- **AnimationQueue** — `STATE_PATCH` применяется к стору только после завершения текущей GSAP-анимации; анимации и стейт не рассинхронизируются

### 1.2 Монорепо и пакеты

```
/packages
  /game-engine    — вся игровая логика, чистый TS без I/O
  /server         — WebSocket сервер, сессии, авторизация
  /client         — React SPA
  /shared         — общие типы, схемы карт, константы
  /data           — JSON-файлы всех карт базового набора
```

### 1.3 Технологический стек

| Слой | Технология | Обоснование |
|---|---|---|
| Монорепо | Turborepo + pnpm | Быстрая сборка, shared types |
| Frontend | React 18 + TypeScript | Компонентная модель, широкая экосистема |
| Стейт клиента | Zustand | Минималистичный, без бойлерплейта |
| Анимации | **GSAP 3 + @gsap/react** | Все игровые анимации — только через GSAP, не CSS transitions |
| Backend | Node.js + Fastify | Скорость, нативный TypeScript |
| Realtime | ws (нативные WebSockets) | Без лишней абстракции Socket.io |
| Игровые сессии | Redis | In-memory, TTL 24ч, pub/sub для масштабирования |
| БД пользователей | PostgreSQL + Prisma | Надёжность, типизированный ORM |
| Тесты | Vitest | Быстрый, совместим с Jest API |
| Сборка | Vite (client), tsc (server) | HMR, быстрая сборка |

### 1.4 UI и дизайн-система

**Тема**: тёмная фэнтези-эстетика с богатыми эффектами частиц и плавными GSAP-переходами.

**Ключевые CSS-переменные**:

```css
--color-bg:       #1a1208;   /* основной фон */
--color-surface:  #2a1f0e;   /* поверхности карточек */
--color-gold:     #c9a84c;   /* акцентный цвет */
--color-danger:   #8b1a1a;   /* монстры, урон */
--color-text:     #e8d5a3;   /* основной текст */
--shadow-card:    0 4px 20px rgba(0,0,0,0.6);
```

**Шрифт**: Cinzel (Google Fonts) — заголовки и имена карт.

**Базовые компоненты**:
- `GoldButton` — hover-эффект через `gsap.to(scale: 1.05)` + box-shadow glow, **не CSS transition**
- `CardFrame` — рамка с градиентом по типу: монстр → красный, предмет → золотой, класс → синий
- `LevelBadge` — круглый бейдж; изменение значения анимируется через GSAP

---

## 2. Игровой движок

`game-engine` — чистый TypeScript-пакет без внешних зависимостей и без I/O. Принимает текущий стейт и действие, возвращает новый стейт + список событий для рассылки клиентам.

### 2.1 Игровой стейт

```typescript
// packages/shared/src/types/state.ts

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
  carried: CardId[];     // большие предметы не в слоте
  curses: ActiveCurse[];
  isConnected: boolean;
}

export interface EquippedItems {
  head: CardId | null;
  body: CardId | null;
  feet: CardId | null;
  leftHand: CardId | null;
  rightHand: CardId | null;
  twoHands: CardId | null;  // двуручное оружие
  extras: CardId[];          // прочие слоты (некоторые расы)
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
  instanceId: string;  // уникальный ID экземпляра в бою
}

export interface CombatHelper {
  playerId: string;
  agreedReward: CardId[];  // сокровища, обещанные помощнику
}

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
  | 'REACTION_WINDOW'  // ждём реакций от всех игроков
  | 'NEGOTIATION'      // активный игрок ищет помощников
  | 'ACTIVE'           // карты можно разыгрывать
  | 'RUN_ATTEMPT'      // бросок кубика на побег
  | 'RESOLVING';       // применяем исход боя
```

### 2.2 Машина состояний хода

```
KICK_DOOR (открыть дверь)
├─ Монстр → COMBAT
│   ├─ Победа → AFTER_COMBAT → взять сокровища → END_TURN
│   └─ Поражение → BAD_STUFF → потери → END_TURN
├─ Проклятие → RESOLVE_CURSE → LOOT_ROOM или END_TURN
└─ Пусто / предмет / раса/класс → рука →
    └─ LOOT_ROOM: можно сыграть монстра из руки
        ├─ Сыграл монстра → LOOK_FOR_TROUBLE → COMBAT
        └─ Не сыграл → END_TURN → CHARITY (если > 5 карт в руке)
```

Переход в `END_GAME` при достижении победителем уровня `config.winLevel` (по умолчанию 10). Последний уровень можно получить **только убийством монстра**, не продажей предметов.

### 2.3 Основной loop движка

```typescript
export function applyAction(
  state: GameState,
  action: GameAction
): { state: GameState; events: GameEvent[] } {
  validateAction(state, action);
  const [nextState, events] = reduce(state, action);
  const [finalState, autoEvents] = runAutoTransitions(nextState);
  return { state: finalState, events: [...events, ...autoEvents] };
}

function reduce(state: GameState, action: GameAction): [GameState, GameEvent[]] {
  switch (action.type) {
    case 'KICK_DOOR':     return handleKickDoor(state, action);
    case 'PLAY_CARD':     return handlePlayCard(state, action);
    case 'EQUIP_ITEM':    return handleEquipItem(state, action);
    case 'OFFER_HELP':    return handleOfferHelp(state, action);
    case 'ACCEPT_HELP':   return handleAcceptHelp(state, action);
    case 'DECLINE_HELP':  return handleDeclineHelp(state, action);
    case 'COUNTER_OFFER': return handleCounterOffer(state, action);
    case 'RUN_AWAY':      return handleRunAway(state, action);
    case 'END_TURN':      return handleEndTurn(state, action);
    case 'REACT_PASS':    return handleReactionPass(state, action);
    case 'SELL_ITEMS':    return handleSellItems(state, action);
    case 'CHOOSE_OPTION': return handleChooseOption(state, action);
    default:
      throw new InvalidActionError(`Unknown action: ${(action as any).type}`);
  }
}
```

### 2.4 Стек реакций (Reaction Window)

Когда происходит значимое событие (открыта дверь, начат бой, сыграна карта), все игроки получают окно для реакции. Стек разрешается в обратном порядке (как в Magic: The Gathering).

```typescript
export interface ReactionWindow {
  trigger: ReactionTrigger;
  timeoutMs: number;
  responses: Record<string, ReactionResponse>;
  stack: StackItem[];
}

export type ReactionTrigger =
  | { type: 'DOOR_OPENED';    cardId: CardId }
  | { type: 'COMBAT_STARTED'; monsterId: CardId }
  | { type: 'CARD_PLAYED';    cardId: CardId; playerId: string }
  | { type: 'COMBAT_RESULT';  result: 'WIN' | 'LOSE' };
```

При таймауте — автоматический `REACT_PASS` для не ответивших игроков. Стек применяется в обратном порядке добавления.

### 2.5 Расчёт боя

**Правило победы**: `playerTotal > monsterTotal` — строгое неравенство. При равных значениях побеждает монстр.

Слагаемые силы игрока: уровень + бонусы от экипировки + бонусы от сыгранных карт − штрафы от проклятий + бонусы расы/класса (с учётом `CONDITIONAL`) + сила помощников. `Math.max(0, total)` — сила не может быть отрицательной.

Слагаемые силы монстра: сумма `baseLevel` всех монстров в `combat.monsters` + их модификаторы.

### 2.6 Механика Доппельгангера

- **Один монстр в бою** → клонирование немедленно, без `PendingAction`
- **Несколько монстров** → создаётся `PendingAction` типа `CHOOSE_MONSTER_TO_CLONE` с `options[]` по `instanceId`

Клон наследует все `modifiers` оригинала и получает новый уникальный `instanceId`. В JSON карты: `{ type: "CLONE_MONSTER", instanceId: "CHOSEN" }`.

### 2.7 Побег (RunAway)

Клиент отправляет `diceRoll` (1–6), сервер валидирует диапазон.

```
Успех: diceRoll + escapeBonus >= 5
```

При провале применяются Bad Stuff каждого монстра в `combat.monsters`. При успехе игрок выходит из боя, монстры остаются.

### 2.8 Продажа предметов

- Принимает массив `cardIds` из `hand` или `carried` (не экипированных)
- Каждые 1000 золота = +1 уровень
- Нельзя продать до уровня 10 — последний уровень только через убийство монстра
- Нельзя продавать во время фазы `COMBAT`

### 2.9 Фаза благотворительности (CHARITY)

Если в конце хода у активного игрока > 5 карт в руке — наступает фаза `CHARITY`. `END_TURN` блокируется пока `hand.length > 5`. Лишние карты отдаются другим игрокам или сбрасываются.

---

## 3. Система карт

Каждая карта описана в JSON как набор триггеров и эффектов. Движок не содержит кода для конкретных карт — он интерпретирует описания. Добавление новой карты = только JSON, без изменения кода движка.

### 3.1 Базовая схема карты

```typescript
// packages/shared/src/types/card.ts

export interface CardDefinition {
  id: string;
  name: string;
  deck: 'DOOR' | 'TREASURE';
  type: CardType;
  subtype?: CardSubtype;
  description: string;
  imageUrl: string;
  playableFrom: PlayContext[];
  requirements?: CardRequirement[];
  slots?: EquipSlot[];
  isBig?: boolean;    // большой предмет (ограничение 1 шт.)
  value?: number;     // стоимость для продажи (в золоте)
  effects: CardEffect[];
  triggers?: CardTrigger[];
}

export type CardType =
  | 'MONSTER'
  | 'EQUIPMENT'
  | 'ONE_SHOT'   // одноразовая карта (зелье, заклинание)
  | 'CURSE'
  | 'RACE'
  | 'CLASS'
  | 'MODIFIER'   // усилитель монстра
  | 'SPECIAL';   // Доппельгангер, Бродячий монстр и т.д.

export type PlayContext =
  | 'YOUR_TURN_PRECOMBAT'
  | 'YOUR_TURN_COMBAT'
  | 'ANY_COMBAT'   // можно играть в любой бой (в т.ч. чужой)
  | 'REACTION'     // карта-прерывание
  | 'ANYTIME';
```

### 3.2 Полный каталог типов эффектов

```typescript
export type CardEffect =
  // ── Боевые бонусы ──────────────────────────────────────
  | { type: 'COMBAT_BONUS';    value: number; target: EffectTarget }
  | { type: 'MONSTER_BONUS';   value: number }
  | { type: 'MONSTER_PENALTY'; value: number }

  // ── Изменение уровня ───────────────────────────────────
  | { type: 'MODIFY_LEVEL';          value: number; target: EffectTarget }
  | { type: 'SET_LEVEL';             value: number; target: EffectTarget }
  | { type: 'GAIN_LEVELS_FROM_KILL'; value: number }

  // ── Добавление монстров ────────────────────────────────
  | { type: 'ADD_MONSTER';   source: 'DOOR_DECK' | 'DISCARD' | 'HAND' }
  | { type: 'CLONE_MONSTER'; instanceId: 'CHOSEN' | 'CURRENT' }
  // CHOSEN = игрок выбирает, CURRENT = единственный монстр (автоклон)

  // ── Предметы и инвентарь ───────────────────────────────
  | { type: 'REMOVE_EQUIPMENT'; slot: EquipSlot | 'ALL' | 'BEST'; target: EffectTarget }
  | { type: 'STEAL_ITEM';       itemFilter?: ItemFilter; target: EffectTarget }
  | { type: 'DISCARD_HAND';     count: number | 'ALL'; target: EffectTarget }
  | { type: 'FORCE_SELL';       target: EffectTarget }

  // ── Расы и классы ──────────────────────────────────────
  | { type: 'REMOVE_CLASS';  target: EffectTarget }
  | { type: 'REMOVE_RACE';   target: EffectTarget }
  | { type: 'CHANGE_GENDER'; target: EffectTarget }

  // ── Статусы и проклятия ────────────────────────────────
  | { type: 'APPLY_CURSE';  curseId: string; target: EffectTarget }
  | { type: 'REMOVE_CURSE'; curseId?: string; target: EffectTarget }
  | { type: 'APPLY_STATUS'; status: StatusEffect; target: EffectTarget }

  // ── Карты в руке ───────────────────────────────────────
  | { type: 'DRAW_CARDS';          count: number; deck: 'DOOR' | 'TREASURE'; target: EffectTarget }
  | { type: 'GIVE_CARD_FROM_HAND'; target: EffectTarget }

  // ── Побег и бой ────────────────────────────────────────
  | { type: 'AUTO_ESCAPE' }
  | { type: 'ESCAPE_BONUS';    value: number }
  | { type: 'PREVENT_ESCAPE';  target: EffectTarget }
  | { type: 'COMBAT_IMMUNITY'; condition?: CardCondition }

  // ── Сокровища ──────────────────────────────────────────
  | { type: 'EXTRA_TREASURE'; count: number }
  | { type: 'GAIN_GOLD';      value: number; target: EffectTarget }

  // ── Условный мета-эффект ───────────────────────────────
  | { type: 'CONDITIONAL'; condition: CardCondition; then: CardEffect[]; else?: CardEffect[] };
```

### 3.3 Условия (CardCondition)

```typescript
export type CardCondition =
  | { type: 'PLAYER_CLASS';  class: PlayerClass }
  | { type: 'PLAYER_RACE';   race: Race }
  | { type: 'PLAYER_GENDER'; gender: Gender }
  | { type: 'PLAYER_LEVEL';  op: 'gte' | 'lte' | 'eq'; value: number }
  | { type: 'MONSTER_NAME';  name: string }
  | { type: 'MONSTER_TAG';   tag: MonsterTag }  // 'UNDEAD', 'DEMON', 'DRAGON'...
  | { type: 'IN_COMBAT' }
  | { type: 'ITEM_EQUIPPED'; slot: EquipSlot }
  | { type: 'HAS_STATUS';    status: StatusEffect }
  | { type: 'AND';  conditions: CardCondition[] }
  | { type: 'OR';   conditions: CardCondition[] }
  | { type: 'NOT';  condition: CardCondition };
```

### 3.4 Триггеры карт

```typescript
export interface CardTrigger {
  event: TriggerEvent;
  condition?: CardCondition;
  effects: CardEffect[];
}

export type TriggerEvent =
  | 'ON_EQUIP'
  | 'ON_UNEQUIP'
  | 'ON_LEVEL_UP'
  | 'ON_KILL_MONSTER'
  | 'ON_COMBAT_START'
  | 'ON_COMBAT_END'
  | 'ON_HELPER_VICTORY'   // способность Эльфа
  | 'ON_CURSE_RECEIVED'
  | 'ON_DOOR_OPENED';
```

---

## 4. Примеры JSON-описаний карт

### 4.1 Простой предмет — Меч Рубки

```json
{
  "id": "sword_of_slaying",
  "name": "Меч Рубки",
  "deck": "TREASURE",
  "type": "EQUIPMENT",
  "description": "+3 к бою",
  "playableFrom": ["YOUR_TURN_PRECOMBAT", "YOUR_TURN_COMBAT"],
  "slots": ["rightHand"],
  "value": 300,
  "effects": [{ "type": "COMBAT_BONUS", "value": 3, "target": "SELF" }]
}
```

### 4.2 Условный предмет — Шлем Смелости

+2 всем, но +4 Воину. Реализуется через `CONDITIONAL`.

```json
{
  "id": "helmet_of_courage",
  "name": "Шлем Смелости",
  "deck": "TREASURE",
  "type": "EQUIPMENT",
  "description": "+2 к бою (+4 для Воина)",
  "slots": ["head"],
  "value": 400,
  "effects": [
    {
      "type": "CONDITIONAL",
      "condition": { "type": "PLAYER_CLASS", "class": "WARRIOR" },
      "then": [{ "type": "COMBAT_BONUS", "value": 4, "target": "SELF" }],
      "else": [{ "type": "COMBAT_BONUS", "value": 2, "target": "SELF" }]
    }
  ]
}
```

### 4.3 Расовая карта — Эльф

```json
{
  "id": "race_elf",
  "name": "Эльф",
  "deck": "DOOR",
  "type": "RACE",
  "description": "Каждый раз, когда ты помогаешь победить монстра, получаешь уровень.",
  "playableFrom": ["YOUR_TURN_PRECOMBAT", "ANYTIME"],
  "effects": [],
  "triggers": [
    {
      "event": "ON_HELPER_VICTORY",
      "effects": [{ "type": "MODIFY_LEVEL", "value": 1, "target": "SELF" }]
    }
  ]
}
```

### 4.4 Классовая карта — Воин

```json
{
  "id": "class_warrior",
  "name": "Воин",
  "deck": "DOOR",
  "type": "CLASS",
  "description": "Воин может использовать любое оружие независимо от ограничений.",
  "effects": [
    { "type": "APPLY_STATUS", "status": "IGNORE_WEAPON_RESTRICTIONS", "target": "SELF" }
  ]
}
```

### 4.5 Монстры

```json
{ "id": "monster_big_rat", "name": "Крыса Большая", "deck": "DOOR", "type": "MONSTER",
  "baseLevel": 1, "treasures": 1,
  "badStuff": { "effects": [{ "type": "MODIFY_LEVEL", "value": -1, "target": "ACTIVE_PLAYER" }] },
  "tags": [], "effects": [] }
```

```json
{ "id": "monster_plutonium_dragon", "name": "Плутониевый Дракон", "deck": "DOOR", "type": "MONSTER",
  "baseLevel": 20, "treasures": 5,
  "badStuff": { "description": "Умри",
    "effects": [
      { "type": "REMOVE_EQUIPMENT", "slot": "ALL",  "target": "ACTIVE_PLAYER" },
      { "type": "DISCARD_HAND",     "count": "ALL", "target": "ACTIVE_PLAYER" },
      { "type": "SET_LEVEL",        "value": 1,     "target": "ACTIVE_PLAYER" }
    ]},
  "tags": ["DRAGON"], "effects": [] }
```

### 4.6 Усилитель монстра — Разъярённый

```json
{
  "id": "modifier_enraged",
  "name": "Разъярённый",
  "deck": "DOOR",
  "type": "MODIFIER",
  "description": "+5 к уровню монстра",
  "playableFrom": ["ANY_COMBAT"],
  "effects": [{ "type": "MONSTER_BONUS", "value": 5 }]
}
```

### 4.7 Доппельгангер

```json
{
  "id": "special_doppelganger",
  "name": "Доппельгангер",
  "deck": "DOOR",
  "type": "SPECIAL",
  "description": "Клонирует монстра. При нескольких монстрах — игрок выбирает цель.",
  "playableFrom": ["ANY_COMBAT"],
  "effects": [{ "type": "CLONE_MONSTER", "instanceId": "CHOSEN" }]
}
```

### 4.8 Бродячий Монстр

```json
{
  "id": "special_wandering_monster",
  "name": "Бродячий Монстр",
  "deck": "DOOR",
  "type": "SPECIAL",
  "description": "Добавляет монстра из руки в текущий бой.",
  "playableFrom": ["ANY_COMBAT", "REACTION"],
  "effects": [{ "type": "ADD_MONSTER", "source": "HAND" }]
}
```

---

## 5. База данных карт

Все карты базового набора хранятся в `packages/data/src/`.

| Файл | Содержание | Минимум карт |
|---|---|---|
| `monsters.json` | Монстры с `baseLevel`, `treasures`, `badStuff`, `tags` | 20 |
| `equipment.json` | Снаряжение со `slots`, `value`, `effects`, `isBig` | 40 |
| `races.json` | Эльф, Дварф, Хоббит, Человек | 4 |
| `classes.json` | Воин, Волшебник, Клирик, Вор | 4 |
| `oneshots.json` | Зелья и заклинания | 15 |
| `modifiers.json` | Усилители монстров | 8 |
| `curses.json` | Немедленные и длительные проклятия | 10 |
| `special.json` | Доппельгангер, Бродячий Монстр и другие | 5 |

---

## 6. WS-протокол

### 6.1 Сообщения клиент → сервер (C2S)

```typescript
type C2S_Message =
  | { type: 'GAME_ACTION'; payload: GameAction }
  | { type: 'PING' }
  | { type: 'RECONNECT'; token: string };

type GameAction =
  | { type: 'KICK_DOOR' }
  | { type: 'PLAY_CARD';     cardId: string; targetId?: string }
  | { type: 'EQUIP_ITEM';    cardId: string }
  | { type: 'OFFER_HELP';    targetPlayerId: string; rewardCardIds: string[] }
  | { type: 'ACCEPT_HELP' }
  | { type: 'DECLINE_HELP' }
  | { type: 'COUNTER_OFFER'; rewardCardIds: string[] }
  | { type: 'RUN_AWAY';      diceRoll: number }  // 1-6, валидируется сервером
  | { type: 'END_TURN' }
  | { type: 'REACT_PASS' }
  | { type: 'SELL_ITEMS';    cardIds: string[] }
  | { type: 'CHOOSE_OPTION'; optionId: string };
```

### 6.2 Сообщения сервер → клиент (S2C)

```typescript
type S2C_Message =
  | { type: 'FULL_SYNC';             payload: { gameState: GameStateProjection; cardDb: CardDb } }
  | { type: 'STATE_PATCH';           payload: { patch: JsonPatch[]; events: GameEvent[] } }
  | { type: 'ACTION_REQUIRED';       payload: PendingAction }
  | { type: 'REACTION_WINDOW_OPEN';  payload: ReactionWindow }
  | { type: 'REACTION_WINDOW_CLOSE' }
  | { type: 'GAME_EVENT';            payload: GameEvent }
  | { type: 'PLAYER_JOINED';         payload: { playerId: string; name: string } }
  | { type: 'PLAYER_LEFT';           payload: { playerId: string } }
  | { type: 'PLAYER_RECONNECTED';    payload: { playerId: string } }
  | { type: 'ERROR';                 payload: { code: string; message: string } }
  | { type: 'GAME_OVER';             payload: { winnerId: string } }
  | { type: 'PONG' };
```

### 6.3 Проекция стейта

Каждый клиент получает **персональный** `STATE_PATCH`. Чужие руки и колоды скрыты:

```
hand чужого игрока: ['HIDDEN', 'HIDDEN', 'HIDDEN']
doorDeck / treasureDeck: массив 'HIDDEN' нужной длины
```

### 6.4 PendingAction

```typescript
interface PendingAction {
  type: 'CHOOSE_MONSTER_TO_CLONE' | 'CHOOSE_PLAYER' | 'CHOOSE_ITEM_FROM_PLAYER';
  playerId: string;
  timeoutMs: number;
  options: Array<{ id: string; label: string; cardId?: string }>;
}
```

---

## 7. Серверная архитектура

### 7.1 HTTP API (Лобби)

```
POST /lobby/rooms            → создать комнату (roomId)
GET  /lobby/rooms            → список открытых комнат
POST /lobby/rooms/:id/join   → присоединиться (JWT)
```

JWT содержит `{ playerId, roomId, playerName }`. Максимум 6 игроков. Нельзя присоединиться к начатой игре (`phase !== WAITING`).

### 7.2 WebSocket сервер

- Endpoint `/game/:roomId` с JWT в query params или заголовке
- `WsClient`: инкапсулирует соединение — `send()`, `isAlive`, `playerId`
- `MessageRouter`: парсит входящие сообщения → `GameRoom.handleAction`
- PING/PONG heartbeat каждые 30 секунд
- Невалидный JSON → `ERROR` клиенту, соединение не разрывается

### 7.3 GameRoom

```
handleAction(playerId, action):
  1. Загрузить стейт из Redis
  2. applyAction(state, action)
  3. compareAndSet(oldVersion, newState)  — атомарный Lua-скрипт
  4. Разослать STATE_PATCH с персональной проекцией каждому клиенту
```

Race condition предотвращён через `compareAndSet`. При конфликте второе действие получает `ERROR`, стейт не меняется.

### 7.4 Redis (RedisGameStore)

- `getState` / `setState` / `compareAndSet`
- TTL игровых сессий — **24 часа**
- `compareAndSet` через Lua-скрипт для атомарности

### 7.5 PostgreSQL (PgUserStore)

Prisma schema: `User`, `GameSession`.  
Методы: `createUser` / `findUserById` / `findUserByEmail`.

### 7.6 Реконнект

- При переподключении с валидным JWT → `FULL_SYNC`
- `isConnected: false` при разрыве; `true` при подключении
- Если отключённый игрок должен ответить на `ACTION_REQUIRED` → дефолт по таймауту
- `PLAYER_LEFT` / `PLAYER_RECONNECTED` рассылаются остальным

### 7.7 Валидация безопасности

- `playerId` — из JWT, **не из payload**
- Нельзя сыграть карту, которой нет в руке или снаряжении
- Нельзя действовать не в свою фазу (кроме REACT-действий)
- `diceRoll` валидируется: диапазон 1–6
- Все ошибки → `ERROR` с кодом, не крэш сервера

---

## 8. Клиентская архитектура и GSAP-анимации

### 8.1 Zustand-стор

```typescript
interface GameStore {
  state: GameStateProjection | null;
  cardDb: CardDb;
  applyFullSync(msg: S2C_FullSync): void;
  applyStatePatch(patch: JsonPatch[], events: GameEvent[]): void;
}
```

### 8.2 AnimationQueue

**Ключевой принцип**: `STATE_PATCH` применяется к стору **только после завершения** текущей GSAP-анимации.

```typescript
// packages/client/src/animation/queue.ts

export class AnimationQueue {
  private queue: GameEvent[] = [];
  private playing = false;

  enqueue(event: GameEvent): void { ... }
  onComplete(callback: () => void): void { ... }
  private processNext(): void { ... }
}
```

```typescript
// Обработчик STATE_PATCH
export function handleStatePatch(msg, gameStore, animationQueue): void {
  for (const event of msg.payload.events) {
    animationQueue.enqueue(event);
  }
  animationQueue.onComplete(() => {
    gameStore.applyStatePatch(msg.payload.patch, msg.payload.events);
  });
}
```

### 8.3 WsClient

`connect()`, `send()`, автопереподключение с **экспоненциальным backoff**.

### 8.4 Компоненты игрового стола

| Компонент | Назначение |
|---|---|
| `PlayerArea` | Уровень, имя, раса, класс, пол, количество карт |
| `CardHand` | Своя рука — реальные карты; чужие — рубашки со счётчиком |
| `DeckArea` | Две колоды с количеством карт |
| `GameLog` | Последние 20 событий из `state.log` |
| `CombatZone` | Монстры, боевые значения, кнопки действий |
| `ReactionBar` | Окно реакции, прогресс-бар таймаута, кнопка Пас |
| `NegotiationModal` | Торг за помощь |
| `ChooseTargetOverlay` | Выбор из `PendingAction.options[]` |
| `DiceRollOverlay` | 3D-кубик с анимацией броска |

### 8.5 GSAP-анимации — полный список

> **Правило**: все анимации — только через GSAP, никакого CSS `transition`. Только `transform` и `opacity` — никаких `width`, `height`, `top`, `left`.

**Карты и рука**:
- Появление карт в руке: `gsap.from(cards, { y: 60, opacity: 0, stagger: 0.08 })`
- Hover: `gsap.to(card, { y: -20, scale: 1.1 })` (не CSS)
- Разыгрывание: полёт к центру → в сброс
- Запрещённая карта: shake + красный flash
- Смыкание руки: `gsap.to` перерасчёт позиций с stagger

**Взятие карты из колоды**:
- Полёт от колоды к руке через `getBoundingClientRect()`
- Переворот: `rotateY 0→90` (скрыть) → смена контента → `rotateY 90→0` (открыть лицо)
- Несколько карт: stagger 0.15s

**Открытие двери**:
- Дверь: `gsap.to(door, { rotateY: -110 })`
- Монстр: `gsap.from(monster, { scale: 0.3, opacity: 0, rotation: -10, ease: 'elastic.out(1, 0.5)' })`
- Предмет: `gsap.from(card, { y: -100, rotation: 15, ease: 'bounce.out' })`
- Проклятие: красная вспышка overlay `opacity: 0 → 0.4 → 0`

**Бой**:
- CombatZone: `gsap.from(zone, { scale: 0.8, opacity: 0, ease: 'back.out' })`
- Монстр входит: `gsap.from(monster, { x: -300, rotation: -15, ease: 'power3.out' })`
- Боевые числа: CountTo анимация
- Кнопки ActionPanel: `gsap.from(buttons, { y: 20, opacity: 0, stagger: 0.1 })`

**Исходы боя**:
- Победа: 80+ конфетти с random x/y/rotation/color; монстр улетает в сброс
- Поражение: overlay `opacity: 0 → 0.7`; shake карточки игрока
- Побег: карточка `gsap.to(card, { x: -600 })` → возвращается с другой стороны
- Bad Stuff (потеря предмета): `gsap.to(item, { y: -100, opacity: 0 })`

**Доппельгангер**:
- Тень отделяется: `gsap.from(clone, { x: 0, opacity: 0 })`
- Материализация: `blur: 20px → 0`, `opacity: 0 → 1`, `scale: 0.8 → 1`
- SVG-дуга между оригиналом и клоном через `gsap.to(strokeDashoffset)`
- Ожидание выбора: оба пульсируют `{ scale: 1.05, repeat: -1, yoyo: true }`

**Кубик**:
- `gsap.to(dice, { rotationX: '+=720', rotationY: '+=540', ease: 'power4.out', duration: 1.5 })`
- Успех (≥5): зелёный glow; провал (<5): красный glow + экран вздрагивает

**UI / лобби**:
- Уровень меняется: `gsap.fromTo` с scale и color flash
- GameLog новая запись: `gsap.from(entry, { y: -20, opacity: 0 })`
- ReactionBar: `gsap.from(bar, { y: 100, opacity: 0, ease: 'power2.out' })`
- Прогресс таймаута: `gsap.to(bar, { width: '0%', ease: 'none' })`
- Активный игрок: ambient glow `{ repeat: -1, yoyo: true }`
- Фоновые частицы (20–30 шт): случайные траектории `repeat: -1`
- Заголовок лобби: побуквенный stagger 0.05s
- Кнопки лобби: `gsap.from(buttons, { y: 60, opacity: 0, stagger: 0.1 })`

**Экран победы/поражения**:
- Победа: 100+ конфетти; имя победителя — stagger по буквам; трофей с `ease: 'bounce.out'`
- Кнопка «Ещё раз» появляется через 2s задержки

---

## 9. Стратегия тестирования

### 9.1 Тесты игрового движка

`game-engine` — чистые функции, тестируются изолированно. Цель — 100% покрытие механик.

```typescript
describe('CombatSystem', () => {
  it('player wins when strength exceeds monster', () => {
    const state = buildTestState({ players: [{ id: 'p1', level: 5, equipped: [SWORD_3] }],
      combat: { monsters: [BIG_RAT_LV1] } });  // 8 vs 1
    expect(calculateCombatResult(state)).toBe('WIN');
  });

  it('draw is a loss', () => {
    const state = buildTestState({ players: [{ id: 'p1', level: 5, equipped: [SWORD_3] }],
      combat: { monsters: [{ baseLevel: 8 }] } });  // 8 vs 8
    expect(calculateCombatResult(state)).toBe('LOSE');
  });

  it('Doppelganger auto-clones when one monster', () => {
    const { state: next } = applyAction(
      buildTestState({ combat: { monsters: [ORC_LV4] } }),
      { type: 'PLAY_CARD', playerId: 'p2', cardId: 'special_doppelganger' }
    );
    expect(next.combat!.monsters).toHaveLength(2);
    expect(next.combat!.monsters[1].cardId).toBe('monster_orc');
    expect(next.combat!.monsters[1].modifiers).toEqual(next.combat!.monsters[0].modifiers);
  });

  it('Doppelganger creates pending action when multiple monsters', () => {
    const { state: next } = applyAction(
      buildTestState({ combat: { monsters: [ORC_LV4, RAT_LV1] } }),
      { type: 'PLAY_CARD', playerId: 'p2', cardId: 'special_doppelganger' }
    );
    expect(next.combat!.monsters).toHaveLength(2);
    expect(next.pendingActions[0].type).toBe('CHOOSE_MONSTER_TO_CLONE');
    expect(next.pendingActions[0].options).toHaveLength(2);
  });

  it('applies Dragon Bad Stuff on failed escape', () => {
    const { state: next } = applyAction(
      buildTestState({ combat: { monsters: [DRAGON_LV20] }, players: [{ id: 'p1', level: 5 }] }),
      { type: 'RUN_AWAY', playerId: 'p1', diceRoll: 2 }
    );
    expect(next.players['p1'].level).toBe(1);
    expect(Object.values(next.players['p1'].equipped).every(v => v === null)).toBe(true);
  });

  it('Elf gains level when helping win', () => {
    const { state: next } = applyCombatWin(buildTestState({
      players: [{ id: 'p1', level: 3, race: null }, { id: 'p2', level: 2, race: 'ELF' }],
      combat: { activePlayerId: 'p1', helpers: [{ playerId: 'p2' }], monsters: [RAT_LV1] }
    }));
    expect(next.players['p2'].level).toBe(3);
  });
});
```

### 9.2 Покрытие карт

Каждая карта — минимум один тест основного эффекта. Условные эффекты — тесты обеих ветвей. SPECIAL-карты — интеграционный тест с полным игровым сценарием.

### 9.3 Интеграционные тесты WS

```typescript
it('full combat round with doppelganger', async () => {
  const { clients } = await setupTestGame(3);
  const [c1, c2, c3] = clients;

  await c1.send({ type: 'GAME_ACTION', payload: { type: 'KICK_DOOR' } });
  await Promise.all(clients.map(c =>
    c.send({ type: 'GAME_ACTION', payload: { type: 'REACT_PASS' } })
  ));
  await c2.send({ type: 'GAME_ACTION',
    payload: { type: 'PLAY_CARD', cardId: 'special_doppelganger' } });

  const state = c1.getLatestState();
  expect(state.combat!.monsters).toHaveLength(2);
});
```

Все тесты изолированы (отдельная Redis namespace или in-memory mock). Запуск 3× подряд — нет флакающих тестов.

---

## 10. Дорожная карта

| Этап | Задачи | Результат |
|---|---|---|
| 1. Инфраструктура | Turborepo, пакеты, Redis, PostgreSQL, WS сервер | Монорепо с запущенными сервисами |
| 2. Типы и движок | Shared-типы, game-engine, машина состояний | `applyAction` с тестами |
| 3. Карты | JSON для всего базового набора, тесты | Полная база карт |
| 4. Сложные механики | Бой, побег, торг, реакции, Доппельгангер | Все механики с тестами |
| 5. Интеграция | GameRoom, проекции, лобби, реконнект, security | Работающая сетевая игра |
| 6. Базовый UI | React, Zustand, компоненты стола | Можно сыграть партию |
| 7. Дизайн-система | CSS-переменные, GoldButton, CardFrame, LevelBadge | Фэнтези-тема |
| 8. GSAP-анимации | Все 9 анимационных задач (TASK-035–042) | Полноценный визуальный опыт |
| 9. Production | Docker, CI/CD | Деплой |

### 10.1 Порядок реализации механик

1. Базовый бой (1 монстр, без помощников)
2. Предметы и экипировка со слотами
3. Расы и классы с пассивными способностями
4. Проклятия (немедленные и длительные)
5. Помощники в бою и торг
6. Окно реакций (стек)
7. Усилители монстров
8. Доппельгангер и CLONE_MONSTER
9. Бродячий Монстр и ADD_MONSTER из руки
10. Двойные классы

### 10.2 Оценка трудоёмкости (агентная разработка через Claude Code)

| Группа задач | Задач | Примерно токенов |
|---|---|---|
| Инфраструктура | 5 | ~175k |
| Типы/shared | 3 | ~55k |
| Game-engine | 5 | ~290k |
| Данные карт | 3 | ~90k |
| Сложные механики | 7 | ~330k |
| Интеграция + security | 4 | ~175k |
| UI базовый | 4 | ~140k |
| Дизайн-система + GSAP | 9 | ~850k |
| **Итого** | **42** | **~2.7 млн** |

~42 пятичасовых интервала ≈ **3–4 недели** при режиме 8–10 часов в день.

---

## 11. Ключевые решения и риски

| Решение | Обоснование | Риск |
|---|---|---|
| Декларативные карты в JSON | Добавление карт без изменения кода | Сложные карты могут не выразиться декларативно → нужен escape hatch |
| AnimationQueue перед STATE_PATCH | Анимации и данные не рассинхронизируются | Накопление очереди при плохой сети → нужен flush по таймауту |
| Окно реакций с таймаутом | Игра не блокируется при бездействии | Слишком короткий таймаут раздражает; длинный затягивает |
| Server-authoritative | Нет читерства, единая точка правды | Задержка на каждое действие — решается оптимистичным UI |
| Redis для стейта | Скорость, поддержка TTL | При падении Redis теряем стейты → нужен fallback на PostgreSQL |
| JSON Patch для дельт | Экономия трафика | Патчи могут быть большими → мониторить размер |
| GSAP вместо CSS transitions | Полный контроль, поддержка AnimationQueue | Разработчики должны знать GSAP API |
| diceRoll от клиента | Упрощение архитектуры | Приемлемо для этого проекта |

---

## 12. Локальная разработка и секреты

### 12.1 Что установить

**Обязательно**:
- Node.js ≥ 20 LTS
- pnpm ≥ 8 — `npm install -g pnpm`
- Docker Desktop (или Orbstack на Mac)
- Git

**Опционально**:
- Redis Insight — GUI для просмотра стейтов игры в Redis
- TablePlus / DBeaver — GUI для PostgreSQL

### 12.2 Переменные окружения (.env)

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# JWT
JWT_SECRET=...    # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN=7d

# PostgreSQL
DATABASE_URL=postgresql://munchkin:munchkin@localhost:5432/munchkin_dev
POSTGRES_USER=munchkin
POSTGRES_PASSWORD=munchkin
POSTGRES_DB=munchkin_dev

# Redis
REDIS_URL=redis://localhost:6379

# Сервер
PORT=3001
NODE_ENV=development

# Клиент (Vite читает только VITE_ префикс)
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
```

Добавить `.env` в `.gitignore`. Закоммитить `.env.example` с теми же ключами, но пустыми значениями.

### 12.3 docker-compose.dev.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: munchkin
      POSTGRES_PASSWORD: munchkin
      POSTGRES_DB: munchkin_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Запустить один раз вручную: `docker compose -f docker-compose.dev.yml up -d`.

### 12.4 Чеклист перед началом разработки

```
□ Node.js >= 20 установлен
□ pnpm установлен
□ Docker Desktop запущен
□ docker compose -f docker-compose.dev.yml up -d выполнен
□ .env заполнен (минимум ANTHROPIC_API_KEY и JWT_SECRET)
□ .env.example закоммичен в репо
□ tasks.json в корне репо
□ progress.md создан (пустой файл)
□ git init && git commit -m "init" выполнен
```

---

*Спецификация актуальна для tasks.json v2 — 42 задачи, включая TASK-034–042 (GSAP-анимации).*
