import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // Nullable: GitHub OAuth users may never set a password.
  // Excluded from serialized responses via the global ClassSerializerInterceptor.
  @Exclude()
  @Column({ type: 'varchar', name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', name: 'github_id', nullable: true, unique: true })
  githubId: string | null;

  @Exclude()
  @Column({ type: 'varchar', name: 'refresh_token_hash', nullable: true })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
