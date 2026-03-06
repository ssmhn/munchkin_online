import type { FastifyInstance, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export interface AdminConfig {
  jwtSecret: string;
  cardDataDir: string;
}

interface AdminUserStore {
  findUserById(id: string): Promise<{ id: string; email: string; name: string; isAdmin?: boolean } | null>;
  listUsers(): Promise<{ id: string; email: string; name: string; isAdmin?: boolean; createdAt: Date }[]>;
  updateUser(id: string, data: { name?: string; isAdmin?: boolean }): Promise<void>;
  deleteUser(id: string): Promise<void>;
}

interface AuthPayload {
  userId: string;
  email: string;
  name: string;
}

interface RoomStore {
  listRooms(): { id: string; name: string; phase: string; playerCount: number; adminName: string }[];
}

function extractUser(req: FastifyRequest, jwtSecret: string): AuthPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export function createAdminRoutes(config: AdminConfig, userStore: AdminUserStore, roomStore?: RoomStore) {
  async function requireAdmin(req: FastifyRequest): Promise<AuthPayload | null> {
    const user = extractUser(req, config.jwtSecret);
    if (!user) return null;
    const dbUser = await userStore.findUserById(user.userId);
    if (!dbUser?.isAdmin) return null;
    return user;
  }

  function registerRoutes(app: FastifyInstance) {
    // --- Cards Management ---

    // List all card sets and their counts
    app.get('/admin/cards/sets', async (req, reply) => {
      const admin = await requireAdmin(req);
      if (!admin) return reply.code(403).send({ error: 'Admin access required' });

      const sets: Record<string, { count: number; types: Record<string, number> }> = {};
      const files = getCardFiles();

      for (const file of files) {
        const cards = readCardFile(file);
        for (const card of cards) {
          const setName = card.set || 'unknown';
          if (!sets[setName]) sets[setName] = { count: 0, types: {} };
          sets[setName].count++;
          sets[setName].types[card.type] = (sets[setName].types[card.type] || 0) + 1;
        }
      }

      return reply.send({ sets });
    });

    // List cards with optional filters
    app.get<{ Querystring: { set?: string; type?: string; search?: string } }>(
      '/admin/cards',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        const query = req.query as any;
        const files = getCardFiles();
        let allCards: any[] = [];

        for (const file of files) {
          const cards = readCardFile(file);
          allCards = allCards.concat(cards.map((c: any) => ({ ...c, _file: path.basename(file) })));
        }

        if (query.set) {
          allCards = allCards.filter((c: any) => c.set === query.set);
        }
        if (query.type) {
          allCards = allCards.filter((c: any) => c.type === query.type);
        }
        if (query.search) {
          const s = query.search.toLowerCase();
          allCards = allCards.filter((c: any) =>
            c.name.toLowerCase().includes(s) || c.id.toLowerCase().includes(s)
          );
        }

        return reply.send({ cards: allCards, total: allCards.length });
      }
    );

    // Get single card
    app.get<{ Params: { cardId: string } }>(
      '/admin/cards/:cardId',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        const { card, file } = findCard(req.params.cardId);
        if (!card) return reply.code(404).send({ error: 'Card not found' });

        return reply.send({ card: { ...card, _file: path.basename(file!) } });
      }
    );

    // Update card
    app.put<{ Params: { cardId: string }; Body: any }>(
      '/admin/cards/:cardId',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        const { card, file, index } = findCard(req.params.cardId);
        if (!card || !file || index === undefined) {
          return reply.code(404).send({ error: 'Card not found' });
        }

        const updates = req.body as any;
        delete updates._file;
        delete updates.id; // Don't allow changing ID

        const cards = readCardFile(file);
        cards[index] = { ...cards[index], ...updates };
        writeCardFile(file, cards);

        return reply.send({ card: cards[index] });
      }
    );

    // Create new card
    app.post<{ Body: any }>('/admin/cards', async (req, reply) => {
      const admin = await requireAdmin(req);
      if (!admin) return reply.code(403).send({ error: 'Admin access required' });

      const card = req.body as any;
      if (!card.id || !card.name || !card.type || !card.deck) {
        return reply.code(400).send({ error: 'id, name, type, deck are required' });
      }

      // Check duplicate
      const existing = findCard(card.id);
      if (existing.card) {
        return reply.code(409).send({ error: 'Card ID already exists' });
      }

      // Determine target file by card type
      const fileMap: Record<string, string> = {
        MONSTER: 'monsters.json',
        EQUIPMENT: 'equipment.json',
        ONE_SHOT: 'oneshots.json',
        CURSE: 'curses.json',
        RACE: 'races.json',
        CLASS: 'classes.json',
        MODIFIER: 'modifiers.json',
        SPECIAL: 'special.json',
      };
      const targetFile = fileMap[card.type] || 'special.json';
      const filePath = path.join(config.cardDataDir, targetFile);

      const cards = readCardFile(filePath);
      cards.push(card);
      writeCardFile(filePath, cards);

      return reply.code(201).send({ card });
    });

    // Delete card
    app.delete<{ Params: { cardId: string } }>(
      '/admin/cards/:cardId',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        const { card, file, index } = findCard(req.params.cardId);
        if (!card || !file || index === undefined) {
          return reply.code(404).send({ error: 'Card not found' });
        }

        const cards = readCardFile(file);
        cards.splice(index, 1);
        writeCardFile(file, cards);

        return reply.send({ ok: true });
      }
    );

    // --- Users Management ---

    app.get('/admin/users', async (req, reply) => {
      const admin = await requireAdmin(req);
      if (!admin) return reply.code(403).send({ error: 'Admin access required' });

      const users = await userStore.listUsers();
      return reply.send({
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isAdmin: u.isAdmin || false,
          createdAt: u.createdAt,
        })),
      });
    });

    app.put<{ Params: { userId: string }; Body: { name?: string; isAdmin?: boolean } }>(
      '/admin/users/:userId',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        const body = req.body as any;
        await userStore.updateUser(req.params.userId, {
          name: body.name,
          isAdmin: body.isAdmin,
        });
        return reply.send({ ok: true });
      }
    );

    app.delete<{ Params: { userId: string } }>(
      '/admin/users/:userId',
      async (req, reply) => {
        const admin = await requireAdmin(req);
        if (!admin) return reply.code(403).send({ error: 'Admin access required' });

        if (req.params.userId === admin.userId) {
          return reply.code(400).send({ error: 'Cannot delete yourself' });
        }

        await userStore.deleteUser(req.params.userId);
        return reply.send({ ok: true });
      }
    );

    // --- Sessions / Rooms Monitoring ---

    app.get('/admin/sessions', async (req, reply) => {
      const admin = await requireAdmin(req);
      if (!admin) return reply.code(403).send({ error: 'Admin access required' });

      const rooms = roomStore?.listRooms() || [];
      return reply.send({ sessions: rooms });
    });
  }

  // --- Card file helpers ---

  function getCardFiles(): string[] {
    try {
      return fs.readdirSync(config.cardDataDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(config.cardDataDir, f));
    } catch {
      return [];
    }
  }

  function readCardFile(filePath: string): any[] {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  }

  function writeCardFile(filePath: string, cards: any[]): void {
    fs.writeFileSync(filePath, JSON.stringify(cards, null, 2) + '\n');
  }

  function findCard(cardId: string): { card: any; file: string | null; index: number | undefined } {
    for (const file of getCardFiles()) {
      const cards = readCardFile(file);
      const index = cards.findIndex((c: any) => c.id === cardId);
      if (index !== -1) {
        return { card: cards[index], file, index };
      }
    }
    return { card: null, file: null, index: undefined };
  }

  return { registerRoutes };
}
