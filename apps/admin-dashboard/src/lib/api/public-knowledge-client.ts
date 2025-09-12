import api from './config'

export const publicKnowledgeApi = {
  async search(tenantId: string | null, q: string, limit = 10) {
    const params = tenantId ? { tenantId, q, limit } : { q, limit }
    const { data } = await api.get('/public/knowledge/search', { params })
    const body = (data && typeof data === 'object' && 'data' in (data as any)) ? (data as any).data : data
    return {
      articles: (body?.articles || []) as Array<{ id: string; title: string; snippet: string }>,
      faqs: (body?.faqs || []) as Array<{ id: string; question: string; answer: string }>,
    }
  },
  async getArticle(tenantId: string | null, id: string) {
    const params = tenantId ? { tenantId } : undefined
    const { data } = await api.get(`/public/knowledge/articles/${id}`, { params })
    const body = (data && typeof data === 'object' && 'data' in (data as any)) ? (data as any).data : data
    return body as { id: string; title: string; content: string }
  },
  async getFaq(tenantId: string | null, id: string) {
    const params = tenantId ? { tenantId } : undefined
    const { data } = await api.get(`/public/knowledge/faqs/${id}`, { params })
    const body = (data && typeof data === 'object' && 'data' in (data as any)) ? (data as any).data : data
    return body as { id: string; title: string; content: string }
  }
}


