import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CreditAccountEntity } from './credit-account.entity';

/**
 * This entity MUST mirror the backend's User entity exactly.
 * Both services share the same database with synchronize: true,
 * so any missing columns here will be DROPPED by TypeORM on engine startup.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ nullable: true, unique: true })
  sso_id: string;

  @Column({ nullable: true, unique: true })
  phone_number: string;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ default: false })
  is_admin: boolean;

  @Column({ default: false })
  is_email_verified: boolean;

  @Column({ default: false })
  is_phone_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  otp_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at: Date | null;

  @Column({ default: false })
  has_seen_tutorial: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => CreditAccountEntity, (account) => account.user)
  creditAccounts: CreditAccountEntity[];
}
