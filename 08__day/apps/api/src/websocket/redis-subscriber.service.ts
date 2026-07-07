import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>('redis.host') || 'localhost';
    const port = this.config.get<number>('redis.port') || 6379;

    this.subscriber = new Redis({ host, port });

    await this.subscriber.subscribe('deployment-updates');

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'deployment-updates') {
        try {
          const event = JSON.parse(message);
          const { deploymentId, status, details } = event;
          if (deploymentId && status) {
            this.websocketGateway.emitDeploymentStatus(deploymentId, status, details);
          }
        } catch (err) {
          console.error('Failed to parse Redis Pub/Sub message:', err);
        }
      }
    });

    console.log(`[RedisSubscriber] Subscribed to channel 'deployment-updates' via Redis at ${host}:${port}`);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }
}
