import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsModule } from '../contracts/contracts.module';
import { Deployment } from './entities/deployment.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { QueuesModule } from '../queues/queues.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment, Wallet]),
    ContractsModule,
    QueuesModule,
    WebsocketModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
})
export class DeploymentsModule {}
