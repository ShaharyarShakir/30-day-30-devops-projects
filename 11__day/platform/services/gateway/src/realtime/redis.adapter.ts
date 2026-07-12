import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
import { INestApplicationContext } from "@nestjs/common";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly configService: ConfigService
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>("REDIS_HOST") || "127.0.0.1";
    const port = this.configService.get<number>("REDIS_PORT") || 6379;

    const pubClient = new Redis({ host, port });
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
