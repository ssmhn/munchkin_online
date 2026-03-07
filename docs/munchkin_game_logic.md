# Munchkin Online — Логика игры для реализации

> Этот документ описывает **полную игровую логику** для реализации в `packages/game-engine`.  
> Каждый раздел — это отдельный модуль. Реализуй строго в порядке зависимостей.

---

## 0. Архитектура движка

Весь движок — это **чистые функции без I/O**. Никаких обращений к Redis, БД или сети.

```
packages/game-engine/src/
├── engine.ts          — точка входа: applyAction()
├── validate.ts        — validateAction() — выбрасывает InvalidActionError
├── reducer.ts         — reduce() — применяет действие к стейту
├── transitions.ts     — runAutoTransitions() — автоматические сдвиги фаз
├── combat/
│   ├── calculator.ts  — calculatePlayerPower, calculateMonsterPower, calculateCombatResult
│   ├── victory.ts     — handleCombatVictory
│   ├── defeat.ts      — handleCombatDefeat, handleRunAway
│   └── reaction.ts    — openReactionWindow, resolveReactionWindow
├── mechanics/
│   ├── equipment.ts   — equipItem, unequipItem, validateEquip
│   ├── curses.ts      — applyCurse, removeCurse, resolveCurseEffect
│   ├── trading.ts     — offerHelp, acceptHelp, declineHelp, counterOffer
│   ├── selling.ts     — sellItems, calculateSellValue
│   ├── charity.ts     — checkCharity, giveCard
│   └── triggers.ts    — fireTrigger, resolveTriggers
├── effects/
│   └── resolver.ts    — resolveEffect(state, effect, context) — главный диспетчер
└── utils/
    ├── deck.ts        — shuffleDeck, drawCard, discardCard
    ├── ids.ts         — generateInstanceId()
    └── errors.ts      — InvalidActionError, GameRuleError
```

**Главный контракт:**

```typescript
export function applyAction(
  state: GameState,
  action: GameAction
): { state: GameState; events: GameEvent[] } {
  validateAction(state, action);
  const [next, events] = reduce(state, action);
  const [final, autoEvents] = runAutoTransitions(next);
  return { state: final, events: [...events, ...autoEvents] };
}
```

---

## 1. Инициализация игры

### 1.1 createGame(playerIds, config)

```
Вход: playerIds: string[], config: GameConfig
Выход: GameState
```

**Шаги:**

1. Собрать колоду дверей из `data/monsters + data/races + data/classes + data/curses + data/modifiers + data/special` — все карты с `deck: "DOOR"`
2. Собрать колоду сокровищ из `data/equipment + data/oneshots` — все карты с `deck: "TREASURE"`
3. Перемешать обе колоды (`shuffleDeck`)
4. Создать `PlayerState` для каждого игрока:
   - `level: 1`
   - `gender: случайный ('MALE' | 'FEMALE')` — или дать выбрать игроку
   - `race: null` (Человек по умолчанию — нет карты)
   - `classes: []`
   - `hand: []`, `equipped: пустые слоты`, `carried: []`, `curses: []`
   - `isConnected: true`
5. Раздать каждому игроку по 4 карты двери и 4 карты сокровищ
6. Определить `playerOrder` — случайный порядок или по часовой стрелке
7. `activePlayerId = playerOrder[0]`
8. `phase: 'KICK_DOOR'`
9. `turn: 1`

---

## 2. Фазы хода — детальная логика

### 2.1 KICK_DOOR

**Что происходит:** активный игрок открывает верхнюю карту колоды дверей.

**Алгоритм:**

```
1. drawCard(state, 'DOOR') → card
2. Открыть ReactionWindow (trigger: DOOR_OPENED, cardId: card.id)
   → ждать ответа всех игроков (или таймаут)
3. После закрытия ReactionWindow:
   switch(card.type):
     'MONSTER'  → перейти в фазу COMBAT, создать CombatState
     'CURSE'    → применить эффекты проклятия к activePlayer, перейти в LOOT_ROOM
     'RACE'     → положить карту в руку activePlayer, перейти в LOOT_ROOM
     'CLASS'    → положить карту в руку activePlayer, перейти в LOOT_ROOM
     'MODIFIER' → положить карту в руку activePlayer, перейти в LOOT_ROOM
     'SPECIAL'  → положить карту в руку activePlayer, перейти в LOOT_ROOM
     иное       → положить карту в руку activePlayer, перейти в LOOT_ROOM
```

**Важно:** после KICK_DOOR карта всегда либо применяется (монстр, проклятие) либо идёт в руку. Карты не возвращаются в колоду.

---

### 2.2 LOOT_ROOM

**Что происходит:** игрок берёт карту из любой доступной колоды, ИЛИ ищет неприятности.

**Разветвление:**

```
A) Взять карту (LOOT):
   - drawCard(state, 'DOOR') → в руку
   - Или drawCard(state, 'TREASURE') → в руку
   - Переход в END_TURN

B) Искать неприятности (LOOK_FOR_TROUBLE):
   - Игрок сыгрывает монстра из руки (PLAY_CARD с type=MONSTER)
   - Открыть ReactionWindow (trigger: LOOK_FOR_TROUBLE)
   - Перейти в COMBAT
   - Если игрок не хочет — переход в END_TURN
```

---

### 2.3 COMBAT

**Инициализация CombatState при входе:**

```typescript
combat = {
  phase: 'REACTION_WINDOW',
  monsters: [{ cardId: card.id, modifiers: [], instanceId: generateId() }],
  activePlayerId: state.activePlayerId,
  helpers: [],
  appliedCards: [],
  reactionWindow: { trigger: { type: 'COMBAT_STARTED' }, ... },
  runAttempts: 0,
  resolved: false
}
```

**Фазы внутри COMBAT:**

```
REACTION_WINDOW
  → все игроки могут сыграть карты-реакции или пасануть
  → после закрытия → NEGOTIATION

NEGOTIATION
  → активный игрок может предложить помощь другим
  → другие игроки могут принять/отклонить/встречное предложение
  → завершается когда активный игрок отправляет END_NEGOTIATION
  → или нет предложений → пропустить
  → → ACTIVE

ACTIVE
  → проверить calculateCombatResult()
  → если WIN → обработать победу (handleCombatVictory)
  → если LOSE → игрок может:
      - сыграть карты для повышения силы (PLAY_CARD)
      - запросить помощь (OFFER_HELP)
      - попытаться сбежать (RUN_AWAY)
  → ждать действия активного игрока

RUN_ATTEMPT
  → игрок отправил RUN_AWAY с diceRoll
  → handleRunAway(state, diceRoll)

RESOLVING
  → технический переход: раздать сокровища, повысить уровни, срабатывают триггеры
```

---

### 2.4 AFTER_COMBAT

Вызывается только после победы. Раздать сокровища:

```
1. count = сумма treasures всех монстров + EXTRA_TREASURE эффекты
2. Активный игрок берёт (count - agreedRewards) карт из колоды сокровищ
3. Помощники получают свои agreedReward карты (из только что взятых)
4. Каждый помощник: сработать ON_HELPER_VICTORY триггеры
5. Переход в END_TURN
```

---

### 2.5 END_TURN

```
1. Проверить: у activePlayer > 5 карт в руке?
   ДА → перейти в CHARITY
   НЕТ → перейти к следующему игроку

2. Следующий игрок:
   nextIndex = (currentIndex + 1) % playerOrder.length
   activePlayerId = playerOrder[nextIndex]
   turn++
   phase = 'KICK_DOOR'
```

---

### 2.6 CHARITY

```
Вход: activePlayer.hand.length > 5
Требуется сбросить (hand.length - 5) карт.

Варианты:
A) GIVE_CARD: передать карту другому игроку (любому)
B) DISCARD_CARD: сбросить карту в discard соответствующей колоды

После каждого действия проверить: hand.length <= 5?
  ДА → разблокировать END_TURN
  НЕТ → продолжать CHARITY
```

---

## 3. Расчёт боя

### 3.1 calculatePlayerPower(state, playerId, appliedCards)

```
total = player.level

ШАГ 1: экипированные предметы
for each slot in [head, body, feet, leftHand, rightHand, twoHands, ...extras]:
  if equipped[slot]:
    card = cardDb[equipped[slot]]
    total += resolveEffects(card.effects, context)

ШАГ 2: карты в carried (большие предметы вне слота)
for each cardId in player.carried:
  card = cardDb[cardId]
  total += resolveEffects(card.effects, context)

ШАГ 3: сыгранные в бой карты направленные на этого игрока
for each applied in appliedCards where targetPlayerId === playerId:
  card = cardDb[applied.cardId]
  total += resolveEffects(card.effects, context)

ШАГ 4: активные проклятия
for each curse in player.curses:
  total += resolveEffects(curse.effects, context)

ШАГ 5: расы и классы (passive bonuses)
  → сработать через статусы (APPLY_STATUS уже учтён выше)

return Math.max(0, total)
```

**Контекст (context) для CONDITIONAL эффектов:**

```typescript
context = {
  player,           // для PLAYER_CLASS, PLAYER_RACE, PLAYER_GENDER, PLAYER_LEVEL
  monsters: combat.monsters, // для MONSTER_TAG, IN_COMBAT
  gameState: state  // для HAS_STATUS, GAME_MODE
}
```

---

### 3.2 calculateMonsterPower(state, appliedCards)

```
total = 0

for each monster in combat.monsters:
  def = cardDb[monster.cardId]
  monsterBase = def.baseLevel

  // Модификаторы прикреплённые к конкретному экземпляру
  for each modifier in monster.modifiers:
    modCard = cardDb[modifier.cardId]
    monsterBase += resolveModifierBonus(modCard)

  // Карты, сыгранные против конкретного экземпляра
  for each applied in appliedCards where targetMonsterId === monster.instanceId:
    monsterBase += resolveEffects(cardDb[applied.cardId].effects, {})

  total += monsterBase

return total
```

---

### 3.3 calculateCombatResult(state)

```
playerTotal = calculatePlayerPower(state, combat.activePlayerId, combat.appliedCards)

for each helper in combat.helpers:
  playerTotal += calculatePlayerPower(state, helper.playerId, combat.appliedCards)

monsterTotal = calculateMonsterPower(state, combat.appliedCards)

// СТРОГОЕ превосходство: ничья = поражение
return playerTotal > monsterTotal ? 'WIN' : 'LOSE'
```

---

## 4. Победа в бою

### 4.1 handleCombatVictory(state)

```
1. Повысить уровень активного игрока:
   levelsGained = combat.monsters.length  // +1 за каждого монстра
   player.level += levelsGained

2. Проверить победу в игре:
   if player.level >= config.winLevel:
     state.winner = player.id
     state.phase = 'END_GAME'
     → СТОП, дальше не выполнять

3. Сработать ON_KILL_MONSTER триггеры для activePlayer:
   fireTrigger(state, 'ON_KILL_MONSTER', activePlayer)

4. Сработать ON_HELPER_VICTORY для каждого помощника:
   for each helper in combat.helpers:
     fireTrigger(state, 'ON_HELPER_VICTORY', helper.player)
     // Эльф: +1 уровень здесь

5. Подсчитать сокровища:
   baseTreasures = sum(monster.treasures for monster in combat.monsters)
   extraTreasures = countEffects('EXTRA_TREASURE', combat.appliedCards)
   totalTreasures = baseTreasures + extraTreasures

6. Распределить сокровища:
   rewardedCards = []
   for each helper in combat.helpers:
     for each cardId in helper.agreedReward:
       rewardedCards.push(cardId)
   
   activePlayerTreasures = totalTreasures - rewardedCards.length
   // Раздать карты будет в AFTER_COMBAT (физически drawCard)

7. Переход: phase = 'AFTER_COMBAT'
8. Очистить CombatState (но сохранить для AFTER_COMBAT)
```

---

## 5. Поражение и побег

### 5.1 handleRunAway(state, action)

```
Вход: action = { type: 'RUN_AWAY', playerId, diceRoll: 1-6 }

Валидация:
  - diceRoll строго в [1, 6] — иначе InvalidActionError
  - Игрок находится в бою — иначе InvalidActionError
  - Нет эффекта PREVENT_ESCAPE на игроке — иначе InvalidActionError

escapeBonus = 0
  + статус HALFLING_ESCAPE_BONUS → +1 (Хоббит, если сбросил карту)
  + ESCAPE_BONUS эффекты из appliedCards → суммировать
  + ESCAPE_BONUS из снаряжения (Сапоги быстрого бегства) → суммировать

success = (diceRoll + escapeBonus) >= 5

Если success:
  → убрать игрока из боя (убрать из activePlayerId или helpers)
  → монстры остаются (бой для других продолжается)
  → если активный игрок убежал → передать бой... или завершить?
    ⚠️ Правило: если активный игрок убежал — применить Bad Stuff всех монстров
    Причина: побег не гарантирует избежание Bad Stuff — только УСПЕШНЫЙ побег
    Уточнение: при УСПЕШНОМ побеге Bad Stuff НЕ применяется
  → events: [DICE_ROLLED, PLAYER_ESCAPED]

Если fail:
  → applyAllBadStuff(state, combat.monsters, playerId)
  → clearCombat(state)
  → phase = 'END_TURN'
  → events: [DICE_ROLLED, BAD_STUFF_APPLIED × N, COMBAT_ENDED]

runAttempts++
```

### 5.2 applyAllBadStuff(state, monsters, playerId)

```
for each monster in monsters:
  def = cardDb[monster.cardId]
  for each effect in def.badStuff.effects:
    resolveEffect(state, effect, { target: playerId })
```

---

## 6. Механика Доппельгангера

### 6.1 Обработка CLONE_MONSTER эффекта

