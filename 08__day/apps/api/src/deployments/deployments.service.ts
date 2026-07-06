import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ContractsService } from '../contracts/contracts.service';
import { Deployment } from './entities/deployment.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class DeploymentsService {
  constructor(
    @InjectRepository(Deployment) private readonly deployments: Repository<Deployment>,
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectQueue('build.queue') private readonly buildQueue: Queue,
    private readonly contractsService: ContractsService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async create(ownerId: string, dto: CreateDeploymentDto): Promise<Deployment> {
    // 1. Verify contract exists and belongs to owner
    const contract = await this.contractsService.findOneOwned(ownerId, dto.contractId);

    // 2. Select wallet: either user-specified or their default wallet for the contract's chain family
    let walletId = dto.walletId;
    if (!walletId) {
      const defaultWallet = await this.wallets.findOne({
        where: { userId: ownerId, chainFamily: contract.chainFamily, isDefault: true },
      });
      if (!defaultWallet) {
        throw new NotFoundException(`No default wallet found for chain family: ${contract.chainFamily}`);
      }
      walletId = defaultWallet.id;
    } else {
      // Verify wallet exists and belongs to user
      const wallet = await this.wallets.findOne({ where: { id: walletId, userId: ownerId } });
      if (!wallet) {
        throw new NotFoundException('wallet not found or not owned by user');
      }
    }

    // 3. Create deployment entry in DB with 'queued' status
    const deployment = this.deployments.create({
      contractId: contract.id,
      walletId,
      network: dto.network,
      status: 'queued',
      verificationStatus: 'unverified',
    });

    const savedDeployment = await this.deployments.save(deployment);

    // Track usage records for billing (Module 6)
    try {
      const contractRow = await this.deployments.manager.query(
        `SELECT p.organization_id FROM contracts c 
         JOIN projects p ON c.project_id = p.id 
         WHERE c.id = $1`,
        [contract.id],
      );
      const organizationId = contractRow[0]?.organization_id;
      if (organizationId) {
        await this.deployments.manager.query(
          `INSERT INTO usage_records (organization_id, metric, quantity)
           VALUES ($1, 'deployments', 1), ($1, 'build_minutes', 3)`, // Assigning a baseline of 3 build minutes
          [organizationId],
        );
      }
    } catch (err) {
      console.error('[BILLING ERROR] Failed to record usage:', err);
    }

    // 4. Emit WebSocket progress event
    this.websocketGateway.emitDeploymentStatus(savedDeployment.id, 'queued', {
      contractName: contract.name,
      network: dto.network,
    });

    // 5. Add job to build.queue in BullMQ
    await this.buildQueue.add('build-job', {
      deploymentId: savedDeployment.id,
      contractId: contract.id,
      network: dto.network,
      walletId,
      sourcePath: contract.sourcePath,
      language: contract.language,
      compilerVersion: contract.compilerVersion,
    });

    return savedDeployment;
  }

  async list(ownerId: string): Promise<Deployment[]> {
    return this.deployments.find({
      relations: ['contract', 'contract.project'],
      where: {
        contract: {
          project: {
            ownerId,
          },
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOwned(ownerId: string, id: string): Promise<Deployment> {
    const deployment = await this.deployments.findOne({
      where: { id },
      relations: ['contract', 'contract.project', 'wallet'],
    });
    if (!deployment) throw new NotFoundException('deployment not found');
    if (deployment.contract.project.ownerId !== ownerId) {
      throw new ForbiddenException('not your deployment');
    }
    return deployment;
  }

  async historyForContract(ownerId: string, contractId: string): Promise<Deployment[]> {
    await this.contractsService.findOneOwned(ownerId, contractId);
    return this.deployments.find({
      where: { contractId },
      order: { createdAt: 'DESC' },
    });
  }
}
