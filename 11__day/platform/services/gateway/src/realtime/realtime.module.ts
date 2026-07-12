import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RealtimeGateway } from "./realtime.gateway";
import { PresenceService } from "./presence.service";
import { LimiterService } from "./limiter.service";
import { KafkaService } from "./kafka.service";
import { MetricsService } from "./metrics.service";

@Module({
  providers: [
    RealtimeGateway,
    PresenceService,
    LimiterService,
    KafkaService,
    MetricsService,
    {
      provide: "REDIS_CLIENT",
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("REDIS_HOST") || "127.0.0.1";
        const port = configService.get<number>("REDIS_PORT") || 6379;
        return new Redis({ host, port });
      },
      inject: [ConfigService],
    },
  ],
  exports: [PresenceService, LimiterService, KafkaService, MetricsService, "REDIS_CLIENT"],
})
export class RealtimeModule {}
