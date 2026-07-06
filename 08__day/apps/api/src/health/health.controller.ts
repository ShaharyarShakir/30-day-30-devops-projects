import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue('build.queue') private readonly buildQueue: Queue,
  ) {}

  @Get()
  async getHealth() {
    const dbHealthy = await this.checkDb();
    const redisHealthy = await this.checkRedis();
    const isHealthy = dbHealthy && redisHealthy;

    const healthReport = {
      status: isHealthy ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      details: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(healthReport);
    }

    return healthReport;
  }

  @Get('ready')
  async getReady() {
    return this.getHealth();
  }

  @Get('live')
  getLive() {
    return { status: 'alive' };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const client = await this.buildQueue.client;
      const res = await (client as any).ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
