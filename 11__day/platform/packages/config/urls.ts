import { PORTS } from "./ports";

export const LOCAL_URLS = {
  frontend: `http://localhost:${PORTS.frontend}`,
  gateway: `http://localhost:${PORTS.gateway}`,
  auth: `http://localhost:${PORTS.auth}`,
  user: `http://localhost:${PORTS.user}`,
  course: `http://localhost:${PORTS.course}`,
  media: `http://localhost:${PORTS.media}`,
  chat: `http://localhost:${PORTS.chat}`,
  notification: `http://localhost:${PORTS.notification}`,
  search: `http://localhost:${PORTS.search}`,

  // Infrastructure Web UIs
  kafkaUi: `http://localhost:${PORTS.kafkaUi}`,
  garageS3: `http://localhost:${PORTS.garageS3}`,
  mailpitUi: `http://localhost:${PORTS.mailpitUi}`,
  prometheus: `http://localhost:${PORTS.prometheus}`,
  grafana: `http://localhost:${PORTS.grafana}`,
  jaegerUi: `http://localhost:${PORTS.jaegerUi}`
} as const;

export const CONTAINER_URLS = {
  postgres: `postgres:${PORTS.postgres}`,
  mongodb: `mongodb:${PORTS.mongodb}`,
  redis: `redis:${PORTS.redis}`,
  kafka: `kafka:${PORTS.kafka}`,
  auth: `http://auth:${PORTS.auth}`,
  gateway: `http://gateway:${PORTS.gateway}`,
  user: `http://user:${PORTS.user}`
} as const;
