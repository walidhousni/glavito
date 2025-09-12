import api from './config';

export interface KBSearchResult {
  articles: Array<{ id: string; title: string; snippet: string; tags?: string[]; updatedAt?: string }>;
  faqs: Array<{ id: string; question: string; answer: string; updatedAt?: string }>;
}

// Safely unwrap API responses that may be nested under a `data` property
function hasDataProp(obj: unknown): obj is { data?: unknown } {
  return typeof obj === 'object' && obj !== null && 'data' in (obj as Record<string, unknown>);
}

function unwrap<T>(payload: unknown, fallback: T): T {
  const first = hasDataProp(payload) ? payload.data : payload;
  if (first == null) return fallback;
  const second = hasDataProp(first) ? first.data : first;
  return (second as T) ?? fallback;
}

export const knowledgeApi = {
  async search(q: string, limit = 10, opts?: { semantic?: boolean }) {
    const { data } = await api.get('/knowledge/search', { params: { q, limit, semantic: opts?.semantic } });
    const res = unwrap<KBSearchResult>(data, { articles: [], faqs: [] });
    return {
      articles: Array.isArray(res.articles) ? res.articles : [],
      faqs: Array.isArray(res.faqs) ? res.faqs : [],
    };
  },
  async suggest(text: string) {
    const { data } = await api.get('/knowledge/suggest', { params: { text } });
    return data as { articles: KBSearchResult['articles']; faqs: KBSearchResult['faqs'] };
  },
  async getArticle(id: string) {
    const { data } = await api.get(`/knowledge/articles/${id}`);
    return unwrap<{ id: string; title: string; content: string }>(data, { id, title: '', content: '' });
  },
  async getFaq(id: string) {
    const { data } = await api.get(`/knowledge/faqs/${id}`);
    return data as { id: string; title: string; content: string };
  },
  async generateFromTicket(ticketId: string) {
    const { data } = await api.get(`/knowledge/generate/from-ticket/${ticketId}`);
    return data as { id: string; title: string; content: string; isPublished: boolean };
  },
  async listArticles(params?: { q?: string; page?: number; pageSize?: number }) {
    const { data } = await api.get('/knowledge/articles', { params });
    type ListArticlesEnvelope = { items?: unknown; total?: number; page?: number; pageSize?: number };
    const fallback: ListArticlesEnvelope = { items: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 };
    const res = unwrap<ListArticlesEnvelope>(data, fallback);
    const items = Array.isArray(res.items)
      ? (res.items as { id: string; title: string; tags: string[]; isPublished: boolean; updatedAt: string }[])
      : [];
    return {
      items,
      total: typeof res.total === 'number' ? res.total : 0,
      page: typeof res.page === 'number' ? res.page : (params?.page ?? 1),
      pageSize: typeof res.pageSize === 'number' ? res.pageSize : (params?.pageSize ?? 10),
    };
  },
  async createArticle(payload: { title: string; content: string; tags?: string[]; category?: string; publish?: boolean }) {
    const { data } = await api.post('/knowledge/articles', payload);
    return unwrap<{ id: string }>(data, { id: '' });
  },
  async updateArticle(id: string, payload: { title?: string; content?: string; tags?: string[]; category?: string }) {
    const { data } = await api.patch(`/knowledge/articles/${id}`, payload);
    return unwrap<{ id: string }>(data, { id });
  },
  async publishArticle(id: string, publish: boolean) {
    const { data } = await api.post(`/knowledge/articles/${id}/publish`, { publish });
    return unwrap<{ id: string; isPublished: boolean }>(data, { id, isPublished: publish });
  },
  async deleteArticle(id: string) {
    const { data } = await api.delete(`/knowledge/articles/${id}`);
    return unwrap<{ id: string }>(data, { id });
  },
  async related(id: string) {
    const { data } = await api.get(`/knowledge/articles/${id}/related`);
    const res = unwrap<unknown>(data, []);
    return Array.isArray(res) ? res as { id: string; title: string; snippet: string }[] : [];
  },
  // graph
  async listEntities(q?: string) {
    const { data } = await api.get('/knowledge/entities', { params: { q } });
    return data as Array<{ id: string; type: string; name: string; aliases: string[] }>;
  },
  async linkArticles(sourceId: string, targetId: string, relationType: string, weight?: number) {
    const { data } = await api.post('/knowledge/relations/article-article', { sourceId, targetId, relationType, weight });
    return data as { id: string };
  },
  async linkArticleEntity(articleId: string, entityId: string, relationType: string, weight?: number) {
    const { data } = await api.post('/knowledge/relations/article-entity', { articleId, entityId, relationType, weight });
    return data as { id: string };
  },
  async listRelations(articleId?: string) {
    const { data } = await api.get('/knowledge/relations', { params: { articleId } });
    return data as Array<{ id: string; relationType: string; sourceArticleId?: string; targetArticleId?: string; sourceEntityId?: string; targetEntityId?: string; weight?: number }>;
  },
  // versions & approvals
  async listVersions(articleId: string) {
    const { data } = await api.get(`/knowledge/articles/${articleId}/versions`);
    return data as Array<{ id: string; version: number; title: string; createdAt: string; createdById: string }>;
  },
  async listApprovals(status?: string) {
    const { data } = await api.get('/knowledge/approvals', { params: { status } });
    return data as Array<{ id: string; articleId: string; status: string; createdAt: string }>;
  },
  async requestApproval(articleId: string, comments?: string) {
    const { data } = await api.post('/knowledge/approvals', { articleId, comments });
    return data as { id: string };
  },
  async decideApproval(id: string, approve: boolean, comments?: string) {
    const { data } = await api.post(`/knowledge/approvals/${id}/decide`, { approve, comments });
    return data as { id: string; status: string };
  },
  // analytics & maintenance
  async analyticsOverview(days = 30) {
    const { data } = await api.get('/knowledge/analytics/overview', { params: { days } });
    type AnalyticsOverviewEnvelope = {
      totals?: { totalViews?: number; totalHelpful?: number };
      helpfulRate?: number;
      trending?: Array<{ id: string; title: string; views: number; helpful: number }>;
    };
    const res = unwrap<AnalyticsOverviewEnvelope>(data, { totals: { totalViews: 0, totalHelpful: 0 }, helpfulRate: 0, trending: [] });
    return {
      totals: {
        totalViews: typeof res?.totals?.totalViews === 'number' ? res.totals.totalViews : 0,
        totalHelpful: typeof res?.totals?.totalHelpful === 'number' ? res.totals.totalHelpful : 0,
      },
      helpfulRate: typeof res?.helpfulRate === 'number' ? res.helpfulRate : 0,
      trending: Array.isArray(res?.trending) ? res.trending : [],
    } as { totals: { totalViews: number; totalHelpful: number }; helpfulRate: number; trending: Array<{ id: string; title: string; views: number; helpful: number }> };
  },
  async maintenanceOutdated(params?: { thresholdDays?: number; minHelpfulRate?: number; minViews?: number }) {
    const { data } = await api.get('/knowledge/maintenance/outdated', { params });
    const res = unwrap<unknown>(data, []);
    return Array.isArray(res) ? res as Array<{ id: string; title: string; lastReviewedAt?: string; updatedAt: string }> : [];
  },
  async maintenanceMarkReviewed(id: string, nextReviewAt?: string) {
    const { data } = await api.post(`/knowledge/maintenance/${id}/reviewed`, { nextReviewAt });
    return unwrap<{ id: string }>(data, { id });
  },
};


