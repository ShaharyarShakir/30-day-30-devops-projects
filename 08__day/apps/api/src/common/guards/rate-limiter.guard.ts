import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private redis: Redis;

  constructor(private dataSource: DataSource) {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
    this.redis = new Redis(redisUrl);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Identify by organization ID, or fall back to client IP address
    const identity = request.org?.id || request.headers['x-organization-id'] || request.ip;

    const limit = 100; // Allow 100 requests per minute
    const windowSeconds = 60;
    const redisKey = `ratelimit:${identity}`;

    const currentRequests = await this.redis.incr(redisKey);

    if (currentRequests === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }

    if (currentRequests > limit) {
      throw new HttpException(
        'Too Many Requests. Rate limit exceeded.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Billing foundation: track the API request usage metric
    const orgId = request.org?.id || request.headers['x-organization-id'];
    if (orgId && orgId !== 'api-key-user') {
      this.dataSource.query(
        `INSERT INTO usage_records (organization_id, metric, quantity)
         VALUES ($1, 'api_requests', 1)`,
        [orgId],
      ).catch(() => {});
    }

    return true;
  }
}
