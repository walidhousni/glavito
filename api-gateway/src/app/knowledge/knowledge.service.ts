import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { AIIntelligenceService, VectorStoreService } from '@glavito/shared-ai';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly ai: AIIntelligenceService,
    private readonly vector?: VectorStoreService,
  ) {}

  async search(tenantId: string, q: string, limit = 10, options?: { semantic?: boolean }) {
    const [articles, faqs] = await Promise.all([
      this.db.knowledgeBase.findMany({
        where: {
          tenantId,
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { tags: { hasSome: q.split(/\s+/).slice(0, 5) } },
          ],
        },
        take: limit,
        orderBy: { viewCount: 'desc' },
        select: { id: true, title: true, content: true, tags: true, updatedAt: true, isPublished: true },
      }),
      this.db.faqArticle.findMany({
        where: {
          tenantId,
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: Math.min(5, limit),
        orderBy: { viewCount: 'desc' },
        select: { id: true, title: true, content: true, updatedAt: true },
      }),
    ]);

    const result: { articles: { id: string; title: string; snippet: string; tags: string[]; updatedAt: Date; isPublished: boolean }[]; faqs: { id: string; question: string; answer: string; updatedAt: Date }[] } = {
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        snippet: a.content.slice(0, 200),
        tags: a.tags,
        updatedAt: a.updatedAt,
        isPublished: a.isPublished,
      })),
      faqs: faqs.map((f) => ({ id: f.id, question: f.title, answer: f.content.slice(0, 200), updatedAt: f.updatedAt })),
    };

    // Optional semantic rerank using embeddings (if available)
    if (options?.semantic && q && this.ai.hasOpenAI()) {
      try {
        const qVec = await this.ai.computeEmbedding(q);
        const dot = (a: number[], b: number[]) => a.length && b.length ? a.reduce((s, v, i) => s + v * (b[i] || 0), 0) : 0;
        // naive re-rank by dot product if article has aiEmbedding vector
        const enriched = await this.db.knowledgeBase.findMany({
          where: { tenantId, isPublished: true, id: { in: articles.map((a) => a.id) } },
          select: { id: true, aiEmbedding: true },
        });
        const idToScore = new Map<string, number>();
        enriched.forEach((e) => {
          const vec = Array.isArray((e as unknown as { aiEmbedding?: number[] }).aiEmbedding) ? (e as unknown as { aiEmbedding?: number[] }).aiEmbedding || [] : [];
          idToScore.set(e.id, dot(qVec, vec));
        });
        result.articles.sort((a, b) => (idToScore.get(b.id) || 0) - (idToScore.get(a.id) || 0));
      } catch {
        // ignore semantic rerank errors
      }
    }

    return result;
  }

  async suggest(tenantId: string, content: string) {
    const result = await this.ai.analyzeContent({
      content,
      context: { tenantId },
      analysisTypes: ['knowledge_suggestions'],
    });
    return result.results.knowledgeSuggestions || { articles: [], faqs: [] };
  }

  async getArticle(tenantId: string, id: string) {
    return this.db.knowledgeBase.findFirst({ where: { id, tenantId, isPublished: true } });
  }

  async getFaq(tenantId: string, id: string) {
    return this.db.faqArticle.findFirst({ where: { id, tenantId, isPublished: true } });
  }

  async generateFromTicket(tenantId: string, userId: string, ticketId: string) {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    if (!ticket) throw new Error('Ticket not found');

    const messageText = (ticket.conversations || [])
      .flatMap((c: { messages?: { senderType: string; content: string }[] }) => (c.messages || []))
      .map((m: { senderType: string; content: string }) => `${m.senderType}: ${m.content}`)
      .join('\n');

    const seed = `${ticket.subject || ''}\n\n${ticket.description || ''}\n\nThread:\n${messageText}`.slice(0, 8000);

    const ai = await this.ai.analyzeContent({
      content: seed,
      context: { tenantId },
      analysisTypes: ['entity_extraction', 'response_generation'],
    });

    const suggested = ai.results.responseGeneration?.suggestedResponses?.[0]?.response || '';
    const entities = ai.results.entityExtraction?.entities || [];
    const keyPhrases = ai.results.entityExtraction?.keyPhrases || [];

    const title = ticket.subject || 'Support Article';
    const body = [
      `# ${title}`,
      '',
      '## Problem Description',
      ticket.description || 'N/A',
      '',
      '## Resolution',
      suggested || 'Draft solution. Update with final steps.',
      '',
      '## Notes',
      entities.length ? `Entities: ${entities.map((e: { type: string; value: string }) => `${e.type}:${e.value}`).join(', ')}` : 'N/A',
    ].join('\n');

    const embedding = await this.ai.computeEmbedding(body);
    const created = await this.db.knowledgeBase.create({
      data: {
        tenantId,
        title,
        content: body,
        category: 'auto_generated',
        tags: Array.from(new Set(['generated', 'from_ticket', ...(keyPhrases || [])])).slice(0, 10),
        isPublished: false,
        aiEmbedding: embedding.length ? (embedding as unknown as unknown) : undefined,
      },
    });

    return created;
  }

  async listArticles(tenantId: string, q?: string, page = 1, pageSize = 20) {
    const where: { tenantId: string; OR?: Array<{ title?: any; content?: any; tags?: any }> } = { tenantId };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: q.split(/\s+/).slice(0, 5) } },
      ];
    }
    const [items, total] = await Promise.all([
      this.db.knowledgeBase.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, tags: true, category: true, isPublished: true, updatedAt: true },
      }),
      this.db.knowledgeBase.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createArticle(tenantId: string, userId: string, payload: { title: string; content: string; tags?: string[]; category?: string; publish?: boolean }) {
    const embedding = await this.ai.computeEmbedding(payload.content);
    const created = await this.db.knowledgeBase.create({
      data: {
        tenantId,
        title: payload.title,
        content: payload.content,
        category: payload.category || 'manual',
        tags: payload.tags || [],
        isPublished: !!payload.publish,
        aiEmbedding: embedding.length ? (embedding as unknown as any) : undefined,
      },
    });
    await this.createVersionSnapshot(created.id, payload.title, payload.content, payload.tags || [], userId);
    // Seed vector store (best-effort)
    try {
      await this.vector?.upsert({
        id: created.id,
        tenantId,
        text: `${payload.title}\n${payload.content}`,
        metadata: { title: payload.title, snippet: (payload.content || '').slice(0, 200) },
      });
    } catch {}
    return created;
  }

  async updateArticle(tenantId: string, userId: string, id: string, payload: { title?: string; content?: string; tags?: string[]; category?: string }) {
    const data: any = { ...payload };
    if (typeof payload.content === 'string') {
      const embedding = await this.ai.computeEmbedding(payload.content);
      if (embedding.length) data.aiEmbedding = embedding as unknown as any;
    }
    const updated = await this.db.knowledgeBase.update({ where: { id }, data });
    await this.createVersionSnapshot(id, updated.title, updated.content, updated.tags as string[] || [], userId);
    // Update vector store (best-effort)
    try {
      await this.vector?.upsert({
        id,
        tenantId,
        text: `${updated.title}\n${updated.content}`,
        metadata: { title: updated.title, snippet: (updated.content || '').slice(0, 200) },
      });
    } catch {}
    return updated;
  }

  async publishArticle(tenantId: string, id: string, publish: boolean) {
    return this.db.knowledgeBase.update({ where: { id }, data: { isPublished: publish } });
  }

  async deleteArticle(tenantId: string, id: string) {
    return this.db.knowledgeBase.delete({ where: { id } });
  }

  async relatedArticles(tenantId: string, id: string, limit = 5) {
    const base = await this.db.knowledgeBase.findFirst({ where: { id, tenantId }, select: { aiEmbedding: true, tags: true } });
    if (!base) return [];
    const baseVec = Array.isArray((base as any).aiEmbedding) ? ((base as any).aiEmbedding as number[]) : [];
    const [candidates, relations] = await Promise.all([
      this.db.knowledgeBase.findMany({
        where: { tenantId, isPublished: true, NOT: { id } },
        select: { id: true, title: true, content: true, tags: true, aiEmbedding: true },
        take: 50,
      }),
      // fetch graph relations originating from the base article to boost related results
      this.db.knowledgeRelation.findMany({
        where: { tenantId, OR: [{ sourceArticleId: id }, { targetArticleId: id }] },
        select: { sourceArticleId: true, targetArticleId: true, relationType: true, weight: true },
      })
    ]);
    const relationBoost = new Map<string, number>();
    relations.forEach((r: { sourceArticleId?: string | null; targetArticleId?: string | null; relationType: string; weight?: number | null }) => {
      const otherId = r.sourceArticleId === id ? r.targetArticleId : r.targetArticleId === id ? r.sourceArticleId : undefined;
      if (!otherId) return;
      // base weights per relation type
      const baseWeightByType: Record<string, number> = {
        relates_to: 0.3,
        similar: 0.5,
        duplicates: 0.7,
        solves: 0.6,
        depends_on: 0.2,
        caused_by: 0.2,
        parent_of: 0.25,
        child_of: 0.25,
      };
      const w = (r.weight ?? 0) + (baseWeightByType[r.relationType] ?? 0.2);
      relationBoost.set(otherId, (relationBoost.get(otherId) || 0) + w);
    });
    const dot = (a: number[], b: number[]) => a.length && b.length ? a.reduce((s, v, i) => s + v * (b[i] || 0), 0) : 0;
    const tagOverlap = (a: string[] = [], b: string[] = []) => a.filter(t => b.includes(t)).length;
    const scored = candidates.map((c) => {
      const vec = Array.isArray((c as any).aiEmbedding) ? ((c as any).aiEmbedding as number[]) : [];
      const s = dot(baseVec, vec) + tagOverlap(base.tags as string[], c.tags as string[]) * 0.1 + (relationBoost.get(c.id) || 0);
      return { id: c.id, title: c.title, snippet: c.content.slice(0, 200), score: s };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ score, ...rest }) => rest);
  }

  async publicRecordFeedback(tenantId: string, id: string, helpful: boolean) {
    const inc: any = { viewCount: 1 };
    if (helpful) inc.helpfulCount = 1;
    const updated = await this.db.knowledgeBase.update({ where: { id }, data: { viewCount: { increment: 1 }, helpfulCount: helpful ? { increment: 1 } : undefined } });
    return { viewCount: updated.viewCount, helpfulCount: updated.helpfulCount };
  }

  // Knowledge graph: entities
  async upsertEntity(tenantId: string, payload: { type: string; name: string; aliases?: string[]; metadata?: Record<string, unknown> }) {
    return this.db.knowledgeEntity.upsert({
      where: { tenantId_type_name: { tenantId, type: payload.type, name: payload.name } },
      create: { tenantId, type: payload.type, name: payload.name, aliases: payload.aliases || [], metadata: (payload.metadata || {}) as any },
      update: { aliases: payload.aliases || [], metadata: (payload.metadata || {}) as any },
    });
  }

  async listEntities(tenantId: string, q?: string) {
    return this.db.knowledgeEntity.findMany({
      where: q
        ? {
            tenantId,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { aliases: { hasSome: q.split(/\s+/).slice(0, 5) } },
            ],
          }
        : { tenantId },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Knowledge graph: relations
  async linkArticles(tenantId: string, sourceId: string, targetId: string, relationType: string, weight?: number) {
    return this.db.knowledgeRelation.create({
      data: { tenantId, sourceArticleId: sourceId, targetArticleId: targetId, relationType, weight },
    });
  }

  async linkArticleEntity(tenantId: string, articleId: string, entityId: string, relationType: string, weight?: number) {
    return this.db.knowledgeRelation.create({
      data: { tenantId, sourceArticleId: articleId, targetEntityId: entityId, relationType, weight },
    });
  }

  async listRelations(tenantId: string, articleId?: string) {
    return this.db.knowledgeRelation.findMany({
      where: articleId
        ? { tenantId, OR: [{ sourceArticleId: articleId }, { targetArticleId: articleId }] }
        : { tenantId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Collaborative editing: versions
  async listVersions(articleId: string) {
    return this.db.knowledgeArticleVersion.findMany({ where: { articleId }, orderBy: { version: 'desc' } });
  }

  private async createVersionSnapshot(articleId: string, title: string, content: string, tags: string[], userId: string) {
    const agg = await this.db.knowledgeArticleVersion.aggregate({ where: { articleId }, _max: { version: true } }) as unknown as { _max?: { version?: number } };
    const nextVersion = ((agg && agg._max && typeof agg._max.version === 'number') ? agg._max.version : 0) + 1;
    await this.db.knowledgeArticleVersion.create({
      data: { articleId, version: nextVersion, title, content, tags, createdById: userId },
    });
  }

  // Approvals
  async requestApproval(tenantId: string, articleId: string, requestedById: string, comments?: string) {
    return this.db.knowledgeApprovalRequest.create({
      data: { tenantId, articleId, requestedById, comments },
    });
  }

  async decideApproval(tenantId: string, approvalId: string, reviewerId: string, approve: boolean, comments?: string) {
    return this.db.knowledgeApprovalRequest.update({
      where: { id: approvalId },
      data: { reviewerId, status: approve ? 'approved' : 'rejected', comments, decidedAt: new Date() },
    });
  }

  async listApprovals(tenantId: string, status?: string) {
    return this.db.knowledgeApprovalRequest.findMany({ where: status ? { tenantId, status } : { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  // Usage tracking
  async recordEvent(tenantId: string, articleId: string, eventType: 'view' | 'helpful' | 'not_helpful' | 'copy' | 'share', userId?: string, customerId?: string, metadata?: Record<string, unknown>) {
    await this.db.knowledgeArticleEvent.create({
      data: { tenantId, articleId, userId, customerId, eventType, metadata: (metadata || {}) as any },
    });
    if (eventType === 'view') {
      await this.db.knowledgeBase.update({ where: { id: articleId }, data: { viewCount: { increment: 1 } } });
    } else if (eventType === 'helpful') {
      await this.db.knowledgeBase.update({ where: { id: articleId }, data: { viewCount: { increment: 1 }, helpfulCount: { increment: 1 } } });
    }
    return { ok: true };
  }

  async analyticsOverview(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [articles, events] = await Promise.all([
      this.db.knowledgeBase.findMany({ where: { tenantId }, select: { id: true, title: true, viewCount: true, helpfulCount: true, updatedAt: true, isPublished: true } }),
      this.db.knowledgeArticleEvent.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { articleId: true, eventType: true } }),
    ]);
    const viewsLast = new Map<string, number>();
    const helpfulLast = new Map<string, number>();
    events.forEach((e) => {
      if (e.eventType === 'view') viewsLast.set(e.articleId, (viewsLast.get(e.articleId) || 0) + 1);
      if (e.eventType === 'helpful') helpfulLast.set(e.articleId, (helpfulLast.get(e.articleId) || 0) + 1);
    });
    const totals = articles.reduce(
      (acc, a) => {
        acc.totalViews += a.viewCount || 0;
        acc.totalHelpful += a.helpfulCount || 0;
        return acc;
      },
      { totalViews: 0, totalHelpful: 0 }
    );
    const helpfulRate = totals.totalViews ? totals.totalHelpful / totals.totalViews : 0;
    const trending = [...viewsLast.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => ({ id, title: articles.find((x) => x.id === id)?.title || id, views: v, helpful: helpfulLast.get(id) || 0 }));
    return { totals, helpfulRate, trending };
  }

  // Maintenance
  async findOutdated(tenantId: string, thresholdDays = 90, minHelpfulRate = 0.1, minViews = 20) {
    const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
    const items = await this.db.knowledgeBase.findMany({ where: { tenantId }, select: { id: true, title: true, updatedAt: true, lastReviewedAt: true, viewCount: true, helpfulCount: true, isPublished: true } });
    const candidates = items.filter((a) => {
      const last = a.lastReviewedAt || a.updatedAt;
      const old = !last || last < cutoff;
      const views = a.viewCount || 0;
      const rate = views ? (a.helpfulCount || 0) / views : 0;
      return a.isPublished && old && views >= minViews && rate < minHelpfulRate;
    });
    return candidates.map((c) => ({ id: c.id, title: c.title, lastReviewedAt: c.lastReviewedAt, updatedAt: c.updatedAt }));
  }

  async markReviewed(tenantId: string, articleId: string, nextReviewAt?: Date) {
    return this.db.knowledgeBase.update({ where: { id: articleId }, data: { lastReviewedAt: new Date(), nextReviewAt: nextReviewAt } });
  }
}


