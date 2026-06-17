FROM oven/bun:1 AS base

FROM base AS deps
WORKDIR /app

COPY package.json bun.lockb* bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system nodejs && \
    useradd --system --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["bun", "server.js"]