```
Вход: effect = { type: 'CLONE_MONSTER', instanceId: 'CHOSEN' | 'CURRENT' }
      context: { combat, playerId }

Если instanceId === 'CURRENT' (Это двое!):
  → клонировать ТЕКУЩЕГО монстра (последний добавленный или единственный)
  → addClone(state, targetMonster)

Если instanceId === 'CHOSEN':
  СЛУЧАЙ A: один монстр в бою:
    → клонировать автоматически, без PendingAction
    → addClone(state, combat.monsters[0])

  СЛУЧАЙ B: несколько монстров:
    → создать PendingAction:
      {
        type: 'CHOOSE_MONSTER_TO_CLONE',
        playerId: тот кто играет карту,
        prompt: 'Выберите монстра для клонирования',
        options: combat.monsters.map(m => ({
          id: m.instanceId,
          label: cardDb[m.cardId].name
        })),
        timeoutMs: 30000,
        onTimeout: () => выбрать первого монстра автоматически
      }
    → ждать CHOOSE_OPTION

После CHOOSE_OPTION:
  → addClone(state, combat.monsters.find(m => m.instanceId === optionId))
```

### 6.2 addClone(state, original)

```
clone = {
  cardId: original.cardId,
  modifiers: original.modifiers.map(m => ({ ...m })), // DEEP COPY
  instanceId: generateId()   // НОВЫЙ уникальный ID
}

state.combat.monsters.push(clone)

// calculateMonsterPower автоматически учтёт клона
```

---

## 7. Система реакций (Reaction Window)

### 7.1 openReactionWindow(state, trigger, participants?)

```
Вход: trigger: ReactionTrigger
      participants?: string[]  // если null — все игроки

window = {
  trigger,
  timeoutMs: config.reactionTimeoutMs || 5000,
  responses: {},
  stack: []
}

// Инициализировать responses для всех участников
for each playerId in (participants ?? state.playerOrder):
  window.responses[playerId] = { type: 'PENDING' }

state.combat.reactionWindow = window

// S2C: отправить REACTION_WINDOW_OPEN всем участникам
events.push({ type: 'REACTION_WINDOW_OPEN', trigger, timeoutMs })
```

### 7.2 handleReactPass(state, playerId)

```
window.responses[playerId] = { type: 'PASS' }
checkReactionWindowComplete(state)
```

### 7.3 handleReactCard(state, playerId, cardId)

```
Валидация:
  - карта в руке игрока
  - карта имеет playableFrom: ['REACTION']
  - окно реакции открыто

window.stack.push({ playerId, cardId, timestamp: now() })
window.responses[playerId] = { type: 'PLAYED', cardId }

// Карта временно откладывается, эффекты применятся при разрешении стека
checkReactionWindowComplete(state)
```

### 7.4 checkReactionWindowComplete(state)

```
allResponded = Object.values(window.responses).every(r => r.type !== 'PENDING')

if allResponded:
  resolveReactionWindow(state)
```

### 7.5 resolveReactionWindow(state)

```
// Стек разрешается В ОБРАТНОМ ПОРЯДКЕ добавления (последний играет первым)
for each item in [...window.stack].reverse():
  card = cardDb[item.cardId]
  resolveEffects(card.effects, { playerId: item.playerId, ... })

// Закрыть окно
state.combat.reactionWindow = null
events.push({ type: 'REACTION_WINDOW_CLOSE' })

// Продолжить игру в зависимости от trigger
continueAfterReaction(state, trigger)
```

### 7.6 Таймаут

Таймаут управляется на уровне **сервера** (GameRoom), не движка:

```typescript
// GameRoom.ts
const timer = setTimeout(() => {
  for (const [playerId, response] of Object.entries(window.responses)) {
    if (response.type === 'PENDING') {
      this.handleAction(playerId, { type: 'REACT_PASS' });
    }
  }
}, window.timeoutMs);
```

---

## 8. Механика торга (Help Negotiation)

### 8.1 Полный флоу

```
Активный игрок (A) хочет помощи от игрока (B):

1. A отправляет OFFER_HELP { targetPlayerId: B, rewardCardIds: [card1, card2] }
   Валидация: карты существуют в руке/снаряжении A

2. Создать PendingAction для B:
   { type: 'RESPOND_TO_HELP_OFFER', from: A, rewardCardIds, timeoutMs: 30000 }

3. B отвечает:

   A) ACCEPT_HELP { fromPlayerId: A }
      → добавить в combat.helpers: { playerId: B, agreedReward: rewardCardIds }
      → B теперь участвует в бою, его сила добавляется к playerTotal
      → закрыть PendingAction

   B) DECLINE_HELP { fromPlayerId: A }
      → закрыть PendingAction, ничего не меняется

   C) COUNTER_OFFER { fromPlayerId: A, rewardCardIds: [card3] }
      → создать PendingAction для A с встречным предложением
      → A может ACCEPT / DECLINE / COUNTER_OFFER снова
      → нет ограничений на число раундов торга (ограничено таймаутом)

4. После победы в бою:
   for each helper in combat.helpers:
     for each cardId in helper.agreedReward:
       moveCard(cardId, from: A.hand/equipped, to: B.hand)
```

### 8.2 Правила торга

- Нельзя предложить карту, которой нет у A в `hand` или `equipped`
- Одновременно активно только одно предложение на каждую пару A↔B
- Помощников может быть несколько (от разных игроков)
- Если B помог и A выиграл — B получает свои сокровища ДО того как A берёт оставшиеся

---

## 9. Система экипировки

### 9.1 equipItem(state, playerId, cardId)

```
Валидации:
  1. Карта в руке игрока
  2. Карта имеет слоты (type === 'EQUIPMENT' && slots.length > 0)
  3. Не в бою (или карта playableFrom включает YOUR_TURN_COMBAT)

Проверка слотов:
  card = cardDb[cardId]
  
  if slots includes 'twoHands':
    ЕСЛИ статус IGNORE_WEAPON_RESTRICTIONS (Воин):
      можно экипировать даже если leftHand или rightHand заняты
    ИНАЧЕ:
      if equipped.leftHand || equipped.rightHand:
        throw InvalidActionError('Освободи руки для двуручного оружия')
    equipped.twoHands = cardId

  elif slots includes 'rightHand':
    if equipped.rightHand:
      throw InvalidActionError('Правая рука уже занята')
    if equipped.twoHands:
      throw InvalidActionError('Занято двуручным оружием')
    equipped.rightHand = cardId

  elif slots includes 'leftHand':
    аналогично rightHand

  elif slots includes 'head':
    if equipped.head:
      throw InvalidActionError('Голова уже занята')
    // Проверить curse: NO_HEADGEAR
    if player.curses.some(c => c.restrictions?.includes('NO_HEADGEAR')):
      throw InvalidActionError('Проклятие не даёт носить головные уборы')
    equipped.head = cardId

  // аналогично для body, feet

  Проверка Большого предмета:
  if card.isBig:
    currentBigItems = countBigItems(player)
    maxBig = player.statuses.includes('CARRY_EXTRA_BIG_ITEM') ? 2 : 1
    if currentBigItems >= maxBig:
      throw InvalidActionError('Уже несёшь максимум Больших предметов')

Переместить карту:
  remove cardId from player.hand
  add to player.equipped[slot]

Сработать ON_EQUIP триггер если есть:
  fireTrigger(state, 'ON_EQUIP', player, { cardId })
```

### 9.2 unequipItem(state, playerId, cardId)

```
Найти слот где находится карта:
  slot = findEquippedSlot(player.equipped, cardId)
  
Освободить слот:
  player.equipped[slot] = null (или убрать из extras)
  
Переместить в руку (или в сброс при REMOVE_EQUIPMENT эффекте):
  player.hand.push(cardId)  // по умолчанию — в руку
  // при REMOVE_EQUIPMENT эффекте → в соответствующий discard

Сработать ON_UNEQUIP триггер
```

---

## 10. Проклятия

### 10.1 Типы проклятий

**Немедленные:** применяют эффект и уходят в сброс.

**Длительные:** создают `ActiveCurse` в `player.curses`, эффект применяется при каждом `calculatePlayerPower`.

### 10.2 applyCurse(state, playerId, curseCard)

```
for each effect in curseCard.effects:
  resolveEffect(state, effect, { target: playerId })

// Если эффект APPLY_CURSE — создать ActiveCurse
if effect.type === 'APPLY_CURSE':
  activeCurse = {
    id: effect.curseId,
    sourceCardId: curseCard.id,
    effects: curseCard.persistent.effects,
    removable: true,
    removedBy: curseCard.persistent.removedBy
  }
  player.curses.push(activeCurse)

// Сама карта проклятия → в discard дверей
discardCard(state, curseCard.id, 'DOOR')
```

### 10.3 removeCurse(state, playerId, curseId?)

```
if curseId:
  // Снять конкретное проклятие
  player.curses = player.curses.filter(c => c.id !== curseId)
else:
  // Снять любое одно проклятие (на выбор игрока или первое)
  player.curses = player.curses.slice(1)
```

### 10.4 Волшебник и проклятия

```
Когда Волшебник получает проклятие:
  Игрок может НЕМЕДЛЕННО сбросить N карт из руки чтобы отменить N проклятий.
  
  Реализация:
  → открыть PendingAction: WIZARD_CANCEL_CURSE
  → игрок выбирает карты для сброса (или пропускает)
  → для каждой сброшенной карты: НЕ применять одно проклятие

  Это активируется через WIZARD_CURSE_CANCEL статус при получении проклятия.
```

---

## 11. Продажа предметов

### 11.1 sellItems(state, playerId, cardIds)

```
Валидации:
  1. Все cardIds в player.hand или player.carried (не экипированные)
  2. phase !== 'COMBAT' — нельзя продавать в бою
  3. Все cardIds имеют type === 'EQUIPMENT' или 'ONE_SHOT'

Подсчёт:
  totalGold = sum(cardDb[id].value for id in cardIds)
  levelsGained = Math.floor(totalGold / 1000)

Проверка ограничения уровня 10:
  newLevel = player.level + levelsGained
  if newLevel >= config.winLevel:
    throw InvalidActionError(
      'Нельзя достичь последнего уровня через продажу — только через убийство монстра'
    )
  // Если levelsGained частично допустим (напр. level 8, +3 = 11 → нельзя):
  // Разрешить только если player.level + levelsGained < config.winLevel

Применить:
  player.level += levelsGained
  for each cardId in cardIds:
    remove from player.hand or player.carried
    discard to appropriate deck (DOOR / TREASURE)

events.push({ type: 'ITEMS_SOLD', playerId, cardIds, goldTotal: totalGold, levelsGained })
```

---

## 12. Пассивные способности рас и классов

### 12.1 Таблица способностей

| Раса/Класс | Способность | Триггер |
|---|---|---|
| Эльф | +1 уровень за помощь в победе | `ON_HELPER_VICTORY` |
| Дварф | Нести 2 Больших предмета | Статус `CARRY_EXTRA_BIG_ITEM` (постоянный) |
| Хоббит | +1 к броску побега (сброс карты) | Действие при RUN_AWAY |
| Человек | Продавать предметы в любой момент | Постоянный (нет ограничений на продажу) |
| Воин | Игнорировать ограничения оружия | Статус `IGNORE_WEAPON_RESTRICTIONS` |
| Волшебник | Отменить проклятие сбросом карты | При получении проклятия |
| Клирик | Воскреснуть (вернуть 1 предмет из сброса) | Один раз после смерти |
| Вор | Украсть предмет во время чужого боя | Действие `STEAL_ITEM` |

### 12.2 Хоббит — сброс карты для побега

```
При RUN_AWAY:
  if player.race === 'HALFLING' && player.hand.length > 0:
    Игрок МОЖЕТ (не обязан) сбросить карту из руки
    → PendingAction: HALFLING_ESCAPE_BONUS_CHOICE
    → Если сбросил: escapeBonus += 1
    → Если пропустил: без бонуса
```

### 12.3 Вор — кража

```
Доступно: во время ЧУЖОГО боя (не своего), фаза ACTIVE

Действие STEAL_ITEM { targetPlayerId, cardId }:
  Валидация:
    - playerId !== combat.activePlayerId
    - cardId в equipped целевого игрока
    - phase === 'COMBAT' && combat.activePlayerId !== playerId
  
  Бросок кубика (клиент присылает diceRoll):
    - diceRoll >= 4: успех → переместить cardId в руку Вора
    - diceRoll < 4: провал → бонус +2 к монстру в текущем бою (штраф)
  
  events.push({ type: 'STEAL_ATTEMPTED', success, cardId })
```

### 12.4 Клирик — воскрешение

```
Клирик один раз за игру после смерти (SET_LEVEL=1 + потеря снаряжения):
  Действие: CLERIC_RESURRECTION
  Эффект: вернуть любую 1 карту из discard в руку
  После использования: статус CLERIC_RESURRECTION_AVAILABLE снимается
```

---

## 13. Диспетчер эффектов

### 13.1 resolveEffect(state, effect, context)

Центральная функция. Каждый `effect.type` — отдельный case:

