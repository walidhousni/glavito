import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import { NotificationsGateway } from './notifications.gateway'
import { firstValueFrom } from 'rxjs'
import { v4 as uuidv4 } from 'uuid';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  constructor(private readonly http: HttpService, private readonly db: DatabaseService, private readonly gateway: NotificationsGateway) {}

  async list(userId: string, tenantId: string, opts?: { onlyUnread?: boolean }) {
    return this.db.notification.findMany({
      where: { userId, tenantId, ...(opts?.onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async markRead(id: string, userId: string, tenantId: string) {
    await this.db.notification.updateMany({ where: { id, userId, tenantId }, data: { isRead: true } })
    try { this.gateway.emitToUser(userId, 'notification.marked_read', { id }) } catch {}
    return { success: true }
  }

  async markAllRead(userId: string, tenantId: string) {
    await this.db.notification.updateMany({ where: { userId, tenantId, isRead: false }, data: { isRead: true } })
    try { this.gateway.emitToUser(userId, 'notification.marked_all_read', { userId }) } catch {}
    return { success: true }
  }

  async remove(id: string, userId: string, tenantId: string) {
    await this.db.notification.deleteMany({ where: { id, userId, tenantId } })
    try { this.gateway.emitToUser(userId, 'notification.deleted', { id }) } catch {}
    return { success: true }
  }

  async clearAll(userId: string, tenantId: string) {
    await this.db.notification.deleteMany({ where: { userId, tenantId } })
    try { this.gateway.emitToUser(userId, 'notification.cleared_all', { userId }) } catch {}
    return { success: true }
  }

  async getPreferences(userId: string, tenantId: string) {
    const row = await this.db.notificationPreference.findUnique({ where: { tenantId_userId: { tenantId, userId } } })
    return row?.preferences || {}
  }

  async updatePreferences(userId: string, tenantId: string, preferences: Record<string, unknown>) {
    await this.db.notificationPreference.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: { preferences: preferences as any },
      create: { tenantId, userId, preferences: preferences as any },
    })
    try { this.gateway.emitToUser(userId, 'notification.preferences_updated', {}) } catch {}
    return { success: true }
  }

  async notifyAgent(agentId: string, message: string) {
    this.logger.log(`Notify agent ${agentId}: ${message}`)
    try { this.gateway.emitToUser(agentId, 'notification.created', { id: `tmp_${Date.now()}`, title: 'Notification', message, isRead: false, createdAt: new Date().toISOString() }) } catch {}
  }

  async notifyTeam(teamId: string, message: string) {
    this.logger.log(`Notify team ${teamId}: ${message}`)
  }

  async notifyWebhook(url: string, payload: Record<string, unknown>) {
    try {
      await firstValueFrom(this.http.post(url, payload))
    } catch (err) {
      const msg = (err as Error)?.message || String(err)
      this.logger.warn(`Webhook notify failed: ${msg}`)
    }
  }

  async publishNotification(
    type: 'ticket' | 'customer' | 'system' | 'sla' | 'team' | 'conversation',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    userId: string,
    metadata: Record<string, any> = {},
    tenantId: string
  ): Promise<Notification> {
    const notif: Notification = {
      id: uuidv4(),
      type,
      title,
      message,
      priority,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      tenantId,
      metadata,
    };
    await this.db.notification.create({ data: notif });
    this.gateway.emitToUser(userId, 'notification.created', notif);
    // For team/system, emit to tenant room
    if (type === 'team' || type === 'system') {
      this.gateway.emitToRoom(`tenant:${tenantId}`, 'notification.created', notif);
    }
    return notif;
  }
}


