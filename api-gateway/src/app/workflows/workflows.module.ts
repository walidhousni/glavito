import { Module } from '@nestjs/common';
import { WorkflowModule } from '@glavito/shared-workflow';
import { WorkflowsController } from './workflows.controller';
import { WorkflowEventHandler } from './workflow-event.handler';

@Module({
  imports: [
    WorkflowModule.forFeature()
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowEventHandler],
  exports: [WorkflowEventHandler]
})
export class WorkflowsModule {}