```typescript
function resolveEffect(
  state: GameState,
  effect: CardEffect,
  context: EffectContext
): [GameState, GameEvent[]] {
  
  const target = resolveTarget(state, effect.target, context);
  
  switch (effect.type) {
    
    case 'COMBAT_BONUS':
      // Не мутирует стейт — учитывается в calculatePlayerPower динамически
      return [state, []];
    
    case 'MODIFY_LEVEL': {
      const player = state.players[target];
      const newLevel = Math.max(1, player.level + effect.value);
      return [
        setPlayer(state, target, { level: newLevel }),
        [{ type: 'LEVEL_CHANGED', playerId: target, from: player.level, to: newLevel }]
      ];
    }
    
    case 'SET_LEVEL': {
      return [
        setPlayer(state, target, { level: effect.value }),
        [{ type: 'LEVEL_CHANGED', playerId: target, from: state.players[target].level, to: effect.value }]
      ];
    }
    
    case 'REMOVE_EQUIPMENT': {
      if (effect.slot === 'ALL') {
        // Снять всё снаряжение
        const player = state.players[target];
        let s = state;
        for (const [slot, cardId] of Object.entries(player.equipped)) {
          if (cardId) s = discardEquipped(s, target, slot, cardId);
        }
        return [s, [{ type: 'EQUIPMENT_REMOVED', playerId: target, slot: 'ALL' }]];
      }
      if (effect.slot === 'BEST') {
        // Снять предмет с наибольшей стоимостью
        const best = findBestEquipped(state.players[target], state.cardDb);
        if (!best) return [state, []];
        return [discardEquipped(state, target, best.slot, best.cardId), [
          { type: 'EQUIPMENT_REMOVED', playerId: target, slot: best.slot }
        ]];
      }
      // Конкретный слот
      const cardId = state.players[target].equipped[effect.slot];
      if (!cardId) return [state, []];
      return [discardEquipped(state, target, effect.slot, cardId), [
        { type: 'EQUIPMENT_REMOVED', playerId: target, slot: effect.slot }
      ]];
    }
    
    case 'DISCARD_HAND': {
      const player = state.players[target];
      const count = effect.count === 'ALL' ? player.hand.length : effect.count;
      // Игрок ВЫБИРАЕТ какие карты сбросить → PendingAction
      if (count > 0) {
        const pending: PendingAction = {
          type: 'CHOOSE_CARDS_TO_DISCARD',
          playerId: target,
          count,
          availableCards: player.hand
        };
        return [addPendingAction(state, pending), [
          { type: 'PENDING_ACTION_CREATED', actionType: 'CHOOSE_CARDS_TO_DISCARD' }
        ]];
      }
      return [state, []];
    }
    
    case 'REMOVE_CLASS':
      return [setPlayer(state, target, { classes: [] }), [
        { type: 'CLASS_REMOVED', playerId: target }
      ]];
    
    case 'REMOVE_RACE':
      return [setPlayer(state, target, { race: null }), [
        { type: 'RACE_REMOVED', playerId: target }
      ]];
    
    case 'CHANGE_GENDER': {
      const current = state.players[target].gender;
      const next = current === 'MALE' ? 'FEMALE' : 'MALE';
      return [setPlayer(state, target, { gender: next }), [
        { type: 'GENDER_CHANGED', playerId: target, from: current, to: next }
      ]];
    }
    
    case 'APPLY_CURSE':
      return applyCurseById(state, target, effect.curseId);
    
    case 'REMOVE_CURSE':
      return [removeCurse(state, target, effect.curseId), [
        { type: 'CURSE_REMOVED', playerId: target, curseId: effect.curseId }
      ]];
    
    case 'APPLY_STATUS': {
      const player = state.players[target];
      if (player.statuses.includes(effect.status)) return [state, []];
      return [setPlayer(state, target, { statuses: [...player.statuses, effect.status] }), [
        { type: 'STATUS_APPLIED', playerId: target, status: effect.status }
      ]];
    }
    
    case 'DRAW_CARDS': {
      let s = state;
      const drawnIds: CardId[] = [];
      for (let i = 0; i < effect.count; i++) {
        const [ns, cardId] = drawCard(s, effect.deck);
        s = addToHand(ns, target, cardId);
        drawnIds.push(cardId);
      }
      return [s, [{ type: 'CARDS_DRAWN', playerId: target, count: effect.count, deck: effect.deck }]];
    }
    
    case 'AUTO_ESCAPE':
      return [setEscaped(state, target), [
        { type: 'PLAYER_ESCAPED', playerId: target, automatic: true }
      ]];
    
    case 'ESCAPE_BONUS':
      // Только для расчёта в handleRunAway — не мутирует стейт
      return [state, []];
    
    case 'EXTRA_TREASURE':
      // Учитывается в handleCombatVictory — не мутирует стейт сразу
      return [state, []];
    
    case 'MONSTER_BONUS':
    case 'MONSTER_PENALTY':
      // Учитывается в calculateMonsterPower — не мутирует стейт
      return [state, []];
    
    case 'ADD_MONSTER':
      return handleAddMonster(state, effect, context);
    
    case 'CLONE_MONSTER':
      return handleCloneMonster(state, effect, context);
    
    case 'STEAL_ITEM':
      return handleStealItem(state, effect, context);
    
    case 'CONDITIONAL': {
      const conditionMet = evaluateCondition(effect.condition, context);
      const effects = conditionMet ? effect.then : (effect.else ?? []);
      let s = state;
      const events: GameEvent[] = [];
      for (const e of effects) {
        const [ns, evs] = resolveEffect(s, e, context);
        s = ns;
        events.push(...evs);
      }
      return [s, events];
    }
    
    default:
      throw new GameRuleError(`Неизвестный тип эффекта: ${(effect as any).type}`);
  }
}
```

---

## 14. Вычисление условий (CardCondition)

```typescript
function evaluateCondition(condition: CardCondition, ctx: EffectContext): boolean {
  switch (condition.type) {
    case 'PLAYER_CLASS':
      return ctx.player.classes.includes(condition.class);
    
    case 'PLAYER_RACE':
      return ctx.player.race === condition.race;
    
    case 'PLAYER_GENDER':
      return ctx.player.gender === condition.gender;
    
    case 'PLAYER_LEVEL':
      switch (condition.op) {
        case 'gte': return ctx.player.level >= condition.value;
        case 'lte': return ctx.player.level <= condition.value;
        case 'eq':  return ctx.player.level === condition.value;
      }
    
    case 'MONSTER_TAG':
      return ctx.combat?.monsters.some(m =>
        (ctx.cardDb[m.cardId] as MonsterDefinition).tags.includes(condition.tag)
      ) ?? false;
    
    case 'IN_COMBAT':
      return ctx.combat !== null;
    
    case 'HAS_STATUS':
      return ctx.player.statuses?.includes(condition.status) ?? false;
    
    case 'GAME_MODE':
      return condition.mode === 'EPIC'
        ? ctx.gameConfig.epicMode
        : !ctx.gameConfig.epicMode;
    
    case 'AND':
      return condition.conditions.every(c => evaluateCondition(c, ctx));
    
    case 'OR':
      return condition.conditions.some(c => evaluateCondition(c, ctx));
    
    case 'NOT':
      return !evaluateCondition(condition.condition, ctx);
    
    default:
      throw new GameRuleError(`Неизвестный тип условия: ${(condition as any).type}`);
  }
}
```

---

## 15. Колода — вспомогательные функции

### 15.1 drawCard(state, deck)

```typescript
function drawCard(state: GameState, deck: 'DOOR' | 'TREASURE'): [GameState, CardId] {
  const deckKey = deck === 'DOOR' ? 'doorDeck' : 'treasureDeck';
  const discardKey = deck === 'DOOR' ? 'discardDoor' : 'discardTreasure';
  
  if (state[deckKey].length === 0) {
    // Перетасовать сброс обратно в колоду
    const reshuffled = shuffle([...state[discardKey]]);
    state = { ...state, [deckKey]: reshuffled, [discardKey]: [] };
  }
  
  if (state[deckKey].length === 0) {
    throw new GameRuleError(`Колода ${deck} пуста и сброс тоже пуст`);
  }
  
  const [cardId, ...rest] = state[deckKey];
  return [{ ...state, [deckKey]: rest }, cardId];
}
```

### 15.2 discardCard(state, cardId, deck)

```typescript
function discardCard(state: GameState, cardId: CardId, deck: 'DOOR' | 'TREASURE'): GameState {
  const discardKey = deck === 'DOOR' ? 'discardDoor' : 'discardTreasure';
  return { ...state, [discardKey]: [cardId, ...state[discardKey]] };
}
```

---

## 16. Валидация действий

### 16.1 validateAction(state, action)

```typescript
function validateAction(state: GameState, action: GameAction): void {
  // 1. playerId всегда из JWT — убедиться что игрок существует
  if (!state.players[action.playerId]) {
    throw new InvalidActionError('Игрок не найден');
  }
  
  // 2. Проверить фазу
  const allowed = allowedActionsPerPhase[state.phase];
  if (!allowed.includes(action.type) && !isReactionAction(action.type)) {
    throw new InvalidActionError(
      `Действие ${action.type} недопустимо в фазе ${state.phase}`
    );
  }
  
  // 3. Проверить что это ход активного игрока (кроме REACT-действий)
  if (!isReactionAction(action.type) && action.playerId !== state.activePlayerId) {
    throw new InvalidActionError('Сейчас не твой ход');
  }
  
  // 4. Специфичные валидации по типу действия
  switch (action.type) {
    case 'PLAY_CARD':
      validatePlayCard(state, action);
      break;
    case 'EQUIP_ITEM':
      validateEquip(state, action);
      break;
    case 'RUN_AWAY':
      if (action.diceRoll < 1 || action.diceRoll > 6) {
        throw new InvalidActionError('diceRoll должен быть от 1 до 6');
      }
      break;
    case 'SELL_ITEMS':
      validateSellItems(state, action);
      break;
  }
}
```

### 16.2 allowedActionsPerPhase

```typescript
const allowedActionsPerPhase: Record<GamePhase, GameActionType[]> = {
  WAITING:      ['START_GAME'],
  KICK_DOOR:    ['KICK_DOOR', 'PLAY_CARD'],
  LOOT_ROOM:    ['LOOT', 'LOOK_FOR_TROUBLE', 'PLAY_CARD', 'EQUIP_ITEM', 'SELL_ITEMS'],
  COMBAT:       ['PLAY_CARD', 'OFFER_HELP', 'RUN_AWAY', 'END_NEGOTIATION'],
  AFTER_COMBAT: ['PLAY_CARD', 'EQUIP_ITEM'],
  END_TURN:     ['END_TURN', 'PLAY_CARD', 'EQUIP_ITEM', 'SELL_ITEMS'],
  CHARITY:      ['GIVE_CARD', 'DISCARD_CARD'],
  END_GAME:     [],
};

// Всегда разрешены (для любых участников в любой фазе):
const alwaysAllowed: GameActionType[] = [
  'REACT_PASS', 'REACT_CARD',
  'ACCEPT_HELP', 'DECLINE_HELP', 'COUNTER_OFFER',
  'CHOOSE_OPTION',
];
```

---

## 17. События (GameEvent) для клиента

Полный список событий, которые сервер рассылает в `STATE_PATCH.events[]`. Клиент использует их для запуска GSAP-анимаций через `AnimationQueue`.

```typescript
type GameEvent =
  // Карты
  | { type: 'DOOR_OPENED';         cardId: CardId }
  | { type: 'CARD_DRAWN';          playerId: string; deck: 'DOOR' | 'TREASURE'; count: number }
  | { type: 'CARD_PLAYED';         playerId: string; cardId: CardId }
  | { type: 'CARD_DISCARDED';      cardId: CardId; deck: 'DOOR' | 'TREASURE' }
  | { type: 'CARD_GIVEN';          fromPlayerId: string; toPlayerId: string; cardId: CardId }

  // Уровни
  | { type: 'LEVEL_CHANGED';       playerId: string; from: number; to: number }

  // Бой
  | { type: 'COMBAT_STARTED';      monsterId: CardId; instanceId: string }
  | { type: 'MONSTER_ADDED';       cardId: CardId; instanceId: string }
  | { type: 'MONSTER_CLONED';      originalInstanceId: string; cloneInstanceId: string }
  | { type: 'COMBAT_RESULT';       result: 'WIN' | 'LOSE' }
  | { type: 'COMBAT_ENDED' }
  | { type: 'DICE_ROLLED';         result: number }
  | { type: 'PLAYER_ESCAPED';      playerId: string; automatic?: boolean }
  | { type: 'BAD_STUFF_APPLIED';   playerId: string; monsterId: CardId }

  // Снаряжение
  | { type: 'ITEM_EQUIPPED';       playerId: string; cardId: CardId; slot: string }
  | { type: 'ITEM_UNEQUIPPED';     playerId: string; cardId: CardId; slot: string }
  | { type: 'EQUIPMENT_REMOVED';   playerId: string; slot: string }

  // Расы/Классы/Пол
  | { type: 'RACE_CHANGED';        playerId: string; from: Race | null; to: Race | null }
  | { type: 'CLASS_CHANGED';       playerId: string; classes: PlayerClass[] }
  | { type: 'GENDER_CHANGED';      playerId: string; from: Gender; to: Gender }

  // Проклятия
  | { type: 'CURSE_APPLIED';       playerId: string; curseCardId: CardId }
  | { type: 'CURSE_REMOVED';       playerId: string; curseId: string }

  // Торг
  | { type: 'HELP_OFFERED';        fromPlayerId: string; toPlayerId: string }
  | { type: 'HELP_ACCEPTED';       helperId: string }
  | { type: 'HELP_DECLINED';       helperId: string }

  // Реакции
  | { type: 'REACTION_WINDOW_OPEN';  trigger: ReactionTrigger; timeoutMs: number }
  | { type: 'REACTION_WINDOW_CLOSE' }

  // Игра
  | { type: 'ITEMS_SOLD';          playerId: string; goldTotal: number; levelsGained: number }
  | { type: 'GAME_OVER';           winnerId: string };
```

---

## 18. Порядок реализации

Реализуй модули строго в этом порядке — каждый следующий зависит от предыдущего:

```
1. utils/errors.ts           — InvalidActionError, GameRuleError
2. utils/ids.ts              — generateInstanceId
3. utils/deck.ts             — drawCard, discardCard, shuffleDeck
4. effects/resolver.ts       — скелет с заглушками для каждого типа
5. validate.ts               — validateAction (базовая фаза + JWT)
6. combat/calculator.ts      — calculatePlayerPower, calculateMonsterPower, calculateCombatResult
7. mechanics/equipment.ts    — equipItem, validateEquip
8. mechanics/curses.ts       — applyCurse, removeCurse
9. combat/reaction.ts        — openReactionWindow, resolveReactionWindow
10. combat/victory.ts        — handleCombatVictory
11. combat/defeat.ts         — handleRunAway, applyAllBadStuff
12. mechanics/trading.ts     — offerHelp, acceptHelp, declineHelp
13. mechanics/selling.ts     — sellItems
14. mechanics/charity.ts     — checkCharity, giveCard
15. mechanics/triggers.ts    — fireTrigger
16. reducer.ts               — reduce() — собрать все механики вместе
17. transitions.ts           — runAutoTransitions
18. engine.ts                — applyAction — финальная сборка
```

