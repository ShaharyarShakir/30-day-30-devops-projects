import { Injectable, Inject, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class LimiterService {
  private readonly logger = new Logger(LimiterService.name);

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  private rateLimitKey(userId: string, event: string): string {
    return `ratelimit:${userId}:${event}`;
  }

  /**
   * Checks if an event is rate limited for a user using Redis for distributed rate limiting.
   * Uses a token bucket algorithm with Lua script for atomic operations.
   * @returns true if rate limited, false if allowed.
   */
  async isRateLimited(
    userId: string,
    event: string,
    limit: number,
    refillRate: number
  ): Promise<boolean> {
    const key = this.rateLimitKey(userId, event);
    const now = Date.now();
    const windowMs = (limit / refillRate) * 1000;

    try {
      // Lua script for atomic token bucket check and update
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local refillRate = tonumber(ARGV[3])
        local windowMs = tonumber(ARGV[4])
        
        local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(data[1])
        local lastRefill = tonumber(data[2])
        
        if not tokens then
          tokens = limit
          lastRefill = now
        end
        
        local elapsedMs = now - lastRefill
        local tokensToAdd = (elapsedMs / 1000) * refillRate
        
        if tokensToAdd > 0 then
          tokens = math.min(limit, tokens + tokensToAdd)
          lastRefill = now
        end
        
        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          redis.call('PEXPIRE', key, windowMs)
          return 0
        end
        
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
        redis.call('PEXPIRE', key, windowMs)
        return 1
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        key,
        now.toString(),
        limit.toString(),
        refillRate.toString(),
        windowMs.toString()
      );

      const isLimited = result === 1;
      
      if (isLimited) {
        this.logger.debug(`Rate limit exceeded for user ${userId} on event ${event}`);
      }
      
      return isLimited;
    } catch (error) {
      this.logger.error(`Rate limit check failed for user ${userId} on event ${event}: ${error.message}`);
      // Fail open - allow the request if Redis fails
      return false;
    }
  }

  /**
   * Checks if a user is rate limited for a specific room.
   * Useful for per-room rate limiting.
   */
  async isRoomRateLimited(
    userId: string,
    roomId: string,
    event: string,
    limit: number,
    refillRate: number
  ): Promise<boolean> {
    const key = this.rateLimitKey(`${userId}:${roomId}`, event);
    const now = Date.now();
    const windowMs = (limit / refillRate) * 1000;

    try {
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local refillRate = tonumber(ARGV[3])
        local windowMs = tonumber(ARGV[4])
        
        local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(data[1])
        local lastRefill = tonumber(data[2])
        
        if not tokens then
          tokens = limit
          lastRefill = now
        end
        
        local elapsedMs = now - lastRefill
        local tokensToAdd = (elapsedMs / 1000) * refillRate
        
        if tokensToAdd > 0 then
          tokens = math.min(limit, tokens + tokensToAdd)
          lastRefill = now
        end
        
        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          redis.call('PEXPIRE', key, windowMs)
          return 0
        end
        
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
        redis.call('PEXPIRE', key, windowMs)
        return 1
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        key,
        now.toString(),
        limit.toString(),
        refillRate.toString(),
        windowMs.toString()
      );

      return result === 1;
    } catch (error) {
      this.logger.error(`Room rate limit check failed for user ${userId} in room ${roomId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Resets the rate limit for a specific user and event.
   * Useful for testing or administrative purposes.
   */
  async resetRateLimit(userId: string, event: string): Promise<void> {
    const key = this.rateLimitKey(userId, event);
    await this.redis.del(key);
  }

  /**
   * Gets the current rate limit status for a user and event.
   */
  async getRateLimitStatus(userId: string, event: string): Promise<{ tokens: number; lastRefill: number } | null> {
    const key = this.rateLimitKey(userId, event);
    const data = await this.redis.hmget(key, "tokens", "lastRefill");
    
    if (!data[0]) return null;
    
    return {
      tokens: parseFloat(data[0]),
      lastRefill: parseFloat(data[1]),
    };
  }
}
