import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditAccountEntity } from './credit-account.entity';

@Entity('credit_ledger')
export class CreditLedgerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => CreditAccountEntity, (account) => account.ledgers)
  @JoinColumn({ name: 'accountId' })
  account: CreditAccountEntity;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  amount: number;

  @Column({ type: 'varchar' })
  type: 'USAGE' | 'GRANT' | 'REFUND' | 'PURCHASE';

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
