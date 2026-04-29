import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { Activity } from '@temporalio/worker/lib/activity';
import { EntityModule } from '../entity/entity.module';

@Module({
  providers: [WorkerService],
  imports: [Activity, EntityModule],
})
export class WorkerModule {}
