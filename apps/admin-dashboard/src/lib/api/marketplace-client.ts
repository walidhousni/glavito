import api from './config';

export interface MarketplaceItem {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  isPremium: boolean;
  priceCents?: number;
  rating: number;
  ratingCount: number;
  installCount: number;
  vendorName: string;
  vendorUrl?: string;
  repoUrl?: string;
  iconUrl?: string;
  screenshots: unknown;
  metadata: unknown;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  authorName: string;
  createdAt: string;
}

export interface ExtendedMarketplaceItem extends MarketplaceItem {
  reviews?: Review[];
}

export const marketplaceApi = {
  async list(params?: { search?: string; category?: string; tag?: string; type?: string; premium?: boolean; sort?: string; page?: number; limit?: number }) {
    const res = await api.get('/marketplace', { params });
    // Handle response structure: { data: [...], meta: {...}, pagination: {...} }
    return (res.data?.data || res.data || []) as MarketplaceItem[];
  },
  async get(slug: string) {
    const res = await api.get(`/marketplace/${slug}`);
    return res.data as MarketplaceItem;
  },
  async listInstalled() {
    const res = await api.get('/marketplace/installed/list');
    // Handle response structure: { data: [...], meta: {...}, pagination: {...} }
    return (res.data?.data || res.data || []) as any[];
  },
  async install(slug: string, configuration?: Record<string, unknown>) {
    const res = await api.post(`/marketplace/${slug}/install`, { configuration });
    return res.data as any;
  },
  async seedDemo() {
    const res = await api.post('/marketplace/seed/demo');
    return res.data as any;
  },
  async updateInstallation(id: string, updates: { status?: 'installed' | 'enabled' | 'disabled'; configuration?: Record<string, unknown> }) {
    const res = await api.patch(`/marketplace/installed/${id}`, updates);
    return res.data as any;
  },
  async uninstall(id: string) {
    const res = await api.delete(`/marketplace/installed/${id}`);
    return res.data as any;
  },
  async addReview(slug: string, rating: number, comment?: string) {
    const res = await api.post(`/marketplace/${slug}/reviews`, { rating, comment });
    return res.data as any;
  },
  async getReviews(slug: string) {
    const res = await api.get(`/marketplace/${slug}/reviews`);
    return res.data as Review[];
  },
  async postReview(slug: string, rating: number, comment?: string) {
    const res = await api.post(`/marketplace/${slug}/reviews`, { rating, comment });
    return res.data as Review;
  },
  async getItemDetails(slug: string) {
    const res = await api.get(`/marketplace/${slug}`);
    return res.data as ExtendedMarketplaceItem;
  },
};


