import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditService } from './credit.service';
import { CreditGuard } from './credit.guard';
import { CreditCron } from './credit.cron';
import { CreditAccountEntity } from '../entity/credit-account.entity';
import { CreditLedgerEntity } from '../entity/credit-ledger.entity';
import { ModelPricingEntity } from '../entity/model-pricing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditAccountEntity,
      CreditLedgerEntity,
      ModelPricingEntity,
    ])
  ],
  providers: [CreditService, CreditGuard, CreditCron],
  exports: [CreditService, CreditGuard],
})
export class CreditModule {}