Для каждого модуля: сначала напиши типы, потом реализацию, потом unit-тесты в `__tests__/`. Переходи к следующему модулю только после зелёных тестов.

---

## 19. Граничные случаи (edge cases)

Обязательно обработать и покрыть тестами:

```
УРОВНИ:
  - Уровень не может упасть ниже 1 (Math.max(1, ...))
  - Уровень нельзя поднять до config.winLevel через продажу
  - При победе в бою: проверить winLevel ПОСЛЕ повышения
  - Несколько триггеров ON_LEVEL_UP: применять последовательно

БОЙ:
  - Ничья (равные силы) = поражение, не победа
  - Несколько монстров: Bad Stuff применяется от КАЖДОГО
  - Клон наследует ВСЕ модификаторы оригинала
  - После клонирования calculateMonsterPower учитывает оба экземпляра
  - Помощник может тоже попробовать сбежать (независимо от активного игрока)
  - При побеге: escapeBonus суммируется из ВСЕХ источников

ЭКИПИРОВКА:
  - Дварф: countBigItems учитывает и equipped, и carried
  - Воин: IGNORE_WEAPON_RESTRICTIONS снимает ограничения по полу тоже
  - Двуручное оружие: при экипировке очистить leftHand И rightHand
  - Нельзя экипировать в чужой ход (кроме реакции)

ПРОКЛЯТИЯ:
  - Длительное проклятие не уходит в сброс (в отличие от немедленного)
  - CHANGE_GENDER с уже изменённым полом: вернуть обратно
  - Если нет предмета в слоте — REMOVE_EQUIPMENT ничего не делает (не ошибка)

БЛАГОТВОРИТЕЛЬНОСТЬ:
  - CHARITY обязателен при > 5 карт (не optional)
  - Карты можно давать ЛЮБОМУ игроку, не только соседнему
  - После GIVE_CARD проверить снова: может нужно ещё раз

КОЛОДА:
  - При пустой колоде: перетасовать сброс
  - При пустой колоде И пустом сбросе: игра продолжается без взятия карты

РЕАКЦИЯ:
  - Таймаут = автоматический REACT_PASS для всех PENDING
  - Игрок сыграл карту-реакцию: она уходит из руки немедленно
  - Отключённый игрок: REACT_PASS автоматически

ТОРГ:
  - Нельзя предложить карту которую уже предложил другому игроку
  - agreedReward проверяется при победе: карты всё ещё у A?
  - Если карты больше нет (украли, прокляли) — помощник получает что осталось
```

---

## 20. Конфигурация тестового окружения

```typescript
// packages/game-engine/src/__tests__/helpers.ts

export function buildTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    phase: 'KICK_DOOR',
    turn: 1,
    activePlayerId: 'p1',
    playerOrder: ['p1', 'p2'],
    players: {
      p1: buildTestPlayer('p1'),
      p2: buildTestPlayer('p2'),
    },
    doorDeck: ['monster_big_rat', 'curse_lose_level', 'race_elf'],
    treasureDeck: ['eq_sword_of_slaying', 'eq_horned_helmet'],
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [],
    winner: null,
    config: { winLevel: 10, epicMode: false, allowedSets: ['BASE'], maxPlayers: 6 },
    cardDb: loadTestCardDb(),  // загрузить из packages/data
    extraActions: [],
    ...overrides
  };
}

export function buildTestPlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: `Player ${id}`,
    level: 1,
    gender: 'MALE',
    race: null,
    classes: [],
    hand: [],
    equipped: { head: null, body: null, feet: null, leftHand: null, rightHand: null, twoHands: null, extras: [] },
    carried: [],
    curses: [],
    statuses: [],
    isConnected: true,
    ...overrides
  };
}
```

---

## 21. Карты раскрываются перед применением (Reveal → Apply)

### 21.1 Концепция

Когда игрок берёт карту из колоды дверей (KICK_DOOR) или сокровищ (LOOT_ROOM), карта **сначала показывается** всем игрокам на столе — и только по явному клику/действию владельца применяется к стейту. Это даёт:
- Время для окна реакций (другие могут сыграть карты)
- Возможность видеть что открылось до того как эффект сработал
- Хук для GSAP-анимации: карта "висит" на столе в раскрытом виде

### 21.2 Новое поле в GameState

```typescript
// packages/shared/src/types/state.ts

interface GameState {
  // ... существующие поля ...

  revealedCards: RevealedCard[];
  // Карты раскрытые на столе, ещё не применённые.
  // Обычно 0 или 1, но теоретически несколько (при быстрых действиях).
}

interface RevealedCard {
  cardId: CardId;
  ownerId: string;         // кто открыл карту
  source: 'KICK_DOOR' | 'LOOT_DOOR' | 'LOOT_TREASURE' | 'AFTER_COMBAT_TREASURE';
  revealedAt: number;      // timestamp, для таймаута
}
```

### 21.3 Обновлённый флоу KICK_DOOR (движок)

```
Действие KICK_DOOR от activePlayer:
  1. cardId = drawCard(state, 'DOOR')
  2. state.revealedCards.push({ cardId, ownerId: activePlayerId, source: 'KICK_DOOR' })
  3. event: CARD_REVEALED { cardId, ownerId, source: 'KICK_DOOR' }
  4. openReactionWindow(trigger: { type: 'DOOR_REVEALED', cardId })

Действие APPLY_REVEALED_CARD { cardId } от activePlayer:
  Валидация:
    - revealedCard с этим cardId существует
    - ownerId === activePlayerId
    - ReactionWindow закрыто (или не было)
  
  card = cardDb[cardId]
  switch(card.type):
    'MONSTER'  → createCombatState(cardId) → phase = 'COMBAT'
    'CURSE'    → applyCurse(activePlayer, card) → phase = 'LOOT_ROOM'
    иное       → player.hand.push(cardId) → phase = 'LOOT_ROOM'
  
  state.revealedCards = state.revealedCards.filter(r => r.cardId !== cardId)
  event: CARD_APPLIED { cardId, ownerId }
```

### 21.4 Обновлённый флоу LOOT_ROOM (движок)

```
Действие LOOT { deck: 'DOOR' | 'TREASURE' } от activePlayer:
  1. cardId = drawCard(state, deck)
  2. state.revealedCards.push({ cardId, ownerId: activePlayerId,
       source: deck === 'DOOR' ? 'LOOT_DOOR' : 'LOOT_TREASURE' })
  3. event: CARD_REVEALED { cardId, ownerId, source }
  // Никакого ReactionWindow — в LOOT_ROOM реакций нет
  // Карта ждёт APPLY_REVEALED_CARD

Действие APPLY_REVEALED_CARD { cardId }:
  // Карты из LOOT_ROOM всегда идут в руку — тип не важен
  player.hand.push(cardId)
  state.revealedCards = state.revealedCards.filter(r => r.cardId !== cardId)
  phase = 'END_TURN'
  event: CARD_APPLIED { cardId }
```

### 21.5 Таймаут на применение

Если игрок не применяет карту слишком долго — сервер применяет автоматически (дефолтное поведение). Управляется в GameRoom, не в движке:

```typescript
// GameRoom.ts
const APPLY_TIMEOUT_MS = 60_000; // 1 минута

// При получении CARD_REVEALED:
revealTimer = setTimeout(() => {
  this.handleAction(ownerId, { type: 'APPLY_REVEALED_CARD', cardId });
}, APPLY_TIMEOUT_MS);

// При получении APPLY_REVEALED_CARD: clearTimeout(revealTimer)
```

---

## 22. Рюкзак (Backpack)

### 22.1 Концепция

Рюкзак — это **инвентарь вне игры**: карты убранные туда не участвуют в расчёте боя, не могут быть украдены Вором, не теряются от большинства Bad Stuff и проклятий. Это осознанный выбор игрока — спрятать карту в безопасное место ценой того, что она временно не работает.

**Игровое ограничение:** рюкзак вмещает не более **N карт** (рекомендуется `config.backpackSize = 5`). Предметы из рюкзака нельзя продавать, нельзя экипировать напрямую — сначала надо достать в руку.

> ⚠️ **Рюкзак — хоумрул**, не часть оригинальных правил Манчкина. Включается через `config.enableBackpack: boolean`. При `false` — все действия с рюкзаком возвращают `InvalidActionError`.

### 22.2 Обновление типов

```typescript
// packages/shared/src/types/state.ts

interface GameConfig {
  // ... существующие поля ...
  enableBackpack: boolean;   // default: false
  backpackSize: number;      // default: 5
}

interface PlayerState {
  // ... существующие поля ...
  backpack: CardId[];        // карты убранные в рюкзак
}
```

### 22.3 Действие PUT_IN_BACKPACK (движок)

```
Действие PUT_IN_BACKPACK { cardId } от playerId:

Валидация:
  1. config.enableBackpack === true — иначе InvalidActionError
  2. Карта в player.hand (не экипированная, не в carried)
     — экипированный предмет нельзя убрать в рюкзак напрямую: сначала снять
  3. player.backpack.length < config.backpackSize — иначе:
     throw InvalidActionError('Рюкзак полон')
  4. Нельзя убрать в рюкзак карту монстра/модификатора — только EQUIPMENT, ONE_SHOT, RACE, CLASS, SPECIAL
  5. Можно в любую фазу КРОМЕ COMBAT (в бою убирать нельзя)

Применить:
  player.hand = player.hand.filter(id => id !== cardId)
  player.backpack.push(cardId)
  event: CARD_PUT_IN_BACKPACK { playerId, cardId }
```

### 22.4 Действие TAKE_FROM_BACKPACK (движок)

```
Действие TAKE_FROM_BACKPACK { cardId } от playerId:

Валидация:
  1. config.enableBackpack === true
  2. Карта в player.backpack
  3. Можно в любую фазу КРОМЕ COMBAT
     — в бою доставать из рюкзака нельзя (предотвращает злоупотребления)

Применить:
  player.backpack = player.backpack.filter(id => id !== cardId)
  player.hand.push(cardId)
  event: CARD_TAKEN_FROM_BACKPACK { playerId, cardId }

  // Проверить CHARITY: если рука теперь > 5 карт
  // → не триггерится автоматически, только в конце хода
```

### 22.5 Что защищает рюкзак, что нет

```
ЗАЩИЩАЕТ (карты в рюкзаке не затрагиваются):
  ✓ REMOVE_EQUIPMENT (снимает только экипированное)
  ✓ DISCARD_HAND (сбрасывает только руку)
  ✓ Bad Stuff "потеряй лучший предмет" (ищет в equipped)
  ✓ Кража Вора (крадёт только из equipped)
  ✓ Curse "Lose Best Item" (ищет в equipped + hand)  ← зависит от реализации
  ✓ FORCE_SELL (продаёт только из hand + carried)

НЕ ЗАЩИЩАЕТ:
  ✗ SET_LEVEL (уровень меняется независимо)
  ✗ CHANGE_GENDER, REMOVE_CLASS, REMOVE_RACE
  ✗ Смерть от Bad Stuff (SET_LEVEL=1) — уровень всё равно сбрасывается
  ✗ Проклятия на самого игрока (не на предметы)
```

### 22.6 Рюкзак и CHARITY

```
В конце хода проверяется только hand.length > 5.
Карты в рюкзаке НЕ считаются в hand — они не подпадают под CHARITY.

Исключение: если игрок достал карту из рюкзака в END_TURN
и рука стала > 5 → CHARITY сработает при следующей проверке.
```

---

## 23. UI логика — Reveal и Backpack

### 23.1 Компоненты

```
packages/client/src/components/
├── board/
│   ├── RevealedCardOverlay.tsx   — показывает раскрытую карту в центре стола
│   └── BackpackPanel.tsx         — боковая панель рюкзака
└── design-system/
    └── CardFrame.tsx             — уже существует, используется везде
```

### 23.2 RevealedCardOverlay

**Когда показывается:** при получении события `CARD_REVEALED` в `STATE_PATCH.events`.

**Что отображает:**
- Карта в полный размер по центру экрана
- Имя, тип, описание эффекта
- Кнопка **"Применить"** (только у владельца карты — `ownerId === myPlayerId`)
- Таймер обратного отсчёта (прогресс-бар, 60 секунд)
- У остальных игроков: карта видна, но без кнопки — только наблюдение

**Когда скрывается:** при событии `CARD_APPLIED`.

**GSAP анимации:**
```typescript
// Появление — карта вылетает из колоды и раскрывается на столе
onReveal(cardType: CardType):
  tl = gsap.timeline()
  tl.from('.revealed-card-overlay', { scale: 0.3, opacity: 0, duration: 0.1 })

  if source === 'KICK_DOOR':
    // Дверь открывается
    tl.to('.door', { rotateY: -110, duration: 0.5, ease: 'power2.inOut' })
    // Карта появляется по типу
    if cardType === 'MONSTER':
      tl.from('.revealed-card', { scale: 0.3, rotation: -10, opacity: 0,
        ease: 'elastic.out(1, 0.5)', duration: 0.6 })
    else if cardType === 'EQUIPMENT':
      tl.from('.revealed-card', { y: -100, rotation: 15, ease: 'bounce.out', duration: 0.6 })
    else if cardType === 'CURSE':
      tl.fromTo('.curse-flash', { opacity: 0 }, { opacity: 0.5, yoyo: true,
        repeat: 1, duration: 0.2 })
      tl.from('.revealed-card', { scale: 0.8, opacity: 0, duration: 0.4 })
    else:
      tl.from('.revealed-card', { y: -60, opacity: 0, duration: 0.4, ease: 'power2.out' })

  else:  // LOOT_ROOM — карта просто появляется
    tl.from('.revealed-card', { y: -60, opacity: 0, duration: 0.4, ease: 'power2.out' })

// Кнопка "Применить" появляется с задержкой (дать посмотреть)
tl.from('.apply-btn', { opacity: 0, y: 20, duration: 0.3, delay: 0.5 })

// Исчезновение при применении
onApply():
  gsap.to('.revealed-card-overlay', { scale: 0.8, opacity: 0, duration: 0.3 })
```

