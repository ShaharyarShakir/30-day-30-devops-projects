import { z } from "zod";

export const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  AUTH_URL: z.string().url().default("http://127.0.0.1:5000"),
  USER_URL: z.string().url().default("http://127.0.0.1:5001"),
  COURSE_URL: z.string().url().default("http://127.0.0.1:5002"),
  MEDIA_URL: z.string().url().default("http://127.0.0.1:5003"),
  CHAT_URL: z.string().url().default("http://127.0.0.1:5004"),
  LIVE_SESSION_URL: z.string().url().default("http://127.0.0.1:5005"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  KAFKA_BROKER: z.string().default("localhost:9092"),
  // Realtime Gateway Configuration
  WEBSOCKET_PORT: z.coerce.number().default(4001),
  MAX_MESSAGE_SIZE: z.coerce.number().default(10000),
  MAX_ROOMS_PER_CLIENT: z.coerce.number().default(50),
  MAX_DEVICES_PER_USER: z.coerce.number().default(5),
  IDLE_TIMEOUT_MS: z.coerce.number().default(300000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(30000),
  PING_TIMEOUT_MS: z.coerce.number().default(60000),
  PING_INTERVAL_MS: z.coerce.number().default(25000),
  // Rate Limiting Configuration
  RATE_LIMIT_MESSAGES_PER_MINUTE: z.coerce.number().default(30),
  RATE_LIMIT_TYPING_PER_SECOND: z.coerce.number().default(5),
  RATE_LIMIT_REACTIONS_PER_MINUTE: z.coerce.number().default(300),
  // Kafka Topics
  KAFKA_REALTIME_EVENTS_TOPIC: z.string().default("platform.realtime-events"),
  KAFKA_CHAT_MESSAGES_TOPIC: z.string().default("platform.chat-messages"),
}).refine((data) => data.JWT_SECRET || data.JWT_PUBLIC_KEY, {
  message: "Either JWT_SECRET or JWT_PUBLIC_KEY must be provided",
  path: ["JWT_SECRET"],
});

export type Config = z.infer<typeof configSchema>;

export default () => {
  const env = {
    PORT: process.env.PORT || process.env.GATEWAY_PORT,
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    AUTH_URL: process.env.AUTH_URL || process.env.AUTH_SERVICE_URL,
    USER_URL: process.env.USER_URL || process.env.USER_SERVICE_URL,
    COURSE_URL: process.env.COURSE_URL || process.env.COURSE_SERVICE_URL,
    MEDIA_URL: process.env.MEDIA_URL || process.env.MEDIA_SERVICE_URL,
    CHAT_URL: process.env.CHAT_URL || process.env.CHAT_SERVICE_URL,
    LIVE_SESSION_URL: process.env.LIVE_SESSION_URL || process.env.LIVE_SESSION_SERVICE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    KAFKA_BROKER: process.env.KAFKA_BROKER,
    // Realtime Gateway Configuration
    WEBSOCKET_PORT: process.env.WEBSOCKET_PORT,
    MAX_MESSAGE_SIZE: process.env.MAX_MESSAGE_SIZE,
    MAX_ROOMS_PER_CLIENT: process.env.MAX_ROOMS_PER_CLIENT,
    MAX_DEVICES_PER_USER: process.env.MAX_DEVICES_PER_USER,
    IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS,
    HEARTBEAT_INTERVAL_MS: process.env.HEARTBEAT_INTERVAL_MS,
    PING_TIMEOUT_MS: process.env.PING_TIMEOUT_MS,
    PING_INTERVAL_MS: process.env.PING_INTERVAL_MS,
    // Rate Limiting Configuration
    RATE_LIMIT_MESSAGES_PER_MINUTE: process.env.RATE_LIMIT_MESSAGES_PER_MINUTE,
    RATE_LIMIT_TYPING_PER_SECOND: process.env.RATE_LIMIT_TYPING_PER_SECOND,
    RATE_LIMIT_REACTIONS_PER_MINUTE: process.env.RATE_LIMIT_REACTIONS_PER_MINUTE,
    // Kafka Topics
    KAFKA_REALTIME_EVENTS_TOPIC: process.env.KAFKA_REALTIME_EVENTS_TOPIC,
    KAFKA_CHAT_MESSAGES_TOPIC: process.env.KAFKA_CHAT_MESSAGES_TOPIC,
  };

  const result = configSchema.safeParse(env);
  if (!result.success) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: "gateway",
        level: "error",
        message: "Invalid configuration environment variables",
        errors: result.error.format(),
      })
    );
    throw new Error("Invalid configuration environment variables");
  }
  return result.data;
};
