import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from '../../contracts/entities/contract.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

export type DeploymentStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'verifying'
  | 'succeeded'
  | 'failed'
  | 'rolled_back';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column()
  network: string;

  @Column({ default: 'queued' })
  status: DeploymentStatus;

  @Column({ type: 'varchar', name: 'contract_address', nullable: true })
  contractAddress: string | null;

  @Column({ name: 'verification_status', default: 'unverified' })
  verificationStatus: VerificationStatus;

  @Column({ type: 'uuid', name: 'previous_deployment_id', nullable: true })
  previousDeploymentId: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
