import { api as apiClient } from './config';

export interface QuoteLineItem {
  id?: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  total?: number;
  sortOrder?: number;
}

export interface Quote {
  id: string;
  tenantId: string;
  dealId?: string;
  leadId?: string;
  customerId?: string;
  quoteNumber: string;
  title: string;
  description?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  validUntil?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdBy: string;
  assignedTo?: string;
  terms?: string;
  notes?: string;
  templateId?: string;
  pdfUrl?: string;
  signatureRequired: boolean;
  signatureUrl?: string;
  signedAt?: string;
  signedBy?: string;
  version: number;
  parentQuoteId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lineItems?: QuoteLineItem[];
  creator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  assignee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  deal?: any;
  customer?: any;
  template?: any;
  parentQuote?: any;
  revisions?: Quote[];
  activities?: any[];
}

export interface QuoteTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  industry?: string;
  headerHtml?: string;
  footerHtml?: string;
  termsHtml?: string;
  styles: Record<string, any>;
  defaultTerms?: string;
  defaultNotes?: string;
  defaultValidityDays: number;
  isDefault: boolean;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteDto {
  dealId?: string;
  leadId?: string;
  customerId?: string;
  title: string;
  description?: string;
  lineItems: Omit<QuoteLineItem, 'id' | 'total' | 'sortOrder'>[];
  taxRate?: number;
  discountAmount?: number;
  validityDays?: number;
  terms?: string;
  notes?: string;
  templateId?: string;
  signatureRequired?: boolean;
}

export interface UpdateQuoteDto {
  title?: string;
  description?: string;
  lineItems?: Omit<QuoteLineItem, 'id' | 'total' | 'sortOrder'>[];
  taxRate?: number;
  discountAmount?: number;
  validUntil?: Date;
  terms?: string;
  notes?: string;
  status?: string;
}

export interface QuoteStats {
  total: number;
  byStatus: {
    draft: number;
    sent: number;
    viewed: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  totalValue: number;
  acceptedValue: number;
  acceptanceRate: number;
  avgTimeToAccept: number;
}

export const quotesApi = {
  /**
   * Create a new quote
   */
  async createQuote(data: CreateQuoteDto): Promise<Quote> {
    const response = await apiClient.post('/crm/quotes', data);
    return response.data;
  },

  /**
   * Update a quote
   */
  async updateQuote(quoteId: string, data: UpdateQuoteDto): Promise<Quote> {
    const response = await apiClient.put(`/crm/quotes/${quoteId}`, data);
    return response.data;
  },

  /**
   * Create a revision of a quote
   */
  async createRevision(quoteId: string, data: UpdateQuoteDto): Promise<Quote> {
    const response = await apiClient.post(`/crm/quotes/${quoteId}/revisions`, data);
    return response.data;
  },

  /**
   * Send quote to customer
   */
  async sendQuote(quoteId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/crm/quotes/${quoteId}/send`);
    return response.data;
  },

  /**
   * Accept quote
   */
  async acceptQuote(quoteId: string, signedBy?: string): Promise<Quote> {
    const response = await apiClient.post(`/crm/quotes/${quoteId}/accept`, { signedBy });
    return response.data;
  },

  /**
   * Reject quote
   */
  async rejectQuote(quoteId: string, reason?: string): Promise<Quote> {
    const response = await apiClient.post(`/crm/quotes/${quoteId}/reject`, { reason });
    return response.data;
  },

  /**
   * Get quote by ID
   */
  async getQuote(quoteId: string): Promise<Quote> {
    const response = await apiClient.get(`/crm/quotes/${quoteId}`);
    return response.data;
  },

  /**
   * List quotes for tenant
   */
  async listQuotes(filters?: {
    status?: string;
    dealId?: string;
    customerId?: string;
    createdBy?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Quote[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dealId) params.append('dealId', filters.dealId);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    
    const queryString = params.toString();
    const response = await apiClient.get(`/crm/quotes${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  /**
   * Get quote statistics
   */
  async getQuoteStats(): Promise<QuoteStats> {
    const response = await apiClient.get('/crm/quotes/stats/overview');
    return response.data;
  }
};

