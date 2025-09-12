import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  constructor(private readonly http: HttpService, private readonly db: DatabaseService) {}

  async list(userId: string, tenantId: string, opts?: { onlyUnread?: boolean }) {
    return this.db.notification.findMany({
      where: { userId, tenantId, ...(opts?.onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async markRead(id: string, userId: string, tenantId: string) {
    await this.db.notification.updateMany({ where: { id, userId, tenantId }, data: { isRead: true } })
    return { success: true }
  }

  async markAllRead(userId: string, tenantId: string) {
    await this.db.notification.updateMany({ where: { userId, tenantId, isRead: false }, data: { isRead: true } })
    return { success: true }
  }

  async remove(id: string, userId: string, tenantId: string) {
    await this.db.notification.deleteMany({ where: { id, userId, tenantId } })
    return { success: true }
  }

  async clearAll(userId: string, tenantId: string) {
    await this.db.notification.deleteMany({ where: { userId, tenantId } })
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
    return { success: true }
  }

  async notifyAgent(agentId: string, message: string) {
    this.logger.log(`Notify agent ${agentId}: ${message}`)
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
}


