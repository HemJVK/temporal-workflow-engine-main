import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditAccountEntity } from '../entity/credit-account.entity';
import { CreditLedgerEntity } from '../entity/credit-ledger.entity';

@Injectable()
export class CreditCron {
  private readonly logger = new Logger(CreditCron.name);

  constructor(
    @InjectRepository(CreditAccountEntity)
    private readonly creditAccountRep: Repository<CreditAccountEntity>,
    @InjectRepository(CreditLedgerEntity)
    private readonly creditLedgerRep: Repository<CreditLedgerEntity>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRefresh() {
    this.logger.debug('Starting Daily Credit Refresh for eligible accounts.');

    // Example basic refresh logic: refresh "free" tier accounts back to 10.0 credits
    const accounts = await this.creditAccountRep.find({
      where: { tier: 'free' },
    });

    for (const account of accounts) {
      if (account.balance < 10) {
        const added = 10 - account.balance;
        account.balance = 10;

        await this.creditAccountRep.save(account);

        // Log refresh audit
        const ledger = this.creditLedgerRep.create({
          accountId: account.userId,
          amount: added,
          type: 'GRANT',
          description: 'Daily free-tier credit refresh',
          referenceId: `CRON_REFRESH_${new Date().toISOString()}`,
        });

        await this.creditLedgerRep.save(ledger);
        this.logger.debug(
          `Refreshed account ${account.userId} back to 10 credits.`,
        );
      }
    }
  }
}
