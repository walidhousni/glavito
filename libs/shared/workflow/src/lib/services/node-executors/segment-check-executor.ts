import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
import { PrismaService } from '@glavito/shared-database';

/**
 * Segment Check Node Executor
 * 
 * Checks if a customer belongs to specified segments.
 * Useful for targeted campaigns, personalized workflows, and segmentation-based routing.
 * 
 * Output paths:
 * - in_segment: Customer is in at least one of the specified segments
 * - not_in_segment: Customer is not in any of the specified segments
 * - error: Segment check failed
 */
@Injectable()
export class SegmentCheckNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(SegmentCheckNodeExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'segment_check' || nodeKind === 'customer_segment';
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;

    // Validate required data
    if (!context.customerId) {
      this.logger.warn('Segment check requires customerId');
      return {
        outputPath: 'not_in_segment',
        skip: true,
        error: 'No customer ID provided',
      };
    }

    // Get segment IDs or names to check
    const segmentIds = (config['segmentIds'] || []) as string[];
    const segmentNames = (config['segmentNames'] || []) as string[];

    if (segmentIds.length === 0 && segmentNames.length === 0) {
      this.logger.warn('No segments specified for check');
      return {
        outputPath: 'not_in_segment',
        error: 'No segments specified',
      };
    }

    try {
      // Build where clause
      const segmentWhere: Record<string, unknown> = {
        tenantId: context.tenantId,
      };

      if (segmentIds.length > 0) {
        segmentWhere['id'] = { in: segmentIds };
      } else if (segmentNames.length > 0) {
        segmentWhere['name'] = { in: segmentNames };
      }

      // Get segments
      const segments = await this.prisma['customerSegment'].findMany({
        where: segmentWhere,
        select: { id: true, name: true, description: true },
      });

      if (segments.length === 0) {
        this.logger.warn(`No segments found matching criteria`);
        return {
          outputPath: 'not_in_segment',
          error: 'Segments not found',
        };
      }

      // Check if customer is in any of these segments
      const memberships = await this.prisma['customerSegmentMembership'].findMany({
        where: {
          customerId: context.customerId,
          segmentId: { in: segments.map((s: any) => s.id) },
        },
        include: {
          segment: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      const inSegment = memberships.length > 0;
      const matchedSegments = memberships.map((m: any) => ({
        id: m.segment.id,
        name: m.segment.name,
        description: m.segment.description,
      }));

      // Store segment info in context
      context.variables['inSegment'] = inSegment;
      context.variables['matchedSegments'] = matchedSegments;
      context.variables['segmentNames'] = matchedSegments.map((s: any) => s.name);

      // Determine output path
      const outputPath = inSegment ? 'in_segment' : 'not_in_segment';

      // If specific segment routing is configured
      const segmentRouting = config['segmentRouting'];
      if (segmentRouting && Array.isArray(segmentRouting) && inSegment) {
        for (const routing of segmentRouting as Array<{ segmentId?: string; segmentName?: string; outputPath: string }>) {
          const matchesSegment = matchedSegments.some(
            (s: any) => s.id === routing.segmentId || s.name === routing.segmentName
          );
          if (matchesSegment) {
            return {
              outputPath: routing.outputPath,
              inSegment: true,
              matchedSegments,
              routedBySegment: routing.segmentName || routing.segmentId,
            };
          }
        }
      }

      this.logger.log(
        `Segment check for customer ${context.customerId}: ${outputPath} (matched: ${matchedSegments.length})`
      );

      return {
        outputPath,
        inSegment,
        matchedSegments,
        segmentCount: matchedSegments.length,
        checkedSegments: segments.map((s: any) => s.name),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Segment check failed: ${errorMessage}`, errorStack);
      return {
        outputPath: 'error',
        error: errorMessage,
        fallback: true,
      };
    }
  }
}

