import { Module, DynamicModule, OnModuleInit } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { DatabaseModule } from '@glavito/shared-database'
import { KafkaModule } from '@glavito/shared-kafka'
import { WorkflowService } from './services/workflow.service'
import { WorkflowExecutionService } from './services/workflow-execution.service'
import { WorkflowEngineService } from './services/workflow-engine.service'
import { FlowService } from './services/flow.service'
import { FlowExecutionService } from './services/flow-execution.service'
import { SendMessageNodeExecutor } from './services/node-executors/send-message-executor'
import { ConditionNodeExecutor } from './services/node-executors/condition-executor'
import { TicketNodeExecutor } from './services/node-executors/ticket-executor'
import { BasicNodesExecutor } from './services/node-executors/basic-nodes-executor'
// AI-Powered Executors
import { AIDecisionNodeExecutor } from './services/node-executors/ai-decision-executor'
import { ChurnRiskNodeExecutor } from './services/node-executors/churn-risk-executor'
import { SegmentCheckNodeExecutor } from './services/node-executors/segment-check-executor'
import { AnalyticsTrackerNodeExecutor } from './services/node-executors/analytics-tracker-executor'
import { JourneyTrackerNodeExecutor } from './services/node-executors/journey-tracker-executor'
import { AIAgentNodeExecutor } from './services/node-executors/ai-agent-executor'
import { AIRouteNodeExecutor } from './services/node-executors/ai-route-executor'
import { AIToolCallNodeExecutor } from './services/node-executors/ai-tool-call-executor'
import { AIGuardrailNodeExecutor } from './services/node-executors/ai-guardrail-executor'

export type WorkflowModuleOptions = Record<string, never>

@Module({})
export class WorkflowModule implements OnModuleInit {
  constructor(
    private readonly flowExecutionService: FlowExecutionService,
    // Core Executors
    private readonly sendMessageExecutor: SendMessageNodeExecutor,
    private readonly conditionExecutor: ConditionNodeExecutor,
    private readonly ticketExecutor: TicketNodeExecutor,
    private readonly basicNodesExecutor: BasicNodesExecutor,
    // AI-Powered Executors
    private readonly aiDecisionExecutor: AIDecisionNodeExecutor,
    private readonly churnRiskExecutor: ChurnRiskNodeExecutor,
    private readonly segmentCheckExecutor: SegmentCheckNodeExecutor,
    private readonly analyticsTrackerExecutor: AnalyticsTrackerNodeExecutor,
    private readonly journeyTrackerExecutor: JourneyTrackerNodeExecutor,
    // AI Orchestration
    private readonly aiAgentExecutor: AIAgentNodeExecutor,
    private readonly aiRouteExecutor: AIRouteNodeExecutor,
    private readonly aiToolCallExecutor: AIToolCallNodeExecutor,
    private readonly aiGuardrailExecutor: AIGuardrailNodeExecutor
  ) {}

  onModuleInit() {
    // Register core node executors
    this.flowExecutionService.registerNodeExecutor(this.sendMessageExecutor)
    this.flowExecutionService.registerNodeExecutor(this.conditionExecutor)
    this.flowExecutionService.registerNodeExecutor(this.ticketExecutor)
    this.flowExecutionService.registerNodeExecutor(this.basicNodesExecutor)
    
    // Register AI-powered executors
    this.flowExecutionService.registerNodeExecutor(this.aiDecisionExecutor)
    this.flowExecutionService.registerNodeExecutor(this.churnRiskExecutor)
    this.flowExecutionService.registerNodeExecutor(this.segmentCheckExecutor)
    this.flowExecutionService.registerNodeExecutor(this.analyticsTrackerExecutor)
    this.flowExecutionService.registerNodeExecutor(this.journeyTrackerExecutor)
    // AI Orchestration
    this.flowExecutionService.registerNodeExecutor(this.aiAgentExecutor)
    this.flowExecutionService.registerNodeExecutor(this.aiRouteExecutor)
    this.flowExecutionService.registerNodeExecutor(this.aiToolCallExecutor)
    this.flowExecutionService.registerNodeExecutor(this.aiGuardrailExecutor)
  }

  static forRoot(): DynamicModule {
    return {
      module: WorkflowModule,
      imports: [
        HttpModule,
        DatabaseModule,
        KafkaModule,
      ],
      providers: [
        WorkflowService,
        WorkflowExecutionService,
        WorkflowEngineService,
        FlowService,
        FlowExecutionService,
        // Core Executors
        SendMessageNodeExecutor,
        ConditionNodeExecutor,
        TicketNodeExecutor,
        BasicNodesExecutor,
        // AI-Powered Executors
        AIDecisionNodeExecutor,
        ChurnRiskNodeExecutor,
        SegmentCheckNodeExecutor,
        AnalyticsTrackerNodeExecutor,
        JourneyTrackerNodeExecutor,
        // AI Orchestration
        AIAgentNodeExecutor,
        AIRouteNodeExecutor,
        AIToolCallNodeExecutor,
        AIGuardrailNodeExecutor,
      ],
      exports: [
        WorkflowService,
        WorkflowExecutionService,
        WorkflowEngineService,
        FlowService,
        FlowExecutionService,
      ],
      global: true
    }
  }

  static forFeature(): DynamicModule {
    return {
      module: WorkflowModule,
      imports: [
        HttpModule,
        DatabaseModule,
        KafkaModule,
      ],
      providers: [
        WorkflowService,
        WorkflowExecutionService,
        WorkflowEngineService,
        FlowService,
        FlowExecutionService,
        // Core Executors
        SendMessageNodeExecutor,
        ConditionNodeExecutor,
        TicketNodeExecutor,
        BasicNodesExecutor,
        // AI-Powered Executors
        AIDecisionNodeExecutor,
        ChurnRiskNodeExecutor,
        SegmentCheckNodeExecutor,
        AnalyticsTrackerNodeExecutor,
        JourneyTrackerNodeExecutor,
        // AI Orchestration
        AIAgentNodeExecutor,
        AIRouteNodeExecutor,
        AIToolCallNodeExecutor,
        AIGuardrailNodeExecutor,
      ],
      exports: [
        WorkflowService,
        WorkflowExecutionService,
        WorkflowEngineService,
        FlowService,
        FlowExecutionService,
      ]
    }
  }
}