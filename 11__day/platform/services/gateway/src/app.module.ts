import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { LoggerModule } from "./logger/logger.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { ProxyModule } from "./proxy/proxy.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        ".env",
        ".env.local",
        ".env.development",
        "../../.env",
        "../../.env.development",
        "../../.env.local"
      ]
    }),
    LoggerModule,
    HealthModule,
    AuthModule,
    ProxyModule,
    RealtimeModule
  ]
})
export class AppModule {}
