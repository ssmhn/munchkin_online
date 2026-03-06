import type { FastifyInstance } from 'fastify';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

export interface AuthConfig {
  jwtSecret: string;
}

interface UserStore {
  findUserByEmail(email: string): Promise<{ id: string; email: string; name: string; password: string } | null>;
  createUser(data: { email: string; name: string; password: string }): Promise<{ id: string; email: string; name: string }>;
  findUserById(id: string): Promise<{ id: string; email: string; name: string } | null>;
}

const SALT_ROUNDS = 10;

export function createAuthRoutes(config: AuthConfig, userStore: UserStore) {
  function registerRoutes(app: FastifyInstance) {
    // Register
    app.post<{ Body: { email: string; name: string; password: string } }>(
      '/auth/register',
      async (req, reply) => {
        const { email, name, password } = req.body as any;

        if (!email || !name || !password) {
          return reply.code(400).send({ error: 'email, name and password are required' });
        }

        if (password.length < 6) {
          return reply.code(400).send({ error: 'Password must be at least 6 characters' });
        }

        const existing = await userStore.findUserByEmail(email);
        if (existing) {
          return reply.code(409).send({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await userStore.createUser({ email, name, password: hashedPassword });

        const token = jwt.sign(
          { userId: user.id, email: user.email, name: user.name },
          config.jwtSecret,
          { expiresIn: '7d' }
        );

        return reply.code(201).send({
          token,
          user: { id: user.id, email: user.email, name: user.name },
        });
      }
    );

    // Login
    app.post<{ Body: { email: string; password: string } }>(
      '/auth/login',
      async (req, reply) => {
        const { email, password } = req.body as any;

        if (!email || !password) {
          return reply.code(400).send({ error: 'email and password are required' });
        }

        const user = await userStore.findUserByEmail(email);
        if (!user) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email, name: user.name },
          config.jwtSecret,
          { expiresIn: '7d' }
        );

        return reply.send({
          token,
          user: { id: user.id, email: user.email, name: user.name },
        });
      }
    );

    // Get current user (verify token)
    app.get('/auth/me', async (req, reply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Not authenticated' });
      }

      try {
        const payload = jwt.verify(authHeader.slice(7), config.jwtSecret) as {
          userId: string;
          email: string;
          name: string;
        };
        const user = await userStore.findUserById(payload.userId);
        if (!user) {
          return reply.code(401).send({ error: 'User not found' });
        }
        return reply.send({ user: { id: user.id, email: user.email, name: user.name } });
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    });
  }

  return { registerRoutes };
}
