/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */ // Langchain internal types are dynamic here
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreditAccountEntity } from '../entity/credit-account.entity';
import { ModelPricingEntity } from '../entity/model-pricing.entity';

@Injectable()
export class CreditService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(CreditAccountEntity)
    private readonly creditAccountRep: Repository<CreditAccountEntity>,
    @InjectRepository(ModelPricingEntity)
    private readonly modelPricingRep: Repository<ModelPricingEntity>,
  ) {}

  async checkPreflightBalance(
    userId: string,
    minimumRequired: number,
  ): Promise<boolean> {
    // Credit system disabled for now.
    return true;
  }

  async deductCreditsAtomic(
    userId: string,
    promptTokens: number,
    completionTokens: number,
    modelId: string,
    referenceId?: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    // Credit system disabled for now.
    return { success: true, newBalance: 0 };
  }
}
