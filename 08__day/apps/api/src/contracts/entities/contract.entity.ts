import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ChainFamily } from '../../wallets/entities/wallet.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column()
  name: string;

  @Column({ name: 'chain_family' })
  chainFamily: ChainFamily;

  // 'solidity' | 'rust'
  @Column()
  language: string;

  // Path within the linked repo, or an object storage key if uploaded directly
  @Column({ name: 'source_path' })
  sourcePath: string;

  @Column({ type: 'varchar', name: 'compiler_version', nullable: true })
  compilerVersion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
