# Base image
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runner image
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/.vinxi ./.vinxi

EXPOSE 3000
CMD ["npm", "run", "start"]
