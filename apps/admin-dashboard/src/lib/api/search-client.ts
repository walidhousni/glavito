import api from './config';

export class SearchApiClient {
  async federated(q: string) {
    const { data } = await api.get('/search/federated', { params: { q } });
    // Server returns: { results: Array<{ id, type, title, ... }>, totalCount, searchTime, suggestions }
    // Map it to { tickets, customers, knowledge: { articles, faqs } } expected by the UI
    const payload: any = (data && (data.data ?? data)) ?? {};
    const results: any[] = Array.isArray(payload.results) ? payload.results : [];

    const tickets = results
      .filter((r) => r?.type === 'ticket')
      .map((r) => ({ id: r.id, subject: r.title }));

    const customers = results
      .filter((r) => r?.type === 'customer')
      .map((r) => ({
        id: r.id,
        // We only reliably have title and some metadata; expose email/company if available
        firstName: undefined as string | undefined,
        lastName: undefined as string | undefined,
        email: r?.metadata?.email ?? undefined,
        company: r?.metadata?.company ?? undefined,
      }));

    const articles = results
      .filter((r) => r?.type === 'knowledge')
      .map((r) => ({ id: r.id, title: r.title }));

    const faqs: any[] = [];

    return { tickets, customers, knowledge: { articles, faqs } } as {
      tickets: Array<{ id: string; subject?: string }>;
      customers: Array<{ id: string; firstName?: string; lastName?: string; email?: string; company?: string }>;
      knowledge: { articles: Array<{ id: string; title: string }>; faqs: Array<{ id: string; title: string }> };
    };
  }
}

export const searchApi = new SearchApiClient();


