import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLog } from 'src/audit/audit-log.entity';
import { WorkflowDefinition } from 'src/entity/workflow-definition.entity';
import { WorkflowRun } from 'src/entity/workflow-run.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [WorkflowDefinition, WorkflowRun, AuditLog],
        autoLoadEntities: true,
        synchronize: true, // Don't use true in production
      }),
    }),
  ],
})
export class DatabaseModule {}
