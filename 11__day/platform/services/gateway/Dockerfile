# Base Image
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Dependency Stage
FROM base AS dependencies

# Copy package files from workspace root
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY .npmrc ./

# Copy package.json of dependees
COPY packages/config/package.json ./packages/config/
COPY services/gateway/package.json ./services/gateway/

# Install dependencies (development + production)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build Stage
FROM dependencies AS builder

# Copy sources
COPY packages/config/ ./packages/config/
COPY services/gateway/ ./services/gateway/

# Build config package first, then gateway
RUN pnpm --filter @platform/config build
RUN pnpm --filter gateway build

# Production Dependency Stage
FROM base AS prod-dependencies

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY services/gateway/package.json ./services/gateway/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy node_modules and builds
COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY --from=prod-dependencies /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=prod-dependencies /app/services/gateway/node_modules ./services/gateway/node_modules

COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder /app/services/gateway/dist ./services/gateway/dist
COPY --from=builder /app/services/gateway/package.json ./services/gateway/package.json

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "services/gateway/dist/main.js"]
