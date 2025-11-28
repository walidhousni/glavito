import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { EventPublisherService } from '@glavito/shared-kafka';

export interface FlowExecutionContext {
  tenantId: string;
  userId?: string;
  ticketId?: string;
  customerId?: string;
  conversationId?: string;
  variables: Record<string, any>;
}

export interface NodeExecutor {
  canHandle(nodeKind: string): boolean;
  execute(node: any, context: FlowExecutionContext): Promise<any>;
}

@Injectable()
export class FlowExecutionService {
  private readonly logger = new Logger(FlowExecutionService.name);
  private nodeExecutors: NodeExecutor[] = [];
  private readonly MAX_EXECUTION_DEPTH = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService
  ) {}

  registerNodeExecutor(executor: NodeExecutor) {
    this.nodeExecutors.push(executor);
  }

  async executeFlow(
    flowId: string,
    input: Record<string, any>,
    context: Partial<FlowExecutionContext>
  ): Promise<any> {
    const startTime = Date.now();
    
    const flow = await this.prisma['flow'].findUnique({
      where: { id: flowId },
      include: {
        currentVersion: {
          include: {
            nodes: true,
            edges: true,
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    // Use currentVersion if published, otherwise use latest version for testing
    const versionToExecute = flow.currentVersion || flow.versions?.[0];
    
    if (!versionToExecute) {
      throw new Error(`Flow ${flowId} has no version to execute`);
    }

    if (!versionToExecute.nodes || versionToExecute.nodes.length === 0) {
      throw new Error(`Flow ${flowId} has no nodes to execute`);
    }

    // Create flow run
    const run = await this.prisma['flowRun'].create({
      data: {
        flowId: flow.id,
        versionId: versionToExecute.id,
        tenantId: flow.tenantId,
        status: 'running',
        input,
        context: {
          tenantId: flow.tenantId,
          ...context,
          startTime: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Starting flow execution: ${flow.name} (${run.id}) - Version ${versionToExecute.version}`);

    try {
      const executionContext: FlowExecutionContext = {
        tenantId: flow.tenantId,
        userId: context.userId,
        ticketId: context.ticketId,
        customerId: context.customerId,
        conversationId: context.conversationId,
        variables: { ...input },
      };

      // Execute flow
      const output = await this.executeNodes(
        versionToExecute.nodes,
        versionToExecute.edges,
        executionContext,
        run.id
      );

      // Update run as completed
      await this.prisma['flowRun'].update({
        where: { id: run.id },
        data: {
          status: 'completed',
          output,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });

      await this.publishFlowEvent('flow.completed', flow.tenantId, {
        flowId: flow.id,
        runId: run.id,
        output,
      });

      return output;
    } catch (error: any) {
      this.logger.error(`Flow execution failed: ${error.message}`, error.stack);

      await this.prisma['flowRun'].update({
        where: { id: run.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      await this.publishFlowEvent('flow.failed', flow.tenantId, {
        flowId: flow.id,
        runId: run.id,
        error: error.message,
      });

      throw error;
    }
  }

  private async executeNodes(
    nodes: any[],
    edges: any[],
    context: FlowExecutionContext,
    runId: string
  ): Promise<any> {
    // Find start node
    const startNode = nodes.find((n) => n.kind === 'channel_in' || n.kind === 'start');
    if (!startNode) {
      throw new Error('No start node found');
    }

    return this.executeNodeRecursive(startNode, nodes, edges, context, runId, new Set());
  }

  private async executeNodeRecursive(
    currentNode: any,
    allNodes: any[],
    allEdges: any[],
    context: FlowExecutionContext,
    runId: string,
    visited: Set<string>,
    depth = 0
  ): Promise<any> {
    // Check execution depth to prevent infinite loops
    if (depth >= this.MAX_EXECUTION_DEPTH) {
      const error = `Max execution depth ${this.MAX_EXECUTION_DEPTH} reached at node ${currentNode.key}`;
      this.logger.error(error);
      await this.logFlowEvent(runId, currentNode.key, 'error', error);
      throw new Error(error);
    }

    if (visited.has(currentNode.key)) {
      this.logger.warn(`Circular reference detected at node ${currentNode.key}`);
      await this.logFlowEvent(runId, currentNode.key, 'warning', 'Circular reference detected');
      return null;
    }
    visited.add(currentNode.key);

    // Log node entry
    await this.logFlowEvent(runId, currentNode.key, 'node_enter', 'Entering node');

    try {
      // Execute node
      const executor = this.nodeExecutors.find((ex) => ex.canHandle(currentNode.kind));
      if (!executor) {
        throw new Error(`No executor found for node kind: ${currentNode.kind}`);
      }

      const result = await executor.execute(currentNode, context);

      // Log node exit
      await this.logFlowEvent(runId, currentNode.key, 'node_exit', 'Node executed', result);

      // Handle special nodes
      if (currentNode.kind === 'end') {
        return result;
      }

      if (currentNode.kind === 'condition' || currentNode.kind === 'switch') {
        return this.handleConditionalNode(currentNode, allNodes, allEdges, context, runId, visited, result, depth);
      }

      if (currentNode.kind === 'wait') {
        await this.handleWaitNode(currentNode, runId, context);
        return result;
      }

      // Find next nodes
      const outgoingEdges = allEdges.filter((e) => e.sourceKey === currentNode.key);
      if (outgoingEdges.length === 0) {
        return result; // End of flow
      }

      // Execute next nodes (for now, just follow first edge - can be enhanced for parallel execution)
      const nextNodeKey = outgoingEdges[0].targetKey;
      const nextNode = allNodes.find((n) => n.key === nextNodeKey);
      if (!nextNode) {
        throw new Error(`Next node ${nextNodeKey} not found`);
      }

      return this.executeNodeRecursive(nextNode, allNodes, allEdges, context, runId, visited, depth + 1);
    } catch (error: any) {
      await this.logFlowEvent(runId, currentNode.key, 'error', error.message);
      throw error;
    }
  }

  private handleConditionalNode(
    node: any,
    allNodes: any[],
    allEdges: any[],
    context: FlowExecutionContext,
    runId: string,
    visited: Set<string>,
    conditionResult: any,
    depth: number
  ): Promise<any> {
    // Find edges based on condition result
    const outgoingEdges = allEdges.filter((e) => e.sourceKey === node.key);
    
    let selectedEdge: any;
    if (node.kind === 'condition') {
      // Boolean condition: true/false ports
      selectedEdge = outgoingEdges.find((e) => 
        (conditionResult && e.sourcePort === 'true') || 
        (!conditionResult && e.sourcePort === 'false')
      );
    } else if (node.kind === 'switch') {
      // Switch: multiple output ports
      selectedEdge = outgoingEdges.find((e) => e.sourcePort === String(conditionResult));
    }

    if (!selectedEdge) {
      // Use default edge if exists
      selectedEdge = outgoingEdges.find((e) => e.sourcePort === 'default');
    }

    if (!selectedEdge) {
      throw new Error(`No matching edge found for condition result: ${conditionResult}`);
    }

    const nextNode = allNodes.find((n) => n.key === selectedEdge.targetKey);
    if (!nextNode) {
      throw new Error(`Next node ${selectedEdge.targetKey} not found`);
    }

    return this.executeNodeRecursive(nextNode, allNodes, allEdges, context, runId, visited, depth + 1);
  }

  private async handleWaitNode(node: any, runId: string, context: FlowExecutionContext): Promise<void> {
    const waitConfig = node.config || {};
    const delayMs = waitConfig.delayMs || 0;
    const resumeAt = waitConfig.resumeAt 
      ? new Date(waitConfig.resumeAt) 
      : new Date(Date.now() + delayMs);

    await this.prisma['flowWait'].create({
      data: {
        runId,
        tenantId: context.tenantId,
        nodeId: node.key,
        resumeAt,
        isProcessed: false,
        data: { waitConfig },
      },
    });

    await this.logFlowEvent(runId, node.key, 'wait', `Waiting until ${resumeAt.toISOString()}`);
  }

  private async logFlowEvent(
    runId: string,
    nodeKey: string,
    eventType: string,
    message?: string,
    data?: any
  ): Promise<void> {
    await this.prisma['flowEvent'].create({
      data: {
        runId,
        nodeKey,
        eventType,
        message,
        data: data || {},
      },
    });
  }

  private async publishFlowEvent(eventType: string, tenantId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.eventPublisher.publishWorkflowEvent({
        eventType,
        tenantId,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish flow event: ${errorMessage}`);
    }
  }

  async getFlowRun(runId: string): Promise<any> {
    return this.prisma['flowRun'].findUnique({
      where: { id: runId },
      include: {
        events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  async listFlowRuns(flowId: string, limit = 50): Promise<any[]> {
    return this.prisma['flowRun'].findMany({
      where: { flowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        events: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }
}

