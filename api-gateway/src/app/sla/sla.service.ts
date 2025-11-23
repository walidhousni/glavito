import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@glavito/shared-database';
import { 
  CreateSLAPolicyDto, 
  UpdateSLAPolicyDto, 
  SLAQueryDto, 
  TicketEventDto, 
  SLAStatus
} from './dto/sla.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsGateway } from '../tickets/tickets.gateway';

@Injectable()
export class SLAService {
  private readonly logger = new Logger(SLAService.name);

  constructor(private readonly prisma: PrismaService, private readonly notificationsService: NotificationsService, private readonly gateway: TicketsGateway) {}

  async createPolicy(dto: CreateSLAPolicyDto & { tenantId?: string }) {
    return this.prisma.sLAPolicy.create({
      data: {
        tenantId: dto.tenantId || '', // This should be passed from the controller
        name: dto.name,
        description: dto.description,
        priority: dto.priority as any,
        conditions: dto.conditions as any,
        targets: dto.targets as any,
        businessHours: dto.businessHours as any,
        holidays: dto.holidays as any,
        escalationRules: dto.escalationRules as any,
        notifications: dto.notifications as any,
        metadata: dto.metadata as any,
        isActive: true,
      },
    });
  }

  async updatePolicy(id: string, dto: UpdateSLAPolicyDto, tenantId?: string) {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return this.prisma.sLAPolicy.update({
      where,
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority as any,
        conditions: dto.conditions as any,
        targets: dto.targets as any,
        businessHours: dto.businessHours as any,
        holidays: dto.holidays as any,
        escalationRules: dto.escalationRules as any,
        notifications: dto.notifications as any,
        isActive: dto.isActive,
        metadata: dto.metadata as any,
      },
    });
  }

  async getPolicies(query: SLAQueryDto) {
    const where: any = {};
    
    if (query.priority) {
      where.priority = query.priority;
    }
    
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    return this.prisma.sLAPolicy.findMany({
      where,
      skip: (query.page - 1) * query.limit || 0,
      take: query.limit || 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPolicy(id: string) {
    return this.prisma.sLAPolicy.findUnique({
      where: { id },
    });
  }

  async deletePolicy(id: string) {
    return this.prisma.sLAPolicy.delete({
      where: { id },
    });
  }

  async createInstance(slaId: string, ticketId: string) {
    const policy = await this.prisma.sLAPolicy.findUnique({
      where: { id: slaId },
    });

    if (!policy) {
      throw new Error(`SLA Policy ${slaId} not found`);
    }

    const now = new Date();
    const targets = (policy.targets as unknown) as { responseTime?: number; resolutionTime?: number } | null;
    const businessHours = (policy.businessHours as unknown) as any | undefined;
    const holidays = (policy.holidays as unknown) as string[] | undefined;

    const firstResponseDue = this.calculateDueDate(now, { time: Number(targets?.responseTime ?? 60), unit: 'minutes' }, businessHours, holidays);
    const resolutionDue = this.calculateDueDate(now, { time: Number(targets?.resolutionTime ?? 240), unit: 'minutes' }, businessHours, holidays);

    return this.prisma.sLAInstance.create({
      data: {
        slaId,
        ticketId,
        status: SLAStatus.ACTIVE,
        firstResponseDue,
        resolutionDue,
        pausedDuration: 0,
        breachCount: 0,
        escalationLevel: 0,
        notifications: [],
        metadata: {},
      },
    });
  }

  async updateInstance(id: string, updates: any) {
    return this.prisma.sLAInstance.update({
      where: { id },
      data: updates,
    });
  }

  async getInstance(id: string) {
    return this.prisma.sLAInstance.findUnique({
      where: { id },
      include: {
        slaPolicy: true,
      },
    });
  }

  async getInstances(query: SLAQueryDto) {
    const where: any = {};
    
    if (query.slaId) {
      where.slaId = query.slaId;
    }
    
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.sLAInstance.findMany({
      where,
      skip: (query.page - 1) * query.limit || 0,
      take: query.limit || 20,
      orderBy: { createdAt: 'desc' },
      include: {
        slaPolicy: true,
      },
    });
  }

  async handleTicketEvent(ticketId: string, event: TicketEventDto) {
    const instance = await this.prisma.sLAInstance.findFirst({
      where: { 
        ticketId, 
        status: { not: SLAStatus.COMPLETED } 
      },
    });

    if (!instance) {
      this.logger.warn(`No active SLA instance found for ticket ${ticketId}`);
      return;
    }

    const updates: any = {};

    const evt = (event as any)?.type || (event as any)?.event || '';
    switch (evt) {
      case 'first_response':
        updates.firstResponseAt = event.timestamp || new Date();
        break;
      case 'resolution':
        updates.resolutionAt = event.timestamp || new Date();
        updates.status = SLAStatus.COMPLETED;
        break;
      case 'pause':
        updates.status = SLAStatus.PAUSED;
        break;
      case 'resume':
        updates.status = SLAStatus.ACTIVE;
        break;
    }

    return this.prisma.sLAInstance.update({
      where: { id: instance.id },
      data: updates,
    });
  }

  /**
   * Handle SLA event by SLA Instance ID (used by controller route /sla/instances/:id/events)
   */
  async handleTicketEventByInstanceId(instanceId: string, event: TicketEventDto) {
    const instance = await this.prisma.sLAInstance.findUnique({ where: { id: instanceId } });
    if (!instance) {
      this.logger.warn(`SLA Instance not found: ${instanceId}`);
      return;
    }

    const updates: any = {};
    const evt = (event as any)?.type || (event as any)?.event || '';
    switch (evt) {
      case 'first_response':
        updates.firstResponseAt = event.timestamp || new Date();
        break;
      case 'resolution':
        updates.resolutionAt = event.timestamp || new Date();
        updates.status = SLAStatus.COMPLETED;
        break;
      case 'pause':
        updates.status = SLAStatus.PAUSED;
        break;
      case 'resume':
        updates.status = SLAStatus.ACTIVE;
        break;
    }

    return this.prisma.sLAInstance.update({ where: { id: instanceId }, data: updates });
  }

  async getSLAInstanceByTicket(ticketId: string) {
    return this.prisma.sLAInstance.findFirst({
      where: { ticketId },
      include: {
        slaPolicy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPolicyByTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenant: {
          include: {
            slaPolicies: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const policies = (ticket as any).tenant?.slaPolicies?.filter((policy: any) => policy?.isActive) || [];
    
    if (policies.length === 0) {
      return null;
    }

    for (const policy of policies) {
      if (this.matchesConditions(ticket, policy.conditions)) {
        return policy;
      }
    }

    return policies[0];
  }

  async getMetrics(query: SLAQueryDto) {
    const where: any = {};
    
    if ((query as any).startDate || (query as any).endDate) {
      where.createdAt = {};
      if ((query as any).startDate) where.createdAt.gte = new Date((query as any).startDate);
      if ((query as any).endDate) where.createdAt.lte = new Date((query as any).endDate);
    }

    const [
      totalSLAs,
      activeSLAs,
      breachedSLAs,
      instances,
    ] = await Promise.all([
      this.prisma.sLAPolicy.count(),
      this.prisma.sLAPolicy.count({ where: { isActive: true } }),
      this.prisma.sLAInstance.count({ where: { status: SLAStatus.BREACHED } }),
      this.prisma.sLAInstance.findMany({
        where,
        include: {
          slaPolicy: true,
        },
      }),
    ]);

    let totalFirstResponseTime = 0;
    let totalResolutionTime = 0;
    let completedInstances = 0;
    let firstResponseCompliant = 0;
    let resolutionCompliant = 0;

    instances.forEach(instance => {
      if (instance.firstResponseAt) {
        const responseTime = (instance.firstResponseAt.getTime() - instance.createdAt.getTime()) / (1000 * 60);
        totalFirstResponseTime += responseTime;
        
        if (instance.firstResponseDue && instance.firstResponseAt <= instance.firstResponseDue) {
          firstResponseCompliant++;
        }
      }

      if (instance.resolutionAt) {
        const resolutionTime = (instance.resolutionAt.getTime() - instance.createdAt.getTime()) / (1000 * 60);
        totalResolutionTime += resolutionTime;
        completedInstances++;
        
        if (instance.resolutionDue && instance.resolutionAt <= instance.resolutionDue) {
          resolutionCompliant++;
        }
      }
    });

    return {
      totalSLAs,
      activeSLAs,
      breachedSLAs,
      averageFirstResponseTime: completedInstances > 0 ? totalFirstResponseTime / completedInstances : 0,
      averageResolutionTime: completedInstances > 0 ? totalResolutionTime / completedInstances : 0,
      firstResponseCompliance: instances.length > 0 ? (firstResponseCompliant / instances.length) * 100 : 0,
      resolutionCompliance: completedInstances > 0 ? (resolutionCompliant / completedInstances) * 100 : 0,
      breachTrends: [],
    } as any;
  }

  async checkSLABreaches() {
    const now = new Date();
    
    const instances = await this.prisma.sLAInstance.findMany({
      where: {
        status: SLAStatus.ACTIVE,
        OR: [
          { firstResponseDue: { lt: now } },
          { resolutionDue: { lt: now } },
        ],
      },
      include: {
        slaPolicy: true,
        ticket: {
          include: {
            assignedAgent: true, // To get agent for notification
          },
        },
      },
    });

    const updates = await Promise.all(instances.map(async (instance) => {
      const breaches = [];
      
      if (instance.firstResponseDue && instance.firstResponseDue < now && !instance.firstResponseAt) {
        breaches.push('first_response_breach');
      }
      
      if (instance.resolutionDue && instance.resolutionDue < now && !instance.resolutionAt) {
        breaches.push('resolution_breach');
      }

      if (breaches.length > 0) {
        // Escalate if first breach
        const newEscalationLevel = instance.escalationLevel + 1;
        
        // Push to notifications log
        const notificationLog = [...(instance.notifications || []), {
          type: 'breach',
          timestamp: now,
          breaches,
          escalatedTo: newEscalationLevel,
        }];

        // If we have NotificationsService (inject if not), notify agent
        if (this.notificationsService && instance.ticket?.assignedAgentId) {
          try {
            await this.notificationsService.publishNotification(
              'sla',
              `SLA Breach on Ticket ${instance.ticketId}`,
              `Ticket has breached SLA: ${breaches.join(', ')}. Escalated to level ${newEscalationLevel}.`,
              'high',
              instance.ticket.assignedAgentId,
              { ticketId: instance.ticketId, slaId: instance.slaId },
              instance.ticket.tenantId // Assume ticket has tenantId
            );
          } catch (err) {
            this.logger.warn(`Failed to notify on SLA breach: ${err}`);
          }
        }

        // Broadcast via gateway
        try {
          this.gateway.broadcastSlaBreach(instance.ticketId, { breaches, level: newEscalationLevel }, instance.ticket.tenantId);
        } catch (err) {
          this.logger.warn(`Failed to broadcast SLA breach: ${err}`);
        }

        return this.prisma.sLAInstance.update({
          where: { id: instance.id },
          data: {
            breachCount: { increment: breaches.length },
            status: SLAStatus.BREACHED,
            escalationLevel: newEscalationLevel,
            notifications: notificationLog,
          },
        });
      }
      
      return null;
    }));

    // Filter out nulls if needed
    return updates.filter(Boolean);
  }

  // Run every minute to detect breaches and record notifications
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledBreachMonitor() {
    try {
      await this.checkSLABreaches();
    } catch (err) {
      this.logger.error('SLA breach monitor failed', err as any);
    }
  }

  private calculateDueDate(
    startDate: Date,
    target: { time: number; unit: string },
    businessHours?: any,
    holidays?: string[]
  ): Date {
    const dueDate = new Date(startDate);
    
    switch (target.unit) {
      case 'minutes':
        dueDate.setMinutes(dueDate.getMinutes() + target.time);
        break;
      case 'hours':
        dueDate.setHours(dueDate.getHours() + target.time);
        break;
      case 'days':
        dueDate.setDate(dueDate.getDate() + target.time);
        break;
    }

    return dueDate;
  }

  private matchesConditions(ticket: any, conditions: any[]): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }
    
    // AND logic: all conditions must match
    return conditions.every(condition => {
      const { field, operator, value } = condition || {};
      if (!field || !operator) return false;
      
      let ticketValue = this.getTicketValue(ticket, field);
      if (ticketValue === undefined) return false;
      
      switch (operator) {
        case 'equals':
        case '==':
          return ticketValue === value;
        case 'contains':
          return String(ticketValue).toLowerCase().includes(String(value).toLowerCase());
        case 'in':
          return Array.isArray(value) && value.includes(ticketValue);
        case 'has':
          return Array.isArray(ticketValue) && ticketValue.includes(value);
        default:
          return false;
      }
    });
  }

  private getTicketValue(ticket: any, field: string): any {
    // Handle dotted notation, e.g., 'customer.email'
    const parts = field.split('.');
    let value = ticket;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    return value;
  }
}
  