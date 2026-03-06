# Munchkin Online

Multiplayer online card game built with React, Fastify, WebSocket, and PostgreSQL.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Client**: React 18, React Router, Zustand, GSAP, Vite
- **Server**: Fastify, @fastify/websocket, JWT, bcrypt
- **Database**: PostgreSQL (Prisma ORM) + Redis (game state)
- **Testing**: Vitest (unit), Playwright (E2E)

## Project Structure

```
packages/
  shared/       — Shared types (game state, cards, WebSocket protocol)
  game-engine/  — Game logic (combat, equipment, curses, etc.)
  data/         — Card definitions (monsters, equipment, curses, etc.)
  server/       — Fastify HTTP + WebSocket server, auth, lobby, admin API
  client/       — React SPA (game UI, lobby, auth, admin panel)
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
- **Docker** + **Docker Compose** (for PostgreSQL and Redis)

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> munchkin
cd munchkin
pnpm install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432` (user: `munchkin`, password: `munchkin`, db: `munchkin`)
- Redis on `localhost:6379`

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` to any random string:

```
JWT_SECRET=my-dev-secret-change-me
```

The rest of the defaults work for local development.

### 4. Setup database

```bash
pnpm --filter @munchkin/server run db:generate
pnpm --filter @munchkin/server run db:migrate
```

### 5. Build shared packages

```bash
pnpm build
```

### 6. Start development servers

```bash
pnpm dev
```

This starts both the server and client in watch mode:
- **Client**: http://localhost:5173 (Vite dev server)
- **Server**: http://localhost:3000 (Fastify)

The Vite dev server proxies `/auth`, `/lobby`, `/admin` API calls and WebSocket connections to the server automatically.

## Running Tests

### Unit / Integration tests

```bash
pnpm test
```

### E2E tests (Playwright)

```bash
# Install browsers (first time only)
pnpm --filter @munchkin/client exec playwright install

# Run E2E tests
pnpm --filter @munchkin/client run test:e2e
```

## Production Deployment (Docker)

Build and run the full stack with Docker Compose:

```bash
JWT_SECRET=your-production-secret docker compose -f docker-compose.prod.yml up -d --build
```

This starts:
- **Client** (nginx) on port `80`
- **Server** (Node.js) on port `3000`
- **PostgreSQL** and **Redis** as internal services

## Features

- **Auth**: Registration/login with JWT + bcrypt
- **Lobby**: Create/join rooms (public or password-protected)
- **Room**: Admin kick, one-time invite links (5 min TTL)
- **Game**: Full Munchkin card game with real-time WebSocket sync
- **Voice Chat**: WebRTC peer-to-peer voice with mute/speaking indicators
- **Sound Effects**: Procedural audio (Web Audio API, no audio files)
- **Admin Panel**: Card CRUD (filter by set/type), user management, session monitoring
- **Animations**: GSAP-powered combat, card draw, door kick, dice roll, victory screen

## Admin Access

To make a user an admin, update the database directly:

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

Then the "Admin" button will appear in the lobby.
