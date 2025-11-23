-- AlterTable
ALTER TABLE "public"."flow_events" ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "public"."flow_runs" ADD COLUMN     "retryAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."workflow_rules" ADD COLUMN     "lastError" TEXT;

-- CreateIndex
CREATE INDEX "flow_events_runId_severity_idx" ON "public"."flow_events"("runId", "severity");

-- CreateIndex
CREATE INDEX "flow_runs_status_retryAt_idx" ON "public"."flow_runs"("status", "retryAt");

-- CreateIndex
CREATE INDEX "workflow_executions_workflowId_status_startedAt_idx" ON "public"."workflow_executions"("workflowId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "workflow_executions_status_startedAt_idx" ON "public"."workflow_executions"("status", "startedAt");
