import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { WorkerService } from '../src/worker/worker.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { WorkflowDefinition } from '../src/entity/workflow-definition.entity';
import { WorkflowRun } from '../src/entity/workflow-run.entity';
import { CreditAccountEntity } from '../src/entity/credit-account.entity';
import { CreditLedgerEntity } from '../src/entity/credit-ledger.entity';
import { ModelPricingEntity } from '../src/entity/model-pricing.entity';
import { DatabaseModule } from '../src/database/database.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // We override WorkerService so Temporal doesn't actually try to start a worker and connect.
    const mockWorkerService = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onApplicationShutdown: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WorkerService)
      .useValue(mockWorkerService)
      .overrideModule(DatabaseModule)
      .useModule({
        module: class MockDatabaseModule {},
        imports: [
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            entities: [
              WorkflowDefinition,
              WorkflowRun,
              AuditLog,
              CreditAccountEntity,
              CreditLedgerEntity,
              ModelPricingEntity,
            ],
            autoLoadEntities: true,
            synchronize: true,
            dropSchema: true,
          }),
        ],
        providers: [],
        exports: [],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
