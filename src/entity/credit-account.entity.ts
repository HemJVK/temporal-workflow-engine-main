import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CreditLedgerEntity } from './credit-ledger.entity';
import { UserEntity } from './user.entity';

@Entity('credit_accounts')
export class CreditAccountEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.creditAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  balance: number;

  @Column({ type: 'varchar', default: 'free' })
  tier: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CreditLedgerEntity, (ledger) => ledger.account)
  ledgers: CreditLedgerEntity[];
}