**Состояния кнопки "Применить":**
- `enabled` — это твоя карта, ReactionWindow закрыто
- `disabled` (серая) — идёт ReactionWindow, жди пока все ответят
- `hidden` — ты не владелец карты

### 23.3 BackpackPanel

**Где располагается:** фиксированная боковая панель справа, сворачивается в иконку рюкзака.

**Что отображает:**
- Сетка карт в рюкзаке (максимум `config.backpackSize` ячеек)
- Пустые ячейки показаны как плейсхолдеры
- Счётчик: "3 / 5"
- При `config.enableBackpack === false`: панель скрыта полностью

**Взаимодействие:**

```
ПОЛОЖИТЬ В РЮКЗАК:
  Drag карты из CardHand → на BackpackPanel
  ИЛИ правый клик на карту в руке → контекстное меню → "Убрать в рюкзак"
  
  Валидация на клиенте (UX, не безопасность):
    - Рюкзак не полон
    - Не в бою (скрыть опцию если phase === 'COMBAT')
    - Карта не MONSTER / MODIFIER
  
  Отправить: WS action PUT_IN_BACKPACK { cardId }

ДОСТАТЬ ИЗ РЮКЗАКА:
  Клик на карту в BackpackPanel → карта выделяется
  Кнопка "Достать в руку" (или двойной клик)
  
  Валидация на клиенте:
    - Не в бою
  
  Отправить: WS action TAKE_FROM_BACKPACK { cardId }
```

**GSAP анимации рюкзака:**

```typescript
// Карта летит из руки в рюкзак
onPutInBackpack(cardEl: HTMLElement, backpackEl: HTMLElement):
  const cardRect = cardEl.getBoundingClientRect()
  const bagRect  = backpackEl.getBoundingClientRect()
  
  tl = gsap.timeline()
  tl.to(cardEl, {
    x: bagRect.left - cardRect.left,
    y: bagRect.top  - cardRect.top,
    scale: 0.3,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in'
  })
  // Рюкзак "подпрыгивает" при получении карты
  tl.to(backpackEl, { scale: 1.1, duration: 0.1 }, '<0.3')
  tl.to(backpackEl, { scale: 1.0, duration: 0.15, ease: 'back.out' })
  // Новая карта появляется в сетке рюкзака
  tl.from('.backpack-card-new', { scale: 0, opacity: 0,
    duration: 0.25, ease: 'back.out' })

// Карта летит из рюкзака в руку
onTakeFromBackpack(cardEl: HTMLElement, handEl: HTMLElement):
  tl = gsap.timeline()
  tl.from(cardEl, { scale: 1.3, opacity: 0, duration: 0.2, ease: 'power2.out' })
  // Карты в руке раздвигаются чтобы принять новую (stagger пересчёт позиций)
  tl.to('.hand-card', { x: recalcHandPositions(), duration: 0.25,
    stagger: 0.03, ease: 'power1.out' }, '<0.1')

// Рюкзак заполнен — карту нельзя положить
onBackpackFull(cardEl: HTMLElement):
  gsap.to(cardEl, { x: [0, -8, 8, -8, 0], duration: 0.3 })  // shake
  gsap.to('.backpack-panel', { borderColor: '#c0392b', duration: 0.2,
    yoyo: true, repeat: 1 })

// Открытие/закрытие панели рюкзака
onToggleBackpack(open: boolean):
  gsap.to('.backpack-panel', {
    x: open ? 0 : 280,   // выезжает/уезжает
    duration: 0.35,
    ease: open ? 'power2.out' : 'power2.in'
  })
```

### 23.4 Связь с CardHand

В `CardHand` добавить поддержку drag-and-drop на `BackpackPanel`:

```typescript
// CardHand.tsx

const handleDragEnd = (cardId: CardId, dropTarget: DropTarget) => {
  if (dropTarget === 'BACKPACK') {
    if (canPutInBackpack(cardId, gameState)) {
      wsClient.send({ type: 'GAME_ACTION', payload: { type: 'PUT_IN_BACKPACK', cardId } });
    } else {
      animateBackpackFull(cardRef.current!);
    }
  }
  // ... остальные drop targets (стол, экипировка, сброс)
};
```

**Визуальный feedback при перетаскивании:**
- Карта становится полупрозрачной при начале drag: `gsap.to(card, { opacity: 0.6 })`
- BackpackPanel подсвечивается золотым когда карта над ней (если влезает) или красным (если полна)
- При отмене drag — карта возвращается на место: `gsap.to(card, { x: 0, y: 0, opacity: 1, duration: 0.2 })`

### 23.5 Новые GameEvent для клиента

```typescript
// Добавить в список событий (раздел 17):
| { type: 'CARD_REVEALED';           cardId: CardId; ownerId: string; source: RevealedCard['source'] }
| { type: 'CARD_APPLIED';            cardId: CardId; ownerId: string }
| { type: 'CARD_PUT_IN_BACKPACK';    playerId: string; cardId: CardId }
| { type: 'CARD_TAKEN_FROM_BACKPACK'; playerId: string; cardId: CardId }
```

### 23.6 Проекция стейта для других игроков

```typescript
// stateProjector.ts — обновить projectStateForPlayer

// Рюкзак других игроков виден только как количество (не содержимое)
player.backpack = isMyPlayer
  ? player.backpack              // своё — видеть полностью
  : player.backpack.map(() => 'HIDDEN')  // чужое — только count

// RevealedCard — видна всем (по задумке: карта открыта на столе)
// state.revealedCards передаётся без изменений всем игрокам
```

### 23.7 Интеграция в порядок реализации (дополнение к разделу 18)

```
После шага 3 (utils/deck.ts) добавить:
  3a. mechanics/backpack.ts   — putInBackpack, takeFromBackpack, validateBackpack

После шага 16 (reducer.ts) добавить обработчики:
  APPLY_REVEALED_CARD   → applyRevealedCard(state, action)
  PUT_IN_BACKPACK       → putInBackpack(state, action)
  TAKE_FROM_BACKPACK    → takeFromBackpack(state, action)

UI компоненты:
  RevealedCardOverlay — раскрытая карта с кнопкой применить
  BackpackPanel       — панель рюкзака с drag-and-drop
```

---

## 24. UI — Общий лэйаут игрового экрана

### 24.1 Зоны экрана

```
┌─────────────────────────────────────────────────────────────────────┐
│  OPPONENT AREA (другие игроки, горизонтальная полоса сверху)        │
│  [Игрок 2]  Lv:3  ⚔7  ♠4 карты  [Игрок 3]  Lv:5  ⚔9  ♠2 карты   │
├────────────┬────────────────────────────────┬───────────────────────┤
│            │                                │                       │
│  PLAYER    │        GAME TABLE              │   BACKPACK PANEL      │
│  STATS     │   (центр: бой / раскрытые      │   [рюкзак, 5 ячеек]  │
│            │    карты / лог событий)        │                       │
│  Lv: 5     │                                │  ┌──┐ ┌──┐ ┌──┐      │
│  ⚔ 12      │                                │  │  │ │  │ │░░│      │
│            │                                │  └──┘ └──┘ └──┘      │
│  EQUIP     │                                │  ┌──┐ ┌──┐           │
│  ZONE      │                                │  │░░│ │░░│  2/5      │
│  [слоты]   │                                │                       │
│            ├────────────────────────────────┤                       │
│            │      DECK AREA                 │                       │
│            │  [Дверей: 42] [Сокровищ: 28]   │                       │
├────────────┴────────────────────────────────┴───────────────────────┤
│                        MY HAND                                       │
│     [карта] [карта] [карта] [карта] [карта] [карта]                 │
└─────────────────────────────────────────────────────────────────────┘
```

Подробнее по каждой зоне:

---

### 24.2 PlayerStats — зона статов (левая колонка)

**Что отображает:**

```
┌──────────────────┐
│  [аватар/имя]    │
│  👤 Артём        │
│                  │
│  Уровень:   5    │  ← LevelBadge, анимируется через GSAP при изменении
│  Сила:     12    │  ← суммарный боевой бонус (calculatePlayerPower)
│  Пол:      ♂     │
│  Раса:     Эльф  │  ← нет карты = "Человек"
│  Классы:         │
│   [Воин] [Маг]   │  ← карточки классов (иконки)
└──────────────────┘
```

**Поле "Сила" считается клиентом динамически:**
```typescript
// Показывается ТЕКУЩАЯ сила с учётом всего снаряжения, проклятий, статусов
// Обновляется реактивно при каждом STATE_PATCH
const myPower = useMemo(() =>
  calculatePlayerPower(gameState, myPlayerId, gameState.combat?.appliedCards ?? []),
  [gameState]
)
```

В бою рядом показывается сила монстра для сравнения:
```
Сила игрока: 12  vs  Сила монстра: 8  →  ✅ WIN
```

**Активные проклятия** (если есть): список иконок под статами, тап/наведение — тултип с описанием.

---

### 24.3 EquipmentZone — зона экипировки (часть левой колонки)

```
┌──────────────────────────┐
│  ЭКИПИРОВКА              │
│                          │
│       [голова]           │
│  [лев.рука] [тело] [пр.рука] │
│       [ноги]             │
│                          │
│  [Большой предмет 1]     │
│  [Большой предмет 2]  ← только Дварф
└──────────────────────────┘
```

- Каждый слот — дроп-зона (drop target)
- Пустой слот: серая рамка с подписью ("Голова", "Правая рука" и т.д.)
- Занятый слот: карта в уменьшенном виде
- Hover на карту в слоте → тултип с названием и бонусом
- Недоступный слот (занят двуручным) → затемнён с иконкой замка

---

### 24.4 BackpackPanel — зона рюкзака (правая колонка)

```
┌─────────────────┐
│  🎒 РЮКЗАК  2/5 │ ← кнопка свернуть/развернуть
│                 │
│  ┌───┐  ┌───┐  │
│  │   │  │   │  │  ← карты
│  └───┘  └───┘  │
│  ┌───┐  ┌───┐  │
│  │░░░│  │░░░│  │  ← пустые ячейки
│  └───┘  └───┘  │
│  ┌───┐         │
│  │░░░│         │
│  └───┘         │
└─────────────────┘
```

- Карты в рюкзаке видны только владельцу
- Другие игроки видят только счётчик `N/5` на иконке рюкзака у чужого PlayerArea
- Можно свернуть в иконку `🎒 (2)` чтобы освободить место

---

### 24.5 GameTable — центральная зона

Центр экрана меняет содержимое в зависимости от фазы игры:

| Фаза | Что показывается |
|------|-----------------|
| `KICK_DOOR` | Кнопка "Открыть дверь" + анимация двери |
| `KICK_DOOR` (после reveal) | `RevealedCardOverlay` — раскрытая карта |
| `LOOT_ROOM` | Кнопки "Взять из дверей" / "Взять из сокровищ" / "Искать неприятности" |
| `LOOT_ROOM` (после reveal) | `RevealedCardOverlay` — взятая карта |
| `COMBAT` | `CombatZone` — монстры, боевые числа, кнопки действий |
| `END_TURN` | Кнопка "Завершить ход" + возможность продать предметы |
| `CHARITY` | `CharityOverlay` — "сбрось 2 лишних карты" |
| `WAITING` | Лобби/ожидание старта |
| `END_GAME` | Экран победы/поражения |

---

## 25. Drag and Drop — полная спецификация

### 25.1 Drag sources (откуда можно тащить)

| Источник | Что тащим | Куда можно бросить |
|----------|-----------|-------------------|
| `CardHand` | Карта из руки | EquipmentZone (слот), BackpackPanel, GameTable (сыграть) |
| `EquipmentZone` (слот) | Экипированная карта | CardHand (снять), BackpackPanel, другой слот |
| `BackpackPanel` | Карта из рюкзака | CardHand (достать), EquipmentZone (экипировать напрямую*) |

> *Прямое экипирование из рюкзака: клиент отправляет `TAKE_FROM_BACKPACK` + `EQUIP_ITEM` последовательно. Движок примет оба.

### 25.2 Drop targets и их поведение

**EquipmentZone / конкретный слот:**
```
onDragOver(cardId):
  card = cardDb[cardId]
  canDrop = card.slots.includes(slotName) && слот свободен (или Воин)
  
  если canDrop:
    подсветить слот зелёным: gsap.to(slot, { borderColor: '#27ae60', scale: 1.05 })
  иначе:
    подсветить красным: gsap.to(slot, { borderColor: '#c0392b' })

onDrop(cardId):
  wsClient.send({ type: 'GAME_ACTION', payload: { type: 'EQUIP_ITEM', cardId, slot } })
```

**BackpackPanel:**
```
onDragOver(cardId):
  canDrop = !backpackFull && card.type !== 'MONSTER' && phase !== 'COMBAT'
  подсветить соответственно

onDrop(cardId):
  если источник = CardHand:
    wsClient.send({ type: 'PUT_IN_BACKPACK', cardId })
  если источник = EquipmentZone:
    // сначала снять, потом в рюкзак
    wsClient.send({ type: 'UNEQUIP_ITEM', cardId })
    // TAKE_FROM_BACKPACK не нужен — после UNEQUIP карта в руке, потом PUT_IN_BACKPACK
    wsClient.send({ type: 'PUT_IN_BACKPACK', cardId })
```

**GameTable (сыграть карту):**
```
onDragOver(cardId):
  canPlay = card.playableFrom.includes(currentPlayContext)
  
  если canPlay:
    подсветить стол золотым glow
  иначе:
    shake карты при попытке бросить (не принимать)

onDrop(cardId):
  // Определить контекст применения карты
  if card.type === 'EQUIPMENT':
    // Снаряжение нельзя "сыграть на стол" напрямую — только экипировать
    // Показать подсказку: "Перетащи на слот экипировки"
    animateInvalidDrop(cardId)
    return
  
  if requiresTarget(card):
    // Карта требует выбора цели (монстра или игрока)
    openTargetSelector(cardId)
    return
  
  wsClient.send({ type: 'PLAY_CARD', cardId })
```

