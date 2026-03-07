import path from 'node:path';
import fs from 'node:fs';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { createServer } from './ws/server';
import { createAuthRoutes } from './auth/auth-routes';
import { createLobbyRoutes } from './lobby/lobby-routes';
import { createAdminRoutes } from './admin/admin-routes';
import { PgUserStore } from './store/pg-user-store';
import { RedisGameStore } from './store/redis-game-store';
import { GameRoom } from './game/game-room';
import { projectStateForPlayer } from './game/state-projector';
import type { CardDb, GameState, PlayerState, EquippedItems, GameConfig } from '@munchkin/shared';

// Load .env from project root
config({ path: path.resolve(__dirname, '../../../.env') });

const port = Number(process.env.PORT) || 3001;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const cardDataDir = path.resolve(__dirname, '../../../packages/data/src');

// --- Database ---
const dbAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: dbAdapter });
const userStore = new PgUserStore(prisma);

// --- Redis ---
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const gameStore = new RedisGameStore(redis);

// --- Card DB ---
function loadCardDb(): CardDb {
  const cardDb: CardDb = {};
  const files = fs.readdirSync(cardDataDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const cards = JSON.parse(fs.readFileSync(path.join(cardDataDir, file), 'utf8'));
    for (const card of cards) {
      cardDb[card.id] = card;
    }
  }
  return cardDb;
}

const cardDb = loadCardDb();
console.log(`Loaded ${Object.keys(cardDb).length} cards`);

// --- Game Rooms ---
const gameRooms = new Map<string, GameRoom>();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyEquipped(): EquippedItems {
  return { head: null, body: null, feet: null, hand1: null, hand2: null, twoHands: null, extras: [] };
}

async function initGame(roomId: string, players: { id: string; name: string }[]) {
  const doorCards: string[] = [];
  const treasureCards: string[] = [];
  for (const [id, card] of Object.entries(cardDb)) {
    if (card.deck === 'DOOR') doorCards.push(id);
    else if (card.deck === 'TREASURE') treasureCards.push(id);
  }

  const shuffledDoor = shuffle(doorCards);
  const shuffledTreasure = shuffle(treasureCards);

  const playerStates: Record<string, PlayerState> = {};
  const playerOrder: string[] = [];

  for (const p of players) {
    playerOrder.push(p.id);
    const hand: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = shuffledDoor.pop();
      if (d) hand.push(d);
      const t = shuffledTreasure.pop();
      if (t) hand.push(t);
    }
    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      level: 1,
      gender: 'MALE',
      race: null,
      classes: [],
      hand,
      equipped: emptyEquipped(),
      carried: [],
      curses: [],
      isConnected: true,
      statuses: [],
      backpack: [],
      soldGold: 0,
    };
  }

  const gameConfig: GameConfig = {
    winLevel: 10,
    epicMode: false,
    allowedSets: ['base'],
    maxPlayers: 6,
    enableBackpack: true,
    backpackSize: 5,
    reactionTimeoutMs: 15000,
    revealTimeoutMs: 60000,
  };

  const state: GameState = {
    id: roomId,
    phase: 'KICK_DOOR',
    turn: 1,
    activePlayerId: playerOrder[0],
    playerOrder,
    players: playerStates,
    doorDeck: shuffledDoor,
    treasureDeck: shuffledTreasure,
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [],
    winner: null,
    revealedCards: [],
    config: gameConfig,
  };

  await gameStore.setState(roomId, state, 1);

  const gameRoom = new GameRoom(roomId, gameStore, cardDb);
  gameRooms.set(roomId, gameRoom);
  router.setHandler(roomId, gameRoom);
  console.log(`Game started for room ${roomId} with ${players.length} players`);
}

// --- Server ---
const { app, router } = createServer({ port, jwtSecret }, {
  onConnect(client) {
    const gameRoom = gameRooms.get(client.roomId);
    if (gameRoom) {
      gameRoom.addClient(client);
      gameStore.getState(client.roomId).then(stored => {
        if (stored) {
          const player = stored.state.players[client.playerId];
          if (player) {
            player.isConnected = true;
            gameStore.setState(client.roomId, stored.state, stored.version);
          }
          const projected = projectStateForPlayer(stored.state, client.playerId);
          client.send({
            type: 'FULL_SYNC',
            payload: { gameState: projected, cardDb },
          });
        }
      });
    }
  },
  onDisconnect(client) {
    const gameRoom = gameRooms.get(client.roomId);
    if (gameRoom) {
      gameRoom.removeClient(client.playerId);
    }
  },
});

// --- Routes ---
const authRoutes = createAuthRoutes({ jwtSecret }, userStore);
authRoutes.registerRoutes(app);

const lobbyRoutes = createLobbyRoutes({ jwtSecret }, initGame);
lobbyRoutes.registerRoutes(app);

const adminRoutes = createAdminRoutes({ jwtSecret, cardDataDir }, userStore, lobbyRoutes);
adminRoutes.registerRoutes(app);

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
