import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { RuleEngineService } from './rule-engine.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, RuleEngineService],
  exports: [WorkflowService, RuleEngineService],
})
export class WorkflowModule {}
