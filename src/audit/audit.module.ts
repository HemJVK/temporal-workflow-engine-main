import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditActivity } from './audit.activity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditActivity],
  exports: [AuditActivity],
})
export class AuditModule {}
