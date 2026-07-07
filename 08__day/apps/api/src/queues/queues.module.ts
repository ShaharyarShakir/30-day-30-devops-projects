import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'build.queue' },
      { name: 'deploy.queue' },
      { name: 'verify.queue' },
      { name: 'index.queue' },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
