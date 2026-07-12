# Base image
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Builder stage
FROM base AS builder

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ../../
COPY ../../packages/config/package.json ../../packages/config/
COPY ../../packages/shared-ts/package.json ../../packages/shared-ts/
COPY package*.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY . .

# Build
RUN pnpm build

# Runner stage
FROM base AS runner

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ../../
COPY ../../packages/config/package.json ../../packages/config/
COPY ../../packages/shared-ts/package.json ../../packages/shared-ts/
COPY package*.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy build artifacts
COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/.vinxi ./.vinxi
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
