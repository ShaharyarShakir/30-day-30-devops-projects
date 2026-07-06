import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { ProjectsModule } from './projects/projects.module';
import { ContractsModule } from './contracts/contracts.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { QueuesModule } from './queues/queues.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req: any) => ({
          context: 'HTTP',
          request_id: req.id || req.headers['x-request-id'] || req.headers['request-id'],
          user_id: req.user?.id || req.headers['x-user-id'] || req.headers['user-id'],
          project_id: req.params?.projectId || req.headers['x-project-id'] || req.headers['project-id'],
          deployment_id: req.params?.deploymentId || req.headers['x-deployment-id'] || req.headers['deployment-id'],
          trace_id: req.headers['x-trace-id'] || req.headers['trace-id'],
        }),
        genReqId: (req: any) => req.headers['x-request-id'] || req.headers['request-id'] || uuidv4(),
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        autoLoadEntities: true,
        // Schema is owned by infra/docker/postgres/01-schema.sql, not TypeORM --
        // keep synchronize off so the API never tries to auto-migrate the DB.
        synchronize: false,
      }),
    }),

    AuthModule,
    UsersModule,
    WalletsModule,
    ProjectsModule,
    ContractsModule,
    DeploymentsModule,
    QueuesModule,
    WebsocketModule,
    HealthModule,
  ],
})
export class AppModule {}