**CardHand (вернуть из рюкзака/экипировки):**
```
onDrop(cardId):
  если источник = BackpackPanel:
    wsClient.send({ type: 'TAKE_FROM_BACKPACK', cardId })
  если источник = EquipmentZone:
    wsClient.send({ type: 'UNEQUIP_ITEM', cardId })
```

### 25.3 Недоступные drop targets во время боя

В фазе `COMBAT` заблокировать:
- BackpackPanel (нельзя убирать/доставать)
- Слоты экипировки — только если `card.playableFrom` не включает `YOUR_TURN_COMBAT`

Визуально: заблокированные зоны затемнены + иконка замка 🔒 при hover.

### 25.4 GSAP для drag and drop

```typescript
// При начале перетаскивания
onDragStart(cardEl: HTMLElement):
  gsap.to(cardEl, { scale: 1.15, rotation: 5, opacity: 0.85,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)', duration: 0.15 })

// При отмене / невалидном дропе — возврат на место
onDragCancel(cardEl: HTMLElement, origin: Position):
  gsap.to(cardEl, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
    duration: 0.3, ease: 'back.out(1.5)' })

// При успешном дропе — карта "прилипает" к зоне
onDropSuccess(cardEl: HTMLElement, targetRect: DOMRect):
  gsap.to(cardEl, {
    x: targetRect.left - cardEl.getBoundingClientRect().left,
    y: targetRect.top  - cardEl.getBoundingClientRect().top,
    scale: 0.8, opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => { /* STATE_PATCH придёт и перерендерит */ }
  })
```

---

## 26. Контекстное меню и тултипы

### 26.1 Правый клик / долгий тап на карту в руке

Открывает контекстное меню `CardContextMenu` рядом с картой:

```
┌────────────────────────┐
│  🗡 Меч Рубки  +3      │  ← заголовок
├────────────────────────┤
│  ✅ Экипировать        │  ← если card.slots && слот свободен
│  🎒 В рюкзак           │  ← если !backpackFull && не в бою
│  🃏 Сыграть в бой      │  ← если playableFrom включает текущий контекст
│  💰 Продать (300 gold) │  ← если не в бою
│  ❌ Сбросить           │  ← всегда (в CHARITY или по желанию)
└────────────────────────┘
```

**Правила видимости пунктов:**

| Пункт | Условие показа |
|-------|---------------|
| Экипировать | `card.slots?.length > 0` && есть свободный подходящий слот |
| В рюкзак | `config.enableBackpack` && `!backpackFull` && `phase !== 'COMBAT'` && `card.type !== 'MONSTER'` |
| Сыграть в бой | `card.playableFrom` пересекается с текущим `playContext` |
| Продать | `phase !== 'COMBAT'` && `card.value !== undefined` |
| Сбросить | Всегда (но только в фазе CHARITY или если карта одноразовая) |

**GSAP:**
```typescript
onOpen():
  gsap.from('.card-context-menu', { scale: 0.85, opacity: 0,
    y: -10, duration: 0.2, ease: 'back.out(2)' })

onClose():
  gsap.to('.card-context-menu', { scale: 0.85, opacity: 0,
    y: -10, duration: 0.15, ease: 'power2.in',
    onComplete: () => setVisible(false) })
```

---

### 26.2 Правый клик на карту в EquipmentZone

```
┌────────────────────────┐
│  🛡 Мифриловый щит  +3 │
├────────────────────────┤
│  👋 Снять в руку       │
│  🎒 Снять в рюкзак     │
└────────────────────────┘
```

---

### 26.3 Правый клик на карту в BackpackPanel

```
┌────────────────────────┐
│  🧪 Зелье силы  +2     │
├────────────────────────┤
│  🤚 Достать в руку     │
│  ✅ Экипировать сразу  │  ← если есть свободный слот
└────────────────────────┘
```

---

### 26.4 Hover-тултип на любую карту

При наведении (300ms задержка, чтобы не мелькало) появляется тултип `CardTooltip`:

```
┌──────────────────────────────┐
│  Шлем смелости               │  ← name
│  Снаряжение · Голова · 400 �gold│  ← type, slot, value
│                              │
│  +2 к бою                    │  ← description эффекта
│  (+4 для Воина)              │  ← conditional описание
└──────────────────────────────┘
```

Для монстров:
```
┌──────────────────────────────┐
│  Орк                         │
│  Монстр · Уровень 4          │
│  Сокровища: 1                │
│                              │
│  Плохие штуки:               │
│  Потеряй 2 уровня            │
└──────────────────────────────┘
```

**GSAP:**
```typescript
onShow():
  gsap.from('.card-tooltip', { opacity: 0, y: 8, duration: 0.15, ease: 'power2.out' })
onHide():
  gsap.to('.card-tooltip', { opacity: 0, y: 8, duration: 0.1 })
```

---

## 27. Модальные окна — полный список

### 27.1 Таблица всех модалок

| Модалка | Триггер открытия | Триггер закрытия |
|---------|-----------------|-----------------|
| `RevealedCardOverlay` | событие `CARD_REVEALED` | событие `CARD_APPLIED` |
| `CombatZone` | `phase === 'COMBAT'` | `phase !== 'COMBAT'` |
| `ReactionBar` | событие `REACTION_WINDOW_OPEN` | событие `REACTION_WINDOW_CLOSE` |
| `NegotiationModal` | событие `HELP_OFFERED` (для target) | `HELP_ACCEPTED / DECLINED` |
| `ChooseTargetOverlay` | `ACTION_REQUIRED` с `options[]` | `CHOOSE_OPTION` отправлен |
| `DiceRollOverlay` | действие `RUN_AWAY` принято сервером | анимация завершена + результат применён |
| `CharityOverlay` | `phase === 'CHARITY'` | `phase !== 'CHARITY'` |
| `SellItemsModal` | клик "Продать предметы" | закрыть вручную / подтвердить |
| `CardDetailModal` | клик на карту (не drag, именно клик) | клик вне / кнопка закрыть |
| `GameOverScreen` | `phase === 'END_GAME'` | клик "В лобби" |
| `WizardCurseCancelModal` | событие `CURSE_RECEIVED` + класс Волшебник | подтвердить / отмена |
| `HalflingEscapeModal` | действие `RUN_AWAY` + раса Хоббит | выбрал сбросить карту / пропустил |

---

### 27.2 RevealedCardOverlay

**Когда:** `state.revealedCards.length > 0 && revealedCards[0].ownerId === myPlayerId` (или чужая — тогда без кнопки).

```
┌──────────────────────────────────────┐
│                                      │
│         [карта крупным планом]       │
│         Название, тип, описание      │
│                                      │
│  [Reaction: 4s ████░░░░]             │  ← только если ReactionWindow открыт
│                                      │
│         [  Применить  ]              │  ← только у владельца, только после ReactionWindow
│                                      │
└──────────────────────────────────────┘
```

Кнопка "Применить" — disabled серая пока ReactionWindow открыт, активная после закрытия.

---

### 27.3 CharityOverlay

**Когда:** `phase === 'CHARITY'`.

```
┌──────────────────────────────────────┐
│  🎁 Благотворительность              │
│  Сбрось 2 лишних карты               │
│  (осталось сбросить: 2)              │
│                                      │
│  Перетащи карты сюда чтобы сбросить  │
│  ┌──────────────────────────────┐    │
│  │      [дроп-зона сброса]      │    │
│  └──────────────────────────────┘    │
│                                      │
│  Или передай игроку:                 │
│  [Игрок 2]  [Игрок 3]  [Игрок 4]    │
│                                      │
└──────────────────────────────────────┘
```

Drag карты из руки → на дроп-зону сброса = `DISCARD_CARD`.
Drag карты из руки → на иконку игрока = `GIVE_CARD { targetPlayerId }`.
Кнопка "Завершить ход" появляется только когда `hand.length <= 5`.

---

### 27.4 SellItemsModal

**Когда:** клик на кнопку "Продать предметы" (доступна в `LOOT_ROOM`, `END_TURN`, не в `COMBAT`).

```
┌──────────────────────────────────────┐
│  💰 Продать предметы                 │
│                                      │
│  Выбери предметы для продажи:        │
│  ☐ Меч Рубки          300 �gold       │
│  ☑ Кожаная броня      200 �gold       │
│  ☑ Сапоги буйства     400 �gold       │
│                                      │
│  Итого: 600 �gold → +0 уровней        │  ← обновляется live
│  Итого: 1200 �gold → +1 уровень       │
│                                      │
│  ⚠ Нельзя достичь ур. 10 продажей   │  ← если применимо
│                                      │
│  [Отмена]          [Продать]         │
└──────────────────────────────────────┘
```

Предметы из рюкзака и из экипировки в этом списке **не показываются** — только из руки и `carried`.

---

### 27.5 CardDetailModal

**Когда:** обычный клик (не drag) на любую карту в любой зоне.

Показывает карту в полный размер с полным описанием всех эффектов, условий, триггеров. Чисто информационная — никаких действий, только закрыть.

---

### 27.6 WizardCurseCancelModal

**Когда:** игрок — Волшебник, получено проклятие (событие `CURSE_RECEIVED`).

```
┌──────────────────────────────────────┐
│  🧙 Волшебник — отменить проклятие?  │
│                                      │
│  Получено: "Проклятие! Потеряй класс"│
│                                      │
│  Сбрось карту из руки чтобы          │
│  отменить проклятие:                  │
│                                      │
│  [Меч Рубки +3]  [Зелье силы]  ...   │  ← кликабельные карты из руки
│                                      │
│  [Пропустить — принять проклятие]    │
└──────────────────────────────────────┘
```

Таймаут 15 секунд — если не ответил, проклятие применяется.

---

### 27.7 HalflingEscapeModal

**Когда:** игрок — Хоббит, инициировал `RUN_AWAY`.

```
┌──────────────────────────────────────┐
│  🐾 Хоббит — бонус к побегу?        │
│                                      │
│  Сбрось карту из руки               │
│  → +1 к броску на побег             │
│                                      │
│  [Меч Рубки]  [Зелье]  [Проклятие]  │  ← карты из руки
│                                      │
│  [Пропустить — без бонуса]          │
└──────────────────────────────────────┘
```

После выбора (или пропуска) клиент отправляет `RUN_AWAY { diceRoll, discardedCardId? }`.

---

## 28. Состояния интерфейса — не твой ход

Когда `activePlayerId !== myPlayerId` — интерфейс переходит в пассивный режим:

**Что заблокировано:**
- Кнопки действий в `ActionPanel` (`disabled`)
- Дроп-зоны экипировки (не принимают drop)
- BackpackPanel (если `phase === 'COMBAT'`)
- Кнопки "Продать", "Завершить ход"

**Что доступно всегда:**
- `ReactionBar` (REACT_PASS / сыграть карту-реакцию)
- `NegotiationModal` (если тебе предложили помощь)
- Hover-тултипы на всех картах
- `CardDetailModal` (просмотр)
- Торг (`COUNTER_OFFER`, `ACCEPT_HELP`, `DECLINE_HELP`)

**Визуальный индикатор чьего хода:**
- Активный игрок: `PlayerArea` подсвечен золотым glow (GSAP `repeat:-1 yoyo:true`)
- Вверху экрана: полоска с именем `"Ход: Артём"` + прогресс-бар таймаута хода (если есть)

---

## 29. PlayerArea других игроков

Для каждого не-своего игрока показывается компактная карточка сверху экрана:

```
┌────────────────────────────────────┐
│  👤 Катя     Lv: 7   ⚔ 15         │
│  🧝 Эльф  ⚔ Воин                  │
│  ♠ 4 карты   🎒 (2)   ♀           │
│  [3 иконки экипированных предметов]│
│  💀 Проклятие: -2 к бою            │
└────────────────────────────────────┘
```

- Уровень и сила видны всем
- Иконки экипировки — видны всем (только иконки, не подробности, hover → тултип)
- Карты в руке — только счётчик и рубашки
- Карты в рюкзаке — только счётчик
- Активный игрок — рамка подсвечена

**Клик на PlayerArea другого игрока** → открывает `PlayerDetailModal`:

```
┌──────────────────────────────────────┐
│  👤 Катя                             │
│  Уровень: 7  |  Сила: 15  |  ♀      │
│  Раса: Эльф  |  Классы: Воин        │
│                                      │
│  Экипировка:                         │
│  Голова: Рогатый шлем +3            │
│  Тело: Мифриловая броня +3          │
│  Правая рука: Меч Рубки +3          │
│  ...                                 │
│                                      │
│  Проклятия: [-2 к бою]              │
│  Карт в руке: 4  |  Рюкзак: 2/5    │
└──────────────────────────────────────┘
```

---

## 30. Список UI-компонентов

```
Дизайн-система:
  CSS переменные, GoldButton, CardFrame, LevelBadge
  AbilityChip, Tooltip, CurseTag, StatusTag
  RaceIcon, ClassIcon, GenderIcon

Базовый клиент:
  Роутинг, WsClient, Zustand сторы, GSAP setup
  useDraggableCard, useDropZone хуки

Игровой стол:
  PlayerStatsPanel
  EquipmentZone (слоты с drop targets)
  BackpackPanel (сетка ячеек с drag and drop)
  CardHand (drag source, hover, контекстное меню)
  DeckArea (колоды)
  GameLog
  OtherPlayerCard (компактный вид других игроков)
  CardTooltip, CardContextMenu, CardDetailModal

Оверлеи и модалки:
  RevealedCardOverlay (раскрытая карта + кнопка применить)
  CharityOverlay
  SellItemsModal
  WizardCurseCancelModal
  HalflingEscapeModal
  CombatZone + ActionPanel
  ReactionBar
  NegotiationModal
  ChooseTargetOverlay

GSAP анимации:
  CardDraw, DoorOpen, CombatResult, Doppelganger, DiceRoll, Ambient
```

