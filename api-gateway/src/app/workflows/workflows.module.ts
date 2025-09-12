import { Module } from '@nestjs/common'
import { WorkflowModule as SharedWorkflowModule } from '@glavito/shared-workflow'
import { WorkflowsController } from './workflows.controller'
import { WorkflowEventHandler } from './workflow-event.handler'

@Module({
  imports: [
    SharedWorkflowModule.forFeature()
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowEventHandler],
  exports: [WorkflowEventHandler]
})
export class WorkflowsModule {}