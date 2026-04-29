import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRun } from './workflow-run.entity';
import { CreditAccountEntity } from './credit-account.entity';
import { CreditLedgerEntity } from './credit-ledger.entity';
import { ModelPricingEntity } from './model-pricing.entity';
import { UserEntity } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowRun,
      CreditAccountEntity,
      CreditLedgerEntity,
      ModelPricingEntity,
      UserEntity,
    ]),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class EntityModule {}
