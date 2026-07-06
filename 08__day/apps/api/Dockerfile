# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built assets
COPY --from=builder /app/dist ./dist

# Set correct ownership for security
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Health check using native Node 20 fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(res => res.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
