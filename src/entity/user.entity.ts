import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CreditAccountEntity } from './credit-account.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  email: string;

  @OneToMany(() => CreditAccountEntity, (account) => account.user)
  creditAccounts: CreditAccountEntity[];
}
