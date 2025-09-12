import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class CollaborationService {
  constructor(private readonly db: DatabaseService) {}

  async listChannels(tenantId: string) {
    return this.db.internalChannel.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, type: true, teamId: true, createdAt: true, updatedAt: true },
    });
  }

  async createChannel(tenantId: string, userId: string, payload: { name: string; type: string; teamId?: string }) {
    if (!payload.name || !payload.type) throw new BadRequestException('name and type are required');
    const channel = await this.db.internalChannel.create({
      data: {
        tenantId,
        name: payload.name,
        type: payload.type,
        teamId: payload.teamId,
        createdById: userId,
      },
      select: { id: true },
    });
    // Auto-join creator
    await this.db.internalChannelParticipant.create({ data: { channelId: channel.id, userId, role: 'owner' } });
    return channel;
  }

  async joinChannel(userId: string, channelId: string) {
    const channel = await this.db.internalChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.db.internalChannelParticipant.upsert({
      where: { channelId_userId: { channelId, userId } as any },
      update: {},
      create: { channelId, userId, role: 'member' },
    });
    return { success: true };
  }

  async listMessages(tenantId: string, channelId: string, limit = 50) {
    // Ensure channel belongs to tenant
    const ch = await this.db.internalChannel.findFirst({ where: { id: channelId, tenantId } });
    if (!ch) throw new NotFoundException('Channel not found');
    const messages = await this.db.internalMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, senderId: true, content: true, mentions: true, createdAt: true },
    });
    return messages.reverse();
  }

  async postMessage(tenantId: string, userId: string, channelId: string, content: string) {
    const ch = await this.db.internalChannel.findFirst({ where: { id: channelId, tenantId } });
    if (!ch) throw new NotFoundException('Channel not found');
    const msg = await this.db.internalMessage.create({
      data: { channelId, senderId: userId, content, mentions: this.extractMentions(content) },
      select: { id: true },
    });
    await this.db.internalChannel.update({ where: { id: channelId }, data: { updatedAt: new Date() } });
    return msg;
  }

  async listUsersForMentions(tenantId: string, q: string) {
    const users = await this.db.user.findMany({
      where: {
        tenantId,
        status: 'active',
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return users.map(u => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, email: u.email }));
  }

  private extractMentions(content: string): string[] {
    const matches = content.match(/@([a-zA-Z0-9_\-.]+)/g) || [];
    return matches.map((m) => m.slice(1));
  }

  // Shifts
  async createShift(
    tenantId: string,
    payload: { teamId?: string; userId?: string; title?: string; startTime: string; endTime: string; timezone?: string }
  ) {
    const start = new Date(payload.startTime);
    const end = new Date(payload.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Invalid shift time range');
    }
    // Optional team/user existence checks could be added
    const shift = await this.db.shift.create({
      data: {
        tenantId,
        teamId: payload.teamId,
        userId: payload.userId,
        title: payload.title,
        startTime: start,
        endTime: end,
        timezone: payload.timezone || 'UTC',
      },
      select: { id: true },
    });
    return shift;
  }

  async listShifts(
    tenantId: string,
    params: { teamId?: string; userId?: string; date?: string }
  ) {
    const where: any = { tenantId };
    if (params.teamId) where.teamId = params.teamId;
    if (params.userId) where.userId = params.userId;
    // If date provided, filter shifts that overlap that date
    if (params.date) {
      const day = new Date(params.date);
      if (!isNaN(day.getTime())) {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        where.AND = [
          { endTime: { gt: dayStart } },
          { startTime: { lt: dayEnd } },
        ];
      }
    }
    return this.db.shift.findMany({
      where,
      orderBy: { startTime: 'asc' },
      select: { id: true, teamId: true, userId: true, title: true, startTime: true, endTime: true, timezone: true },
    });
  }

  async coverageByTeam(tenantId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const shifts = await this.db.shift.findMany({
      where: {
        tenantId,
        endTime: { gt: dayStart },
        startTime: { lt: dayEnd },
      },
      select: { teamId: true, userId: true, startTime: true, endTime: true },
    });
    const map = new Map<string, { teamId: string | null; agents: Set<string>; shifts: number }>();
    for (const s of shifts) {
      const key = s.teamId || 'unassigned';
      const entry = map.get(key) || { teamId: s.teamId || null, agents: new Set<string>(), shifts: 0 };
      if (s.userId) entry.agents.add(s.userId);
      entry.shifts += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).map((v) => ({ teamId: v.teamId, agents: v.agents.size, shifts: v.shifts }));
  }

  // Participants
  async listParticipants(tenantId: string, channelId: string) {
    const channel = await this.db.internalChannel.findFirst({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException('Channel not found');
    const participants = await this.db.internalChannelParticipant.findMany({
      where: { channelId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatar: true, status: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return participants.map((p) => ({ userId: p.userId, role: p.role, user: p.user }));
  }

  async addParticipant(tenantId: string, channelId: string, userId: string, role = 'member') {
    const channel = await this.db.internalChannel.findFirst({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.db.internalChannelParticipant.upsert({
      where: { channelId_userId: { channelId, userId } as any },
      update: { role },
      create: { channelId, userId, role },
    });
    return { success: true };
  }

  async removeParticipant(tenantId: string, channelId: string, userId: string) {
    const channel = await this.db.internalChannel.findFirst({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.db.internalChannelParticipant.delete({ where: { channelId_userId: { channelId, userId } as any } });
    return { success: true };
  }

  // Direct messages (DM)
  async createDM(tenantId: string, currentUserId: string, otherUserId: string) {
    if (currentUserId === otherUserId) throw new BadRequestException('Cannot DM yourself');
    const other = await this.db.user.findFirst({ where: { id: otherUserId, tenantId, status: 'active' } });
    if (!other) throw new NotFoundException('User not found');
    const existing = await this.db.internalChannel.findFirst({
      where: {
        tenantId,
        type: 'dm',
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return existing;
    const ch = await this.db.internalChannel.create({
      data: { tenantId, name: 'DM', type: 'dm', createdById: currentUserId },
      select: { id: true },
    });
    await this.db.internalChannelParticipant.createMany({
      data: [
        { channelId: ch.id, userId: currentUserId, role: 'owner' },
        { channelId: ch.id, userId: otherUserId, role: 'member' },
      ],
    });
    return ch;
  }
}


