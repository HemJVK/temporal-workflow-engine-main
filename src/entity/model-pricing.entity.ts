import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('model_pricing')
export class ModelPricingEntity {
  @PrimaryColumn()
  modelId: string;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  inputCostPerMillion: number;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  outputCostPerMillion: number;

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  cacheReadCostPerMillion: number;

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  cacheWriteCostPerMillion: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
