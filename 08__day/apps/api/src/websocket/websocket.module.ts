import { Module, Global } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { RedisSubscriberService } from './redis-subscriber.service';

@Global()
@Module({
  providers: [WebsocketGateway, RedisSubscriberService],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
