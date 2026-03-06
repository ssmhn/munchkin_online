FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
COPY packages/data/package.json packages/data/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/game-engine/node_modules ./packages/game-engine/node_modules
COPY --from=deps /app/packages/data/node_modules ./packages/data/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY . .
RUN pnpm turbo run build --filter=@munchkin/server...

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/packages/server/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@munchkin/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@munchkin/shared/
COPY --from=builder /app/packages/game-engine/dist ./node_modules/@munchkin/game-engine/dist
COPY --from=builder /app/packages/game-engine/package.json ./node_modules/@munchkin/game-engine/
COPY --from=builder /app/packages/data/dist ./node_modules/@munchkin/data/dist
COPY --from=builder /app/packages/data/package.json ./node_modules/@munchkin/data/

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
