import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateQuoteDto {
  dealId?: string;
  leadId?: string;
  customerId?: string;
  title: string;
  description?: string;
  lineItems: QuoteLineItemInput[];
  taxRate?: number;
  discountAmount?: number;
  validityDays?: number;
  terms?: string;
  notes?: string;
  templateId?: string;
  signatureRequired?: boolean;
}

export interface QuoteLineItemInput {
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface UpdateQuoteDto {
  title?: string;
  description?: string;
  lineItems?: QuoteLineItemInput[];
  taxRate?: number;
  discountAmount?: number;
  validUntil?: Date;
  terms?: string;
  notes?: string;
  status?: string;
}

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate unique quote number
   */
  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find last quote number for this tenant
    const lastQuote = await this.db.quote.findFirst({
      where: {
        tenantId,
        quoteNumber: {
          startsWith: `Q-${year}${month}-`
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true }
    });

    let sequence = 1;
    if (lastQuote) {
      const parts = lastQuote.quoteNumber.split('-');
      const lastSequence = parseInt(parts[2] || '0');
      sequence = lastSequence + 1;
    }

    return `Q-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Calculate quote totals
   */
  private calculateTotals(
    lineItems: QuoteLineItemInput[],
    overallTaxRate: number = 0,
    discountAmount: number = 0
  ): {
    subtotal: Decimal;
    taxAmount: Decimal;
    total: Decimal;
  } {
    let subtotal = new Decimal(0);

    // Calculate line item totals
    for (const item of lineItems) {
      const itemSubtotal = new Decimal(item.unitPrice).times(item.quantity);
      const itemDiscount = new Decimal(item.discount || 0);
      const itemTotal = itemSubtotal.minus(itemDiscount);
      subtotal = subtotal.plus(itemTotal);
    }

    // Apply overall discount
    const discountDec = new Decimal(discountAmount);
    subtotal = subtotal.minus(discountDec);

    // Calculate tax
    const taxAmount = subtotal.times(overallTaxRate);

    // Calculate total
    const total = subtotal.plus(taxAmount);

    return {
      subtotal,
      taxAmount,
      total
    };
  }

  /**
   * Create a new quote
   */
  async createQuote(tenantId: string, userId: string, data: CreateQuoteDto) {
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    // Get template if provided
    let template = null;
    if (data.templateId) {
      template = await this.db.quoteTemplate.findUnique({
        where: { id: data.templateId }
      });
    }

    // Calculate totals
    const { subtotal, taxAmount, total } = this.calculateTotals(
      data.lineItems,
      data.taxRate || 0,
      data.discountAmount || 0
    );

    // Calculate validity date
    const validityDays = data.validityDays || template?.defaultValidityDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Create quote
    const quote = await this.db.quote.create({
      data: {
        tenantId,
        dealId: data.dealId,
        leadId: data.leadId,
        customerId: data.customerId,
        quoteNumber,
        title: data.title,
        description: data.description,
        subtotal,
        taxRate: data.taxRate || 0,
        taxAmount,
        discountAmount: data.discountAmount || 0,
        total,
        currency: 'USD', // TODO: Make configurable
        status: 'DRAFT',
        validUntil,
        createdBy: userId,
        terms: data.terms || template?.defaultTerms,
        notes: data.notes || template?.defaultNotes,
        templateId: data.templateId,
        signatureRequired: data.signatureRequired || false,
        lineItems: {
          create: data.lineItems.map((item, index) => {
            const itemSubtotal = new Decimal(item.unitPrice).times(item.quantity);
            const itemDiscount = new Decimal(item.discount || 0);
            const itemTotal = itemSubtotal.minus(itemDiscount);

            return {
              productId: item.productId,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              taxRate: item.taxRate || 0,
              total: itemTotal,
              sortOrder: index
            };
          })
        },
        activities: {
          create: {
            userId,
            type: 'CREATED',
            description: `Quote ${quoteNumber} created`,
            metadata: {}
          }
        }
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: { product: true }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        deal: true,
        customer: true,
        template: true
      }
    });

    this.logger.log(`Created quote ${quoteNumber} for tenant ${tenantId}`);

    return quote;
  }

  /**
   * Update an existing quote
   */
  async updateQuote(quoteId: string, userId: string, data: UpdateQuoteDto) {
    const existingQuote = await this.db.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: true }
    });

    if (!existingQuote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    // Can only update draft quotes
    if (existingQuote.status !== 'DRAFT') {
      throw new Error('Can only update draft quotes. Create a revision instead.');
    }

    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.validUntil) updateData.validUntil = data.validUntil;
    if (data.status) updateData.status = data.status;

    // Recalculate totals if line items or rates changed
    if (data.lineItems || data.taxRate !== undefined || data.discountAmount !== undefined) {
      const lineItems = data.lineItems || existingQuote.lineItems.map(item => ({
        productId: item.productId || undefined,
        name: item.name,
        description: item.description || undefined,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        discount: parseFloat(item.discount.toString()),
        taxRate: item.taxRate
      }));

      const { subtotal, taxAmount, total } = this.calculateTotals(
        lineItems,
        data.taxRate ?? existingQuote.taxRate,
        data.discountAmount ?? parseFloat(existingQuote.discountAmount.toString())
      );

      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.total = total;

      if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
      if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount;

      // Update line items
      if (data.lineItems) {
        // Delete existing line items
        await this.db.quoteLineItem.deleteMany({
          where: { quoteId }
        });

        // Create new line items
        updateData.lineItems = {
          create: data.lineItems.map((item, index) => {
            const itemSubtotal = new Decimal(item.unitPrice).times(item.quantity);
            const itemDiscount = new Decimal(item.discount || 0);
            const itemTotal = itemSubtotal.minus(itemDiscount);

            return {
              productId: item.productId,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              taxRate: item.taxRate || 0,
              total: itemTotal,
              sortOrder: index
            };
          })
        };
      }
    }

    // Add activity
    updateData.activities = {
      create: {
        userId,
        type: 'REVISED',
        description: 'Quote updated',
        metadata: { changes: Object.keys(data) }
      }
    };

    const quote = await this.db.quote.update({
      where: { id: quoteId },
      data: updateData,
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: { product: true }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        deal: true,
        customer: true,
        template: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: true }
        }
      }
    });

    this.logger.log(`Updated quote ${quote.quoteNumber}`);

    return quote;
  }

  /**
   * Create a revision of an existing quote
   */
  async createRevision(quoteId: string, userId: string, data: UpdateQuoteDto) {
    const parentQuote = await this.db.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!parentQuote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    // Create new quote as a revision
    const createData: CreateQuoteDto = {
      dealId: parentQuote.dealId || undefined,
      leadId: parentQuote.leadId || undefined,
      customerId: parentQuote.customerId || undefined,
      title: data.title || parentQuote.title,
      description: data.description !== undefined ? data.description : parentQuote.description || undefined,
      lineItems: data.lineItems || parentQuote.lineItems.map(item => ({
        productId: item.productId || undefined,
        name: item.name,
        description: item.description || undefined,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        discount: parseFloat(item.discount.toString()),
        taxRate: item.taxRate
      })),
      taxRate: data.taxRate !== undefined ? data.taxRate : parentQuote.taxRate,
      discountAmount: data.discountAmount !== undefined ? data.discountAmount : parseFloat(parentQuote.discountAmount.toString()),
      terms: data.terms !== undefined ? data.terms : parentQuote.terms || undefined,
      notes: data.notes !== undefined ? data.notes : parentQuote.notes || undefined,
      templateId: parentQuote.templateId || undefined,
      signatureRequired: parentQuote.signatureRequired
    };

    const revision = await this.createQuote(parentQuote.tenantId, userId, createData);

    // Link to parent
    await this.db.quote.update({
      where: { id: revision.id },
      data: {
        parentQuoteId: quoteId,
        version: parentQuote.version + 1
      }
    });

    // Add activity to parent
    await this.db.quoteActivity.create({
      data: {
        quoteId: parentQuote.id,
        userId,
        type: 'REVISED',
        description: `Revision created: ${revision.quoteNumber}`
      }
    });

    this.logger.log(`Created revision ${revision.quoteNumber} from ${parentQuote.quoteNumber}`);

    return revision;
  }

  /**
   * Send quote to customer
   */
  async sendQuote(quoteId: string, userId: string) {
    const quote = await this.db.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        deal: {
          include: { customer: true }
        }
      }
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    // Update status
    await this.db.quote.update({
      where: { id: quoteId },
      data: {
        status: 'SENT',
        activities: {
          create: {
            userId,
            type: 'SENT',
            description: 'Quote sent to customer',
            metadata: { sentAt: new Date() }
          }
        }
      }
    });

    // TODO: Send email to customer with quote PDF

    this.logger.log(`Sent quote ${quote.quoteNumber}`);

    return { success: true, message: 'Quote sent successfully' };
  }

  /**
   * Accept quote
   */
  async acceptQuote(quoteId: string, userId?: string, signedBy?: string) {
    const quote = await this.db.quote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        signedBy,
        signedAt: signedBy ? new Date() : null,
        activities: {
          create: {
            userId,
            type: 'ACCEPTED',
            description: 'Quote accepted',
            metadata: { acceptedAt: new Date(), signedBy }
          }
        }
      },
      include: {
        deal: true,
        lineItems: true
      }
    });

    // If linked to a deal, update deal value
    if (quote.dealId) {
      await this.db.deal.update({
        where: { id: quote.dealId },
        data: {
          value: quote.total,
          probability: 90 // High probability after quote acceptance
        }
      });
    }

    this.logger.log(`Quote ${quote.quoteNumber} accepted`);

    return quote;
  }

  /**
   * Reject quote
   */
  async rejectQuote(quoteId: string, reason?: string, userId?: string) {
    const quote = await this.db.quote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        activities: {
          create: {
            userId,
            type: 'REJECTED',
            description: reason || 'Quote rejected',
            metadata: { rejectedAt: new Date(), reason }
          }
        }
      }
    });

    this.logger.log(`Quote ${quote.quoteNumber} rejected`);

    return quote;
  }

  /**
   * Get quote by ID
   */
  async getQuote(quoteId: string) {
    const quote = await this.db.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: { product: true }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        deal: true,
        customer: true,
        template: true,
        parentQuote: true,
        revisions: {
          orderBy: { version: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    return quote;
  }

  /**
   * List quotes for a tenant
   */
  async listQuotes(
    tenantId: string,
    filters?: {
      status?: string;
      dealId?: string;
      customerId?: string;
      createdBy?: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {
    const where: any = { tenantId };

    if (filters?.status) where.status = filters.status;
    if (filters?.dealId) where.dealId = filters.dealId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.createdBy) where.createdBy = filters.createdBy;
    
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const quotes = await this.db.quote.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        deal: {
          select: {
            id: true,
            name: true,
            stage: true
          }
        },
        _count: {
          select: {
            lineItems: true,
            activities: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return quotes;
  }

  /**
   * Get quote statistics for a tenant
   */
  async getQuoteStats(tenantId: string) {
    const quotes = await this.db.quote.findMany({
      where: { tenantId },
      select: {
        status: true,
        total: true,
        createdAt: true,
        acceptedAt: true
      }
    });

    const stats = {
      total: quotes.length,
      byStatus: {
        draft: 0,
        sent: 0,
        viewed: 0,
        accepted: 0,
        rejected: 0,
        expired: 0
      },
      totalValue: new Decimal(0),
      acceptedValue: new Decimal(0),
      acceptanceRate: 0,
      avgTimeToAccept: 0
    };

    let totalTimeToAccept = 0;
    let acceptedCount = 0;

    for (const quote of quotes) {
      // Count by status
      const status = quote.status.toLowerCase();
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      }

      // Calculate values
      stats.totalValue = stats.totalValue.plus(quote.total);
      
      if (quote.status === 'ACCEPTED') {
        stats.acceptedValue = stats.acceptedValue.plus(quote.total);
        acceptedCount++;

        // Calculate time to accept
        if (quote.acceptedAt) {
          const timeToAccept = quote.acceptedAt.getTime() - quote.createdAt.getTime();
          totalTimeToAccept += timeToAccept;
        }
      }
    }

    // Calculate acceptance rate
    const sentQuotes = quotes.filter(q => ['SENT', 'VIEWED', 'ACCEPTED', 'REJECTED'].includes(q.status)).length;
    if (sentQuotes > 0) {
      stats.acceptanceRate = (acceptedCount / sentQuotes) * 100;
    }

    // Calculate average time to accept (in days)
    if (acceptedCount > 0) {
      stats.avgTimeToAccept = Math.round((totalTimeToAccept / acceptedCount) / (1000 * 60 * 60 * 24));
    }

    return {
      ...stats,
      totalValue: parseFloat(stats.totalValue.toString()),
      acceptedValue: parseFloat(stats.acceptedValue.toString()),
      acceptanceRate: Math.round(stats.acceptanceRate * 100) / 100
    };
  }
}