---

## 31. Layout игрового стола — зоны и их расположение

### 31.1 Общая схема экрана

```
┌─────────────────────────────────────────────────────────────────────┐
│  ДРУГИЕ ИГРОКИ (горизонтальная полоса сверху)                        │
│  [Катя Lv7 ♀ Эльф/Воин ❤15] [Женя Lv3 ♂ — /Клирик ❤3] [...]      │
├────────────┬────────────────────────────────────────┬───────────────┤
│            │                                        │               │
│  PLAYER    │         СТОЛ (TABLE ZONE)              │   РЮКЗАК      │
│  STATS     │  ┌──────────┐   ┌──────────┐          │   PANEL       │
│  PANEL     │  │ Колода   │   │ Колода   │          │               │
│            │  │ дверей   │   │ сокровищ │          │  [карта]      │
│  Уровень   │  └──────────┘   └──────────┘          │  [карта]      │
│  Сила      │                                        │  [пусто]      │
│  Пол       │  ┌──────────────────────────────────┐  │  [пусто]      │
│  Раса      │  │         ЗОНА БОЯ                 │  │  [пусто]      │
│  Классы    │  │   (CombatZone — только в бою)    │  │               │
│  Статусы   │  └──────────────────────────────────┘  │   3/5 📦     │
│  Проклятия │                                        │               │
├────────────┼────────────────────────────────────────┤               │
│            │       ЗОНА ЭКИПИРОВКИ                  │               │
│            │  [Голова] [Тело] [Ноги]               │               │
│            │  [Лев.рука] [Прав.рука / Двуручное]   │               │
│            │                                        │               │
├────────────┴────────────────────────────────────────┴───────────────┤
│                    РУКА ИГРОКА (CardHand)                            │
│         [карта] [карта] [карта] [карта] [карта]                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Правила зон:**
- `TABLE ZONE` — нейтральная зона: сюда падают карты которые "играются на стол" (модификаторы монстров, одноразовые во время боя)
- `EQUIPMENT ZONE` — слоты экипировки с drop targets
- `BACKPACK PANEL` — сетка ячеек справа, сворачивается
- `CARD HAND` — рука игрока внизу, drag source
- `PLAYER STATS PANEL` — слева, только чтение (no drag targets)
- Чужие игроки — компактные карточки сверху, кликабельны для просмотра деталей

---

## 32. Drag and Drop — полная логика

### 32.1 Drag sources (откуда можно тащить)

| Источник | Условие активации |
|---|---|
| `CardHand` — карта из руки | Всегда, кроме фазы `WAITING` и `END_GAME` |
| `EquipmentZone` — экипированный предмет | Только вне боя (`phase !== 'COMBAT'`) |
| `BackpackPanel` — карта в рюкзаке | Только вне боя |

Во время чужого хода drag работает **только для карт-реакций** (`playableFrom: ['REACTION', 'ANY_COMBAT']`). Остальные карты в руке отображаются с `opacity: 0.4` и `cursor: not-allowed`.

### 32.2 Drop targets и результирующие действия

```
РУКА → ЗОНА ЭКИПИРОВКИ (конкретный слот):
  Условие: card.slots включает этот слот
  Действие WS: EQUIP_ITEM { cardId, slot? }
  Анимация: карта летит в слот, слот подсвечивается

РУКА → ЗОНА ЭКИПИРОВКИ (неверный слот):
  Карта возвращается на место — shake анимация слота
  Показать тултип: "Этот предмет нельзя сюда надеть"

РУКА → РЮКЗАК:
  Условие: backpack.length < backpackSize && !isCombat
  Действие WS: PUT_IN_BACKPACK { cardId }
  Анимация: карта сжимается и влетает в рюкзак

РУКА → СТОЛ (TABLE ZONE):
  Условие: карта playableFrom содержит текущий контекст
  Действие WS: PLAY_CARD { cardId, targetPlayerId?, targetMonsterId? }
  Анимация: карта летит на стол, затем в сброс

РУКА → МОНСТР В ЗОНЕ БОЯ (drop на конкретного монстра):
  Условие: card.type === 'MODIFIER' || применим в бою
  Действие WS: PLAY_CARD { cardId, targetMonsterId: monster.instanceId }
  Анимация: карта прикрепляется к монстру

РУКА → КАРТОЧКА ИГРОКА (drop на другого игрока):
  Условие: карта playableFrom содержит 'ANY_COMBAT' и идёт как реакция
  Действие WS: PLAY_CARD { cardId, targetPlayerId }

ЭКИПИРОВКА → РУКА:
  Условие: !isCombat
  Действие WS: UNEQUIP_ITEM { cardId }
  Карта возвращается в руку

ЭКИПИРОВКА → РЮКЗАК:
  Нельзя напрямую. Drop → карта возвращается, показать: "Сначала сними предмет"

РЮКЗАК → РУКА:
  Условие: !isCombat
  Действие WS: TAKE_FROM_BACKPACK { cardId }

РЮКЗАК → ЭКИПИРОВКА:
  Нельзя напрямую. Drop → карта возвращается, показать: "Достань в руку сначала"
```

### 32.3 Визуальный feedback при перетаскивании

```typescript
// Состояния каждой drop zone при активном drag:

type DropZoneState = 'idle' | 'valid' | 'invalid' | 'hover'

// При начале drag (dragStart):
  Определить validDropTargets(cardId) → список зон куда карту можно бросить
  Подсветить валидные зоны: gsap.to(zone, { borderColor: '#c9a84c', opacity: 1 })
  Затемнить невалидные: gsap.to(zone, { opacity: 0.3 })

// При наведении на зону (dragEnter):
  if zone is valid:
    gsap.to(zone, { scale: 1.03, boxShadow: 'var(--shadow-glow-gold)' })
  else:
    gsap.to(zone, { borderColor: '#c0392b' })  // красный — нельзя

// При уходе с зоны (dragLeave):
  gsap.to(zone, { scale: 1.0, boxShadow: 'none', borderColor: исходный })

// При drop на невалидную зону или вне зон (dragCancel):
  Карта возвращается: gsap.to(cardEl, { x: 0, y: 0, opacity: 1, duration: 0.3, ease: 'back.out' })

// При успешном drop:
  Optimistic update: немедленно скрыть карту из источника
  После STATE_PATCH: применить реальный стейт
```

### 32.4 Drag реализация (технически)

Использовать нативный HTML5 Drag and Drop API через хук `useDragAndDrop`:

```typescript
// packages/client/src/hooks/useDragAndDrop.ts

interface DragPayload {
  cardId: CardId;
  sourceZone: 'HAND' | 'EQUIPMENT' | 'BACKPACK';
  sourceSlot?: string;
}

export function useDraggableCard(cardId: CardId, sourceZone: DragPayload['sourceZone']) {
  const isDraggable = useIsDraggable(cardId, sourceZone);  // проверка по фазе

  return {
    draggable: isDraggable,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer!.setData('application/munchkin-card', JSON.stringify({ cardId, sourceZone }));
      e.dataTransfer!.effectAllowed = 'move';
      // Phantom image — кастомный: renderCardThumbnail(cardId)
      gsap.to(e.currentTarget, { opacity: 0.5, scale: 0.95, duration: 0.1 });
    },
    onDragEnd: (e: DragEvent) => {
      gsap.to(e.currentTarget, { opacity: 1, scale: 1, duration: 0.2 });
    }
  };
}

export function useDropZone(
  zone: DropZoneId,
  onDrop: (payload: DragPayload) => void
) {
  const canDrop = useCanDrop(zone);  // из gameStore

  return {
    onDragOver: (e: DragEvent) => {
      if (canDrop(e)) e.preventDefault();  // разрешить drop
    },
    onDrop: (e: DragEvent) => {
      const payload = JSON.parse(e.dataTransfer!.getData('application/munchkin-card'));
      onDrop(payload);
    }
  };
}
```

### 32.5 Контекстное меню (альтернатива drag для мобильных)

Правый клик / долгое нажатие на карту открывает `CardContextMenu`:

```
Карта в руке → контекстное меню:
  [Сыграть на стол]          — если playableFrom текущего контекста
  [Надеть] → [Голова / ...]  — если EQUIPMENT с конкретными слотами
  [Убрать в рюкзак]          — если !isCombat && backpack не полон
  [Продать за N золота]       — если !isCombat && card.value exists
  [Подробнее...]              — открыть CardDetailModal

Карта в экипировке → контекстное меню:
  [Снять в руку]             — если !isCombat
  [Подробнее...]

Карта в рюкзаке → контекстное меню:
  [Достать в руку]           — если !isCombat
  [Подробнее...]
```

---

## 33. PlayerStats Panel — логика и отображение

### 33.1 Что отображается

```typescript
interface PlayerStatsPanelData {
  // Базовые
  name: string;
  level: number;
  combatPower: number;     // calculatePlayerPower() — пересчитывается при любом изменении
  gender: Gender;

  // Раса
  race: Race | null;       // null = Человек
  raceAbilities: AbilityDescription[];

  // Классы
  classes: PlayerClass[];
  classAbilities: AbilityDescription[];

  // Снаряжение (суммарный бонус)
  equipmentBonus: number;  // сумма всех бонусов от экипировки

  // Проклятия
  curses: ActiveCurseDisplay[];

  // Статусы
  statuses: StatusDisplay[];

  // Рюкзак
  backpackCount: number;
  backpackMax: number;

  // Рука
  handCount: number;
}

interface AbilityDescription {
  name: string;
  description: string;
  isActive: boolean;   // false если условие не выполнено (напр. epic только от 10+ ур.)
}
```

### 33.2 Расчёт combatPower в реальном времени

`combatPower` — это всегда результат `calculatePlayerPower()` из движка. На клиенте он **не вычисляется независимо** — приходит из `GameState` который синхронизирован с сервером.

Однако для мгновенного отклика UI можно добавить **preview**: когда игрок наводит на карту в руке — показывать `+N` рядом с числом силы:

```typescript
// useEquipPreview.ts
function useEquipPreview(hoveredCardId: CardId | null) {
  const { state, cardDb } = useGameStore();
  
  if (!hoveredCardId) return null;
  
  const card = cardDb[hoveredCardId];
  if (card.type !== 'EQUIPMENT') return null;
  
  // Локально просчитать бонус (только COMBAT_BONUS эффекты, без CONDITIONAL)
  const previewBonus = estimateCombatBonus(card, state.players[myPlayerId]);
  return previewBonus;
}
```

### 33.3 Описание способностей рас и классов

Все описания хранятся в `packages/shared/src/data/abilities.ts` — статический справочник:

```typescript
export const RACE_ABILITIES: Record<Race | 'HUMAN', AbilityEntry[]> = {
  HUMAN: [
    {
      name: 'Продажа без ограничений',
      description: 'Люди могут продавать предметы в любой момент своего хода.',
      trigger: 'passive',
      isEpic: false,
    }
  ],
  ELF: [
    {
      name: 'Лесная удача',
      description: 'Каждый раз когда ты помогаешь победить монстра — получаешь +1 уровень.',
      trigger: 'ON_HELPER_VICTORY',
      isEpic: false,
    }
  ],
  DWARF: [
    {
      name: 'Крепкая спина',
      description: 'Можешь нести два Больших предмета одновременно (обычный лимит — 1).',
      trigger: 'passive',
      isEpic: false,
    }
  ],
  HALFLING: [
    {
      name: 'Быстрые ноги',
      description: 'Можешь сбросить карту из руки чтобы получить +1 к броску на побег.',
      trigger: 'ON_RUN_AWAY',
      isEpic: false,
    }
  ],
};

export const CLASS_ABILITIES: Record<PlayerClass, AbilityEntry[]> = {
  WARRIOR: [
    {
      name: 'Мастер оружия',
      description: 'Можешь использовать любое оружие без ограничений по расе и полу.',
      trigger: 'passive',
      isEpic: false,
    },
    {
      name: 'Силач',
      description: 'Можешь использовать Большое двуручное оружие одной рукой.',
      trigger: 'passive',
      isEpic: false,
    }
  ],
  WIZARD: [
    {
      name: 'Антимагия',
      description: 'Можешь сбросить N карт из руки чтобы отменить N проклятий (1:1).',
      trigger: 'ON_CURSE_RECEIVED',
      isEpic: false,
    }
  ],
  CLERIC: [
    {
      name: 'Воскрешение',
      description: 'Один раз за игру после смерти: верни 1 предмет из сброса в руку.',
      trigger: 'ON_DEATH',
      isEpic: false,
      oneTime: true,
    }
  ],
  THIEF: [
    {
      name: 'Воровство',
      description: 'Во время чужого боя: брось кубик. 4+ — укради 1 предмет из снаряжения.',
      trigger: 'ON_OTHERS_COMBAT',
      isEpic: false,
    }
  ],
};
```

### 33.4 PlayerStats Panel — компонент

```typescript
// packages/client/src/components/board/PlayerStatsPanel.tsx

