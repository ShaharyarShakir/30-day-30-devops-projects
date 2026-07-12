import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RedisIoAdapter } from "./realtime/redis.adapter";

async function bootstrap() {
  // Initialize NestJS with Fastify Adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID()
    }),
    { bufferLogs: true }
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 4000;

  // Configure Socket.IO Redis IoAdapter
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const fastifyInstance = app.getHttpAdapter().getInstance() as any;

  // 1. Hook for Request Logging - Start Time
  fastifyInstance.addHook("onRequest", async (request) => {
    (request as any).startTime = Date.now();
  });

  // 2. Hook for Request Logging - Finish Log
  fastifyInstance.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - ((request as any).startTime || Date.now());
    const logData = {
      timestamp: new Date().toISOString(),
      service: "gateway",
      level: reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info",
      requestId: request.id,
      method: request.method,
      path: request.url.split("?")[0],
      status: reply.statusCode,
      duration
    };
    console.log(JSON.stringify(logData));
  });

  // 3. Hook for Request ID propagation back to client in response headers
  fastifyInstance.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });

  // 4. Register CORS
  await fastifyInstance.register(cors as any, {
    origin: true,
    credentials: true
  });

  // 5. Register Helmet
  await fastifyInstance.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, "data:", "validator.swagger.io"],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`]
      }
    }
  });

  // 6. Register Cookie parser
  await fastifyInstance.register(cookie as any, {
    secret: configService.get<string>("JWT_SECRET")
  });

  // 7. Register Compression
  await fastifyInstance.register(compress as any, {
    encodings: ["gzip", "deflate"]
  });

  // 8. Register Rate Limiting
  await fastifyInstance.register(rateLimit as any, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request: any) => (request.headers["x-user-id"] as string) || request.ip
  });

  // 9. Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  // 10. Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 11. Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle("Platform API Gateway")
    .setDescription("Core Ingress Gateway Router API for the microservices platform")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addCookieAuth("token")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Start Gateway
  await app.listen(port, "0.0.0.0");

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "gateway",
      level: "info",
      message: `API Gateway started successfully on port ${port}`
    })
  );
}

bootstrap();
