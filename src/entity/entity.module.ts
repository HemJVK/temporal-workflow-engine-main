import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRun } from './workflow-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRun])],
  providers: [],
  exports: [TypeOrmModule],
})
export class EntityModule {}