export const PlayerStatsPanel: FC<{ playerId: string }> = ({ playerId }) => {
  const { state, cardDb } = useGameStore();
  const player = state.players[playerId];
  const isMe = playerId === useMyPlayerId();

  // Пересчитывать при любом изменении стейта
  const combatPower = useMemo(
    () => calculatePlayerPower(state, playerId, state.combat?.appliedCards ?? []),
    [state]
  );

  const raceAbilities   = player.race   ? RACE_ABILITIES[player.race]    : RACE_ABILITIES['HUMAN'];
  const classAbilities  = player.classes.flatMap(c => CLASS_ABILITIES[c]);

  const hoveredCardId   = useHoveredCard();
  const powerPreview    = useEquipPreview(hoveredCardId);

  return (
    <aside className="player-stats-panel">
      {/* Шапка */}
      <div className="stats-header">
        <span className="player-name">{player.name}</span>
        <GenderIcon gender={player.gender} />
      </div>

      {/* Главные числа */}
      <div className="stats-main">
        <LevelBadge level={player.level} />                {/* анимируется через GSAP */}
        <PowerDisplay
          power={combatPower}
          preview={powerPreview}                           {/* +N при hover на карту */}
        />
      </div>

      {/* Раса */}
      <div className="stats-section">
        <h4>Раса</h4>
        <RaceDisplay
          race={player.race}                              {/* null = Человек */}
          abilities={raceAbilities}
        />
      </div>

      {/* Классы */}
      <div className="stats-section">
        <h4>Классы</h4>
        {player.classes.length > 0
          ? player.classes.map(cls => (
              <ClassDisplay key={cls} cls={cls} abilities={CLASS_ABILITIES[cls]} />
            ))
          : <span className="muted">Нет класса</span>
        }
      </div>

      {/* Проклятия — только если есть */}
      {player.curses.length > 0 && (
        <div className="stats-section stats-curses">
          <h4>Проклятия</h4>
          {player.curses.map(curse => (
            <CurseTag key={curse.id} curse={curse} />
          ))}
        </div>
      )}

      {/* Статусы — только если есть */}
      {player.statuses?.length > 0 && (
        <div className="stats-section">
          <h4>Статусы</h4>
          {player.statuses.map(s => <StatusTag key={s} status={s} />)}
        </div>
      )}

      {/* Инвентарь — только у своего игрока */}
      {isMe && (
        <div className="stats-footer">
          <span>Рука: {player.hand.length}</span>
          <span>Рюкзак: {player.backpack.length}/{state.config.backpackSize}</span>
        </div>
      )}
    </aside>
  );
};
```

### 33.5 RaceDisplay и ClassDisplay — детальное отображение способностей

```typescript
// Компонент: иконка + название + тултип с описанием
const RaceDisplay: FC<{ race: Race | null; abilities: AbilityEntry[] }> = ({ race, abilities }) => (
  <div className="race-display">
    <RaceIcon race={race} />
    <span className="race-name">{race ?? 'Человек'}</span>
    <div className="abilities-list">
      {abilities.map(ability => (
        <AbilityChip
          key={ability.name}
          ability={ability}
          // Подсветить ярче если способность сейчас активна
          // (напр. ON_HELPER_VICTORY — только если идёт бой где ты помощник)
          highlight={isAbilityActive(ability, gameState, playerId)}
        />
      ))}
    </div>
  </div>
);

// AbilityChip — кликабельный чип с тултипом
const AbilityChip: FC<{ ability: AbilityEntry; highlight: boolean }> = ({ ability, highlight }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    gsap.to(chipRef.current, { scale: 1.05, duration: 0.15 });
    setShowTooltip(true);
  };
  const handleMouseLeave = () => {
    gsap.to(chipRef.current, { scale: 1.0, duration: 0.15 });
    setShowTooltip(false);
  };

  return (
    <div
      ref={chipRef}
      className={`ability-chip ${highlight ? 'active' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span>{ability.name}</span>
      {showTooltip && (
        <Tooltip>
          <p>{ability.description}</p>
          {ability.trigger !== 'passive' && (
            <span className="trigger-label">Срабатывает: {triggerLabel(ability.trigger)}</span>
          )}
          {ability.oneTime && <span className="one-time-label">⚠ Один раз за игру</span>}
        </Tooltip>
      )}
    </div>
  );
};
```

### 33.6 PowerDisplay — отображение боевой силы с preview

```typescript
const PowerDisplay: FC<{ power: number; preview: number | null }> = ({ power, preview }) => {
  const displayRef = useRef<HTMLSpanElement>(null);
  const prevPower  = useRef(power);

  // Анимация при изменении силы
  useEffect(() => {
    if (prevPower.current !== power) {
      const direction = power > prevPower.current ? 1 : -1;
      gsap.fromTo(displayRef.current,
        { y: direction * -15, opacity: 0.3, color: direction > 0 ? '#27ae60' : '#c0392b' },
        { y: 0, opacity: 1, color: 'var(--color-gold)', duration: 0.4, ease: 'back.out' }
      );
      prevPower.current = power;
    }
  }, [power]);

  return (
    <div className="power-display">
      <label>Сила в бою</label>
      <span ref={displayRef} className="power-value">{power}</span>
      {preview !== null && preview !== 0 && (
        <span className={`power-preview ${preview > 0 ? 'positive' : 'negative'}`}>
          {preview > 0 ? `+${preview}` : preview}
        </span>
      )}
    </div>
  );
};
```

### 33.7 Компактный вид других игроков (OtherPlayerCard)

Сверху экрана — горизонтальная полоса с компактными карточками всех остальных игроков.

```typescript
const OtherPlayerCard: FC<{ playerId: string }> = ({ playerId }) => {
  const { state } = useGameStore();
  const player     = state.players[playerId];
  const isActive   = state.activePlayerId === playerId;
  const isHelper   = state.combat?.helpers.some(h => h.playerId === playerId);
  const cardRef    = useRef<HTMLDivElement>(null);

  // Ambient glow для активного игрока
  useEffect(() => {
    if (isActive) {
      gsap.to(cardRef.current, {
        boxShadow: '0 0 20px rgba(201,168,76,0.5)',
        repeat: -1, yoyo: true, duration: 1.5
      });
    } else {
      gsap.to(cardRef.current, { boxShadow: 'none', duration: 0.3 });
    }
  }, [isActive]);

  return (
    <div ref={cardRef} className={`other-player-card ${isActive ? 'active' : ''} ${isHelper ? 'helper' : ''}`}>
      <div className="opc-header">
        <span className="opc-name">{player.name}</span>
        <GenderIcon gender={player.gender} />
        {!player.isConnected && <span className="disconnected-icon">⚡</span>}
      </div>
      <div className="opc-stats">
        <LevelBadge level={player.level} compact />
        <span className="opc-power">⚔ {calculatePlayerPower(state, playerId, [])}</span>
      </div>
      <div className="opc-identity">
        {player.race && <RaceIcon race={player.race} small />}
        {player.classes.map(c => <ClassIcon key={c} cls={c} small />)}
      </div>
      {/* Карты в руке — только рубашки */}
      <div className="opc-hand">
        {Array(player.hand.length).fill(null).map((_, i) => (
          <div key={i} className="card-back-small" />
        ))}
      </div>
      {/* Проклятия — иконки */}
      {player.curses.length > 0 && (
        <div className="opc-curses">
          {player.curses.map(c => <CurseIcon key={c.id} curse={c} />)}
        </div>
      )}
    </div>
  );
};
```

---

## 34. EquipmentZone — зона экипировки

### 34.1 Структура слотов

```typescript
const EQUIPMENT_SLOTS: SlotConfig[] = [
  { id: 'head',       label: 'Голова',      icon: '🪖', accepts: ['head'] },
  { id: 'body',       label: 'Тело',         icon: '🛡', accepts: ['body'] },
  { id: 'feet',       label: 'Ноги',         icon: '👢', accepts: ['feet'] },
  { id: 'leftHand',   label: 'Левая рука',   icon: '🤚', accepts: ['leftHand'] },
  { id: 'rightHand',  label: 'Правая рука',  icon: '✋', accepts: ['rightHand'] },
  { id: 'twoHands',   label: 'Обе руки',     icon: '⚔️', accepts: ['twoHands'] },
];
```

### 34.2 Логика отображения слотов рук

Слоты `leftHand`, `rightHand`, `twoHands` — взаимозависимы. Отображать динамически:

```
Если equipped.twoHands заполнен:
  → показать один большой слот "Обе руки" с картой
  → leftHand и rightHand скрыты / заблокированы

Если equipped.twoHands пуст:
  → показать leftHand и rightHand по отдельности

При hover двуручной карты над EquipmentZone:
  → оба слота рук подсвечиваются золотым одновременно
```

### 34.3 EquipmentSlot компонент

```typescript
const EquipmentSlot: FC<{ slot: SlotConfig; equipped: CardId | null }> = ({ slot, equipped }) => {
  const { state, cardDb } = useGameStore();
  const slotRef = useRef<HTMLDivElement>(null);

  // Drop zone
  const { onDragOver, onDrop } = useDropZone(slot.id, (payload) => {
    const card = cardDb[payload.cardId];
    if (canEquipInSlot(card, slot.id, state)) {
      wsClient.send({ type: 'GAME_ACTION', payload: { type: 'EQUIP_ITEM', cardId: payload.cardId } });
    } else {
      // shake + tooltip
      gsap.to(slotRef.current, { x: [0, -6, 6, -6, 0], duration: 0.3 });
      showSlotError(slot.id, getEquipError(card, slot.id, state));
    }
  });

  return (
    <div
      ref={slotRef}
      className={`equipment-slot ${equipped ? 'filled' : 'empty'}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {equipped ? (
        <CardFrame
          cardId={equipped}
          size="small"
          draggable
          sourceZone="EQUIPMENT"
          sourceSlot={slot.id}
          onDoubleClick={() => wsClient.send({
            type: 'GAME_ACTION',
            payload: { type: 'UNEQUIP_ITEM', cardId: equipped }
          })}
        />
      ) : (
        <div className="slot-placeholder">
          <span className="slot-icon">{slot.icon}</span>
          <span className="slot-label">{slot.label}</span>
        </div>
      )}
    </div>
  );
};
```

### 34.4 Суммарный бонус от экипировки

Под зоной экипировки показывать итоговые бонусы:

```typescript
const EquipmentSummary: FC = () => {
  const { state } = useGameStore();
  const myId = useMyPlayerId();
  const player = state.players[myId];

  // Разбить на категории
  const combatBonus  = sumEquipmentBonus(player, state.cardDb, 'COMBAT_BONUS');
  const escapeBonus  = sumEquipmentBonus(player, state.cardDb, 'ESCAPE_BONUS');

  return (
    <div className="equipment-summary">
      <span>Бонус к бою: <strong>+{combatBonus}</strong></span>
      {escapeBonus > 0 && <span>Бонус к побегу: <strong>+{escapeBonus}</strong></span>}
    </div>
  );
};
```

---

## 35. CardHand — детальная реализация

### 35.1 Расположение карт в руке

Карты расположены веером с перекрытием. Позиции пересчитываются при изменении количества карт:

```typescript
function calcHandPositions(count: number, containerWidth: number): number[] {
  const cardWidth  = 120;
  const maxSpread  = containerWidth - cardWidth;
  const step       = Math.min(cardWidth + 8, maxSpread / Math.max(count - 1, 1));

  return Array(count).fill(0).map((_, i) => {
    const center = (count - 1) / 2;
    return (i - center) * step;
  });
}

// При изменении count: анимировать пересчёт позиций
useEffect(() => {
  const positions = calcHandPositions(cards.length, handWidth);
  cards.forEach((_, i) => {
    gsap.to(cardRefs[i].current, {
      x: positions[i],
      duration: 0.3,
      ease: 'power2.out'
    });
  });
}, [cards.length]);
```

### 35.2 Hover эффект на карте в руке

```typescript
const handleMouseEnter = (cardId: CardId, el: HTMLElement) => {
  gsap.to(el, { y: -24, scale: 1.08, zIndex: 100, duration: 0.2, ease: 'power2.out' });
  setHoveredCard(cardId);   // для PowerDisplay preview
};

const handleMouseLeave = (el: HTMLElement) => {
  gsap.to(el, { y: 0, scale: 1.0, zIndex: 'auto', duration: 0.2 });
  setHoveredCard(null);
};
```

### 35.3 Состояния карты в руке

```typescript
type CardHandState =
  | 'playable'       // можно сыграть — полная яркость
  | 'not-playable'   // нельзя сейчас — opacity 0.5, cursor not-allowed
  | 'equippable'     // можно надеть — золотая подсветка при hover
  | 'reaction'       // можно сыграть как реакция — синяя подсветка
  | 'dragging'       // сейчас тащится — opacity 0.4
  | 'selected'       // выделена для действия — gold border

function getCardHandState(cardId, gameState, myPlayerId): CardHandState {
  const card  = gameState.cardDb[cardId];
  const phase = gameState.phase;

  if (phase === 'COMBAT' && gameState.combat?.activePlayerId !== myPlayerId) {
    // Не мой бой — только реакции
    return card.playableFrom.includes('REACTION') ? 'reaction' : 'not-playable';
  }
  if (card.type === 'EQUIPMENT' && phase !== 'COMBAT') return 'equippable';
  if (isPlayableInCurrentContext(card, gameState)) return 'playable';
  return 'not-playable';
}
```

---

## 36. Список UI-компонентов (финальный)

```
Дизайн-система:
  CSS переменные, шрифты, GoldButton, CardFrame, LevelBadge
  AbilityChip, Tooltip, CurseTag, StatusTag
  RaceIcon, ClassIcon, GenderIcon

Базовый клиент:
  Роутинг, WsClient, Zustand сторы, GSAP setup
  useDraggableCard, useDropZone хуки
  calcHandPositions утилита

Игровой стол — все зоны:
  A. PlayerStatsPanel (уровень, сила, preview, раса, класс, способности, проклятия)
  B. OtherPlayerCard (компактный вид, ambient glow для активного)
  C. EquipmentZone (слоты, взаимозависимость рук, EquipmentSummary)
  D. BackpackPanel (сетка, drag target, анимации влёт/вылет)
  E. CardHand (веер, hover, drag source, контекстное меню, состояния)
  F. DeckArea (колоды + счётчики)
  G. GameLog (последние 20 событий)
  H. TABLE ZONE (drop target для PLAY_CARD)

Оверлеи и модалки:
  RevealedCardOverlay
  CardContextMenu (правый клик / долгое нажатие)
  CardDetailModal (детальный просмотр карты)
  CharityOverlay, SellItemsModal
  WizardCurseCancelModal, HalflingEscapeModal

Боевой интерфейс:
  CombatZone + ActionPanel
  ReactionBar
  NegotiationModal
  ChooseTargetOverlay

GSAP анимации:
  CardDraw, DoorOpen, CombatResult, Doppelganger, DiceRoll, Ambient
```
