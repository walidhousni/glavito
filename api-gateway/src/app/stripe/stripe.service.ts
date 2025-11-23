/**
 * Stripe Payment Integration Service
 * Handles Stripe Connect accounts, payment processing, billing automation, and webhook management
 */

import { Injectable, Logger, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { WalletService } from '../wallet/wallet.service';

export interface StripeAccountSetupRequest {
    email: string;
    country: string;
    businessType: 'individual' | 'company';
    businessProfile?: {
        name?: string;
        url?: string;
        mcc?: string;
        productDescription?: string;
    };
}

export interface PaymentIntentRequest {
    amount: number;
    currency: string;
    customerId?: string;
    description?: string;
    receiptEmail?: string;
    metadata?: Record<string, string>;
}

export interface BillingConfigurationRequest {
    currency: string;
    taxRate?: number;
    invoicePrefix?: string;
    paymentTerms?: number;
    autoCharge?: boolean;
    lateFeeRate?: number;
    reminderDays?: number[];
}

export interface CreateCheckoutSessionArgs {
    customerId?: string;
    lineItems: Array<{
        amount: number;            // minor units
        currency: string;          // 'usd'
        quantity?: number;         // defaults 1
        name?: string;
        description?: string;
    }>;
    metadata?: Record<string, string>; // include campaignId, deliveryId, customerId
    successUrl?: string;
    cancelUrl?: string;
}

export interface StripeAccountInfo {
    id: string;
    email?: string;
    country?: string;
    defaultCurrency?: string;
    businessType?: string;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    requirements: {
        currentlyDue: string[];
        eventuallyDue: string[];
        pastDue: string[];
        pendingVerification: string[];
    };
    capabilities: Record<string, unknown>;
}

export interface PaymentStatus {
    isConfigured: boolean;
    accountId?: string;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: string[];
    errorMessage?: string;
}

export interface PlanDefinition {
    id: string; // slug: starter, pro, enterprise
    name: string;
    stripePriceId: string;
    interval: 'month' | 'year';
    currency: string;
    unitAmount: number; // in minor units
    features: string[];
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripe: Stripe;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        @Inject(forwardRef(() => SubscriptionService))
        private readonly subscriptionService: SubscriptionService,
        @Inject(forwardRef(() => WalletService))
        private readonly walletService: WalletService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
            // Do not crash the whole application if Stripe isn't configured.
            // Provide a descriptive error whenever any Stripe API is used.
            this.logger.warn('Stripe is not configured: STRIPE_SECRET_KEY is missing. Stripe-related features will be disabled until it is set.');
            this.stripe = new Proxy({}, {
                get: () => {
                    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in the environment to enable payment features.');
                },
            }) as unknown as Stripe;
            return;
        }

        this.stripe = new Stripe(secretKey, { typescript: true });
    }

    /**
     * Create Stripe Connect account for tenant
     */
    async createStripeAccount(
        tenantId: string,
        request: StripeAccountSetupRequest
    ): Promise<StripeAccountInfo> {
        try {
            this.logger.log(`Creating Stripe account for tenant: ${tenantId}`);

            // Check if account already exists
            const existingAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (existingAccount) {
                throw new BadRequestException('Stripe account already exists for this tenant');
            }

            // Create Stripe Connect account
            const account = await this.stripe.accounts.create({
                type: 'express',
                email: request.email,
                country: request.country,
                business_type: request.businessType,
                business_profile: request.businessProfile,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'daily',
                        },
                    },
                },
            });

            // Save account to database
            const stripeAccount = await this.databaseService.stripeAccount.create({
                data: {
                    tenantId,
                    stripeAccountId: account.id,
                    email: request.email ?? undefined,
                    country: account.country ?? request.country ?? undefined,
                    defaultCurrency: account.default_currency || 'usd',
                    businessType: (account.business_type ?? request.businessType) as string | undefined,
                    businessProfile: (request.businessProfile || {}) as unknown as Prisma.InputJsonValue,
                    detailsSubmitted: account.details_submitted,
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    requirements: account.requirements as unknown as Prisma.InputJsonValue,
                    capabilities: account.capabilities as unknown as Prisma.InputJsonValue,
                    settings: (account.settings ?? undefined) as unknown as Prisma.InputJsonValue,
                },
            });

            // Emit event for analytics
            this.eventEmitter.emit('stripe.account.created', {
                tenantId,
                accountId: account.id,
                businessType: request.businessType,
                country: request.country,
            });

            return this.mapToAccountInfo(stripeAccount, account);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create Stripe account: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to create Stripe account');
        }
    }

    /**
     * Create account link for onboarding
     */
    async createAccountLink(tenantId: string): Promise<{ url: string; expiresAt: Date }> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount) {
                throw new BadRequestException('Stripe account not found');
            }

            const accountLink = await this.stripe.accountLinks.create({
                account: stripeAccount.stripeAccountId,
                refresh_url: `${this.configService.get('APP_URL')}/onboarding/payment-setup?refresh=true`,
                return_url: `${this.configService.get('APP_URL')}/onboarding/payment-setup?success=true`,
                type: 'account_onboarding',
            });

            return {
                url: accountLink.url,
                expiresAt: new Date(accountLink.expires_at * 1000),
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create account link: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to create account link');
        }
    }

    /**
     * Get Stripe account information
     */
    async getStripeAccount(tenantId: string): Promise<StripeAccountInfo | null> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount) {
                return null;
            }

            // Get latest account info from Stripe
            const account = await this.stripe.accounts.retrieve(stripeAccount.stripeAccountId);

            // Update local record
            await this.databaseService.stripeAccount.update({
                where: { id: stripeAccount.id },
                data: {
                    detailsSubmitted: account.details_submitted,
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    requirements: account.requirements as unknown as Prisma.InputJsonValue,
                    capabilities: account.capabilities as unknown as Prisma.InputJsonValue,
                    settings: (account.settings ?? undefined) as unknown as Prisma.InputJsonValue,
                },
            });

            return this.mapToAccountInfo(stripeAccount, account);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get Stripe account: ${message}`);
            throw new InternalServerErrorException('Failed to get Stripe account');
        }
    }

    /**
     * Create payment intent
     */
    async createPaymentIntent(
        tenantId: string,
        request: PaymentIntentRequest
    ): Promise<{ clientSecret: string; paymentIntentId: string }> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount || !stripeAccount.chargesEnabled) {
                throw new BadRequestException('Stripe account not configured or charges not enabled');
            }

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: request.amount,
                currency: request.currency,
                description: request.description,
                receipt_email: request.receiptEmail,
                metadata: request.metadata || {},
                application_fee_amount: Math.floor(request.amount * 0.029), // 2.9% platform fee
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            // Save payment intent to database
            const paymentIntentRecord = await this.databaseService.paymentIntent.create({
                data: {
                    tenantId,
                    stripeAccountId: stripeAccount.stripeAccountId,
                    stripePaymentId: paymentIntent.id,
                    customerId: request.customerId,
                    amount: request.amount,
                    currency: request.currency,
                    status: paymentIntent.status,
                    description: request.description,
                    receiptEmail: request.receiptEmail,
                    metadata: request.metadata || {},
                    clientSecret: paymentIntent.client_secret,
                },
            });

            // Emit event for analytics
            this.eventEmitter.emit('payment.intent.created', {
                tenantId,
                paymentIntentId: paymentIntentRecord.id,
                amount: request.amount,
                currency: request.currency,
            });

            const clientSecret = paymentIntent.client_secret;
            if (!clientSecret) {
                throw new InternalServerErrorException('Missing client secret from Stripe');
            }
            return {
                clientSecret,
                paymentIntentId: paymentIntentRecord.id,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create payment intent: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to create payment intent');
        }
    }

    /**
     * Setup billing configuration
     */
    async setupBillingConfiguration(
        tenantId: string,
        request: BillingConfigurationRequest
    ): Promise<void> {
        try {
            await this.databaseService.billingConfiguration.upsert({
                where: { tenantId },
                create: {
                    tenantId,
                    currency: request.currency,
                    taxRate: request.taxRate,
                    invoicePrefix: request.invoicePrefix || 'INV',
                    paymentTerms: request.paymentTerms || 30,
                    autoCharge: request.autoCharge || false,
                    lateFeeRate: request.lateFeeRate,
                    reminderDays: request.reminderDays || [7, 3, 1],
                },
                update: {
                    currency: request.currency,
                    taxRate: request.taxRate,
                    invoicePrefix: request.invoicePrefix,
                    paymentTerms: request.paymentTerms,
                    autoCharge: request.autoCharge,
                    lateFeeRate: request.lateFeeRate,
                    reminderDays: request.reminderDays,
                },
            });

            // Emit event for analytics
            this.eventEmitter.emit('billing.configuration.updated', {
                tenantId,
                currency: request.currency,
                autoCharge: request.autoCharge,
            });

            this.logger.log(`Billing configuration updated for tenant: ${tenantId}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to setup billing configuration: ${message}`);
            throw new InternalServerErrorException('Failed to setup billing configuration');
        }
    }

    /**
     * Get payment status for tenant
     */
    async getPaymentStatus(tenantId: string): Promise<PaymentStatus> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount) {
                return {
                    isConfigured: false,
                    payoutsEnabled: false,
                    chargesEnabled: false,
                    detailsSubmitted: false,
                    requirements: [],
                };
            }

            // Get latest account info from Stripe
            const account = await this.stripe.accounts.retrieve(stripeAccount.stripeAccountId);

            const requirements = [
                ...account.requirements?.currently_due || [],
                ...account.requirements?.past_due || [],
            ];

            return {
                isConfigured: true,
                accountId: stripeAccount.stripeAccountId,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
                detailsSubmitted: account.details_submitted,
                requirements,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get payment status: ${message}`);
            return {
                isConfigured: false,
                payoutsEnabled: false,
                chargesEnabled: false,
                detailsSubmitted: false,
                requirements: [],
                errorMessage: message,
            };
        }
    }

    /**
     * Create a Stripe Checkout session for one-time payments (conversational commerce).
     * The session is created on the tenant's connected account.
     */
    async createCheckoutSessionForOrder(
        tenantId: string,
        args: CreateCheckoutSessionArgs
    ): Promise<{ url: string }> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });
            if (!stripeAccount) {
                throw new BadRequestException('Stripe account not configured for this tenant');
            }

            const lineItems = (args.lineItems || []).map(li => ({
                price_data: {
                    currency: li.currency,
                    product_data: {
                        name: li.name || 'Item',
                        description: li.description || undefined,
                    },
                    unit_amount: li.amount,
                },
                quantity: li.quantity && li.quantity > 0 ? li.quantity : 1,
            }));

            const successUrl = args.successUrl || `${this.configService.get('APP_URL')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = args.cancelUrl || `${this.configService.get('APP_URL')}/checkout/cancelled`;

            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                line_items: lineItems,
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: (args.metadata?.campaignId || tenantId),
                metadata: {
                    tenantId,
                    ...(args.metadata || {}),
                },
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            const url = session.url;
            if (!url) {
                throw new InternalServerErrorException('Failed to create checkout session URL');
            }
            return { url };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create checkout session: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to create checkout session');
        }
    }

    // =============================
    // SaaS Subscription (Platform)
    // =============================

    private getPlanPriceIds(): Array<{ planId: string; slug: string; envKey: string; name: string; interval: 'month' | 'year' }>{
        return [
            { planId: 'starter', slug: 'starter-monthly', envKey: 'STRIPE_PRICE_STARTER_MONTHLY', name: 'Starter', interval: 'month' },
            { planId: 'starter', slug: 'starter-yearly', envKey: 'STRIPE_PRICE_STARTER_YEARLY', name: 'Starter', interval: 'year' },
            { planId: 'professional', slug: 'professional-monthly', envKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', name: 'Professional', interval: 'month' },
            { planId: 'professional', slug: 'professional-yearly', envKey: 'STRIPE_PRICE_PROFESSIONAL_YEARLY', name: 'Professional', interval: 'year' },
            { planId: 'business', slug: 'business-monthly', envKey: 'STRIPE_PRICE_BUSINESS_MONTHLY', name: 'Business', interval: 'month' },
            { planId: 'business', slug: 'business-yearly', envKey: 'STRIPE_PRICE_BUSINESS_YEARLY', name: 'Business', interval: 'year' },
        ];
    }

    /**
     * Get or create Stripe product for a plan
     */
    private async getOrCreateProduct(planId: string, planName: string): Promise<string> {
        const productName = `${planName} Plan`;
        const productIdKey = `STRIPE_PRODUCT_${planId.toUpperCase()}`;
        const existingProductId = this.configService.get<string>(productIdKey);

        if (existingProductId) {
            try {
                const product = await this.stripe.products.retrieve(existingProductId);
                if (product.active) {
                    return product.id;
                }
            } catch (err) {
                this.logger.warn(`Product ${existingProductId} not found, creating new one`);
            }
        }

        // Create new product
        const product = await this.stripe.products.create({
            name: productName,
            description: `Subscription plan for ${planName}`,
            metadata: { planId },
        });

        this.logger.log(`Created Stripe product ${product.id} for plan ${planId}. Set ${productIdKey}=${product.id} in your environment.`);
        return product.id;
    }

    /**
     * Get or create Stripe price for a plan
     */
    private async getOrCreatePrice(
        planId: string,
        productId: string,
        unitAmount: number,
        interval: 'month' | 'year',
        envKey: string
    ): Promise<string> {
        const existingPriceId = this.configService.get<string>(envKey);

        if (existingPriceId) {
            try {
                const price = await this.stripe.prices.retrieve(existingPriceId);
                if (price.active && price.unit_amount === unitAmount && price.recurring?.interval === interval) {
                    return price.id;
                }
            } catch (err) {
                this.logger.warn(`Price ${existingPriceId} not found, creating new one`);
            }
        }

        // Create new price
        const price = await this.stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency: 'usd',
            recurring: {
                interval,
            },
            metadata: { planId, interval },
        });

        this.logger.log(`Created Stripe price ${price.id} for plan ${planId} (${interval}). Set ${envKey}=${price.id} in your environment.`);
        return price.id;
    }

    async listPlans(): Promise<PlanDefinition[]> {
        // Get plans from subscription service
        const subscriptionPlans = await this.subscriptionService.getAvailablePlans();
        const priceDefs = this.getPlanPriceIds();
        const plans: PlanDefinition[] = [];

        for (const def of priceDefs) {
            const subscriptionPlan = subscriptionPlans.find(p => p.id === def.planId);
            if (!subscriptionPlan) {
                continue;
            }

            const unitAmount = def.interval === 'year' 
                ? Math.round(subscriptionPlan.priceYearly * 100) // Convert to cents
                : Math.round(subscriptionPlan.price * 100);

            // Skip free plans
            if (unitAmount === 0) {
                continue;
            }

            try {
                // Get or create product
                const productId = await this.getOrCreateProduct(def.planId, def.name);

                // Get or create price (hybrid approach)
                const priceId = await this.getOrCreatePrice(
                    def.planId,
                    productId,
                    unitAmount,
                    def.interval,
                    def.envKey
                );

                plans.push({
                    id: def.slug,
                    name: def.name,
                    stripePriceId: priceId,
                    interval: def.interval,
                    currency: subscriptionPlan.currency.toLowerCase(),
                    unitAmount,
                    features: subscriptionPlan.features,
                });
            } catch (err) {
                this.logger.error(`Failed to process plan ${def.slug}: ${String((err as Error).message || err)}`);
            }
        }

        return plans;
    }

    private async getOrCreatePlatformStripeCustomer(tenantId: string): Promise<string> {
        // Try to reuse customer from latest subscription
        const existing = await this.databaseService.subscription.findFirst({
            where: { tenantId, stripeCustomerId: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        if (existing?.stripeCustomerId) return existing.stripeCustomerId;

        // Fallback: create using tenant owner email
        const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
        const owner = tenant?.ownerId ? await this.databaseService.user.findUnique({ where: { id: tenant.ownerId } }) : null;
        const email = owner?.email || undefined;
        const customer = await this.stripe.customers.create({
            email,
            name: tenant?.name,
            metadata: { tenantId },
        });
        return customer.id;
    }

    async createSubscriptionCheckoutSession(
        tenantId: string,
        args: { priceId: string; successUrl: string; cancelUrl: string }
    ): Promise<{ url: string }> {
        const customerId = await this.getOrCreatePlatformStripeCustomer(tenantId);
        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: args.priceId, quantity: 1 }],
            success_url: args.successUrl,
            cancel_url: args.cancelUrl,
            allow_promotion_codes: true,
            client_reference_id: tenantId,
            subscription_data: { metadata: { tenantId } },
            metadata: { tenantId },
        });
        const url = session.url;
        if (!url) throw new InternalServerErrorException('Failed to create checkout session URL');
        return { url };
    }

    async getSubscriptionSummary(tenantId: string): Promise<{ status: string; currentPeriodEnd?: Date; priceId?: string; stripeSubscriptionId?: string } | null> {
        const sub = await this.databaseService.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
        if (!sub) return null;
        return {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd || undefined,
            priceId: sub.stripePriceId || undefined,
            stripeSubscriptionId: sub.stripeSubscriptionId || undefined,
        };
    }

    async listCustomerInvoices(tenantId: string): Promise<Array<{ id: string; number?: string | null; total: number; currency: string; status: string; created: number; hostedInvoiceUrl?: string | null }>> {
        const sub = await this.databaseService.subscription.findFirst({ where: { tenantId, stripeCustomerId: { not: null } }, orderBy: { createdAt: 'desc' } });
        if (!sub?.stripeCustomerId) return [];
        const invoices = await this.stripe.invoices.list({ customer: sub.stripeCustomerId, limit: 20 });
        return invoices.data.map((i) => ({
            id: (i.id || '') as string,
            number: i.number,
            total: i.total || 0,
            currency: i.currency,
            status: (i.status || 'open') as string,
            created: i.created,
            hostedInvoiceUrl: i.hosted_invoice_url,
        }));
    }

    async createBillingPortalForTenant(tenantId: string, returnUrl: string): Promise<{ url: string }> {
        const sub = await this.databaseService.subscription.findFirst({ where: { tenantId, stripeCustomerId: { not: null } }, orderBy: { createdAt: 'desc' } });
        if (!sub?.stripeCustomerId) {
            throw new BadRequestException('No Stripe customer found for tenant');
        }
        const session = await this.stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId as string, return_url: returnUrl });
        if (!session.url) throw new InternalServerErrorException('Failed to create portal session URL');
        return { url: session.url };
    }

    /**
     * Create customer portal session
     */
    async createCustomerPortalSession(
        tenantId: string,
        customerId: string,
        returnUrl: string
    ): Promise<{ url: string }> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount) {
                throw new BadRequestException('Stripe account not found');
            }

            // Get customer's Stripe customer ID
            const customer = await this.databaseService.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) {
                throw new BadRequestException('Customer not found');
            }

            // Create or get Stripe customer
            let stripeCustomerId = (typeof customer.customFields === 'object' && customer.customFields !== null ? (customer.customFields as Record<string, unknown>)['stripeCustomerId'] : undefined) as string | undefined;
            if (!stripeCustomerId) {
                const stripeCustomer = await this.stripe.customers.create({
                    email: customer.email ?? undefined,
                    name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined,
                    metadata: {
                        tenantId,
                        customerId: customer.id,
                    },
                }, {
                    stripeAccount: stripeAccount.stripeAccountId,
                });

                stripeCustomerId = stripeCustomer.id as string;

                // Update customer record
            await this.databaseService.customer.update({
                    where: { id: customerId },
                    data: {
                    customFields: {
                        ...(typeof customer.customFields === 'object' && customer.customFields !== null ? (customer.customFields as Record<string, unknown>) : {}),
                        stripeCustomerId,
                    } as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: stripeCustomerId as string,
                return_url: returnUrl,
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            return { url: session.url };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create customer portal session: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to create customer portal session');
        }
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhookEvent(event: Stripe.Event, signature: string): Promise<void> {
        try {
            const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
            if (!webhookSecret) {
                throw new Error('STRIPE_WEBHOOK_SECRET is required');
            }

            // Verify webhook signature
            const verifiedEvent = this.stripe.webhooks.constructEvent(
                JSON.stringify(event),
                signature,
                webhookSecret
            );

            this.logger.log(`Processing webhook event: ${verifiedEvent.type}`);

            switch (verifiedEvent.type) {
                case 'account.updated':
                    await this.handleAccountUpdated(verifiedEvent.data.object as Stripe.Account);
                    break;

                case 'payment_intent.succeeded':
                    await this.handlePaymentIntentSucceeded(verifiedEvent.data.object as Stripe.PaymentIntent);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentIntentFailed(verifiedEvent.data.object as Stripe.PaymentIntent);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(verifiedEvent.data.object as Stripe.Invoice);
                    break;

                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(verifiedEvent.data.object as Stripe.Invoice);
                    break;

                case 'checkout.session.completed': {
                    const session = verifiedEvent.data.object as Stripe.Checkout.Session;
                    const tenantId = (session.metadata?.['tenantId'] as string) || (session.client_reference_id as string);
                    const stripeCustomerId = session.customer as string | null;
                    const stripeSubscriptionId = session.subscription as string | null;
                    
                    // Handle AI token purchase
                    if (session.metadata?.['type'] === 'ai_tokens' && tenantId) {
                        await this.handleAITokenPurchase(session);
                    }

                    // Handle Wallet Top-up
                    if (session.metadata?.['type'] === 'wallet_topup' && tenantId) {
                        const channelType = session.metadata['channelType'];
                        const amount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents
                        if (channelType && amount > 0) {
                            try {
                                await this.walletService.purchaseCredits(tenantId, channelType, amount, session.id);
                                this.logger.log(`Processed wallet top-up for tenant ${tenantId}, channel ${channelType}, amount ${amount}`);
                            } catch (err) {
                                this.logger.error(`Failed to process wallet top-up: ${err}`);
                            }
                        }
                    }
                    
                    // Handle subscription checkout
                    if (tenantId && stripeSubscriptionId) {
                        const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
                        const existing = await this.databaseService.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } });
                        if (!existing) {
                            await this.databaseService.subscription.create({
                                data: {
                                    tenantId,
                                    plan: subscription.items.data[0]?.price?.nickname || 'unknown',
                                    status: subscription.status,
                                    currentPeriodStart: new Date(((subscription as unknown) as { current_period_start: number }).current_period_start * 1000),
                                    currentPeriodEnd: new Date(((subscription as unknown) as { current_period_end: number }).current_period_end * 1000),
                                    stripeCustomerId: (stripeCustomerId ?? undefined) as string | undefined,
                                    stripeSubscriptionId: subscription.id,
                                    stripePriceId: subscription.items.data[0]?.price?.id,
                                },
                            });
                        } else {
                            await this.databaseService.subscription.update({
                                where: { id: existing.id },
                                data: {
                                    status: subscription.status,
                                    currentPeriodStart: new Date(((subscription as unknown) as { current_period_start: number }).current_period_start * 1000),
                                    currentPeriodEnd: new Date(((subscription as unknown) as { current_period_end: number }).current_period_end * 1000),
                                    stripeCustomerId: (stripeCustomerId ?? undefined) as string | undefined,
                                    stripePriceId: subscription.items.data[0]?.price?.id,
                                },
                            });
                        }
                    }
                    // Handle one-time payment checkout (conversational commerce)
                    if ((session.mode as string | null) === 'payment') {
                        const campaignId = (session.metadata?.['campaignId'] as string) || undefined;
                        const deliveryId = (session.metadata?.['deliveryId'] as string) || undefined;
                        const amountTotal = (session.amount_total as number | null) ?? undefined;
                        const currency = (session.currency as string | null) ?? undefined;
                        const tId = tenantId;
                        if (tId && campaignId) {
                            try {
                                await (this.databaseService as any).campaignConversion.create?.({
                                    data: {
                                        tenantId: tId,
                                        campaignId,
                                        deliveryId,
                                        channel: 'web',
                                        amount: amountTotal,
                                        currency: currency || 'usd',
                                        source: 'checkout_session',
                                        metadata: {
                                            checkoutSessionId: session.id,
                                        } as any,
                                    },
                                });
                            } catch (err) {
                                this.logger.warn(`Failed to record campaign conversion (checkout): ${String(err)}`);
                            }
                        }
                    }
                    break;
                }

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted': {
                    const s = verifiedEvent.data.object as Stripe.Subscription;
                    const tenantId = (s.metadata?.['tenantId'] as string) || undefined;
                    
                    // Extract plan ID from price metadata or nickname
                    const priceMetadata = s.items.data[0]?.price?.metadata;
                    const planId = priceMetadata?.['planId'] || 
                                   s.items.data[0]?.price?.nickname?.split('-')[0] || 
                                   'unknown';
                    
                    // Find by stripeSubscriptionId
                    const existing = await this.databaseService.subscription.findFirst({ 
                        where: { stripeSubscriptionId: s.id } 
                    });
                    
                    if (verifiedEvent.type === 'customer.subscription.deleted') {
                        // Handle cancellation
                        if (existing) {
                            await this.databaseService.subscription.update({
                                where: { id: existing.id },
                                data: {
                                    status: 'canceled',
                                    canceledAt: new Date(),
                                    currentPeriodEnd: new Date(((s as unknown) as { current_period_end: number }).current_period_end * 1000),
                                },
                            });
                            
                            // Update tenant plan to starter
                            if (existing.tenantId) {
                                try {
                                    await this.databaseService.tenant.update({
                                        where: { id: existing.tenantId },
                                        data: { plan: 'starter' },
                                    });
                                } catch (err) {
                                    this.logger.warn(`Failed to update tenant plan: ${String(err)}`);
                                }
                            }
                        }
                    } else {
                        // Handle creation or update
                        if (!existing && tenantId) {
                            await this.databaseService.subscription.create({
                                data: {
                                    tenantId,
                                    plan: planId,
                                    status: s.status,
                                    currentPeriodStart: new Date(((s as unknown) as { current_period_start: number }).current_period_start * 1000),
                                    currentPeriodEnd: new Date(((s as unknown) as { current_period_end: number }).current_period_end * 1000),
                                    stripeCustomerId: ((s.customer as string | null | undefined) ?? undefined) as string | undefined,
                                    stripeSubscriptionId: s.id,
                                    stripePriceId: s.items.data[0]?.price?.id,
                                },
                            });
                            
                            // Update tenant plan
                            try {
                                await this.databaseService.tenant.update({
                                    where: { id: tenantId },
                                    data: { plan: planId },
                                });
                            } catch (err) {
                                this.logger.warn(`Failed to update tenant plan: ${String(err)}`);
                            }
                        } else if (existing) {
                            await this.databaseService.subscription.update({
                                where: { id: existing.id },
                                data: {
                                    plan: planId,
                                    status: s.status,
                                    currentPeriodStart: new Date(((s as unknown) as { current_period_start: number }).current_period_start * 1000),
                                    currentPeriodEnd: new Date(((s as unknown) as { current_period_end: number }).current_period_end * 1000),
                                    stripeCustomerId: ((s.customer as string | null | undefined) ?? undefined) as string | undefined,
                                    stripePriceId: s.items.data[0]?.price?.id,
                                },
                            });
                            
                            // Update tenant plan if changed
                            if (existing.tenantId && existing.plan !== planId) {
                                try {
                                    await this.databaseService.tenant.update({
                                        where: { id: existing.tenantId },
                                        data: { plan: planId },
                                    });
                                } catch (err) {
                                    this.logger.warn(`Failed to update tenant plan: ${String(err)}`);
                                }
                            }
                        }
                    }
                    break;
                }

                default:
                    this.logger.log(`Unhandled webhook event type: ${verifiedEvent.type}`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to handle webhook event: ${message}`);
            throw error;
        }
    }

    /**
     * Get billing configuration
     */
    async getBillingConfiguration(tenantId: string) {
        return this.databaseService.billingConfiguration.findUnique({
            where: { tenantId }
        });
    }

    /**
     * Generate invoice for customer
     */
    async generateInvoice(
        tenantId: string,
        customerId: string,
        items: Array<{
            description: string;
            amount: number;
            quantity?: number;
        }>
    ): Promise<{ invoiceId: string; hostedInvoiceUrl: string }> {
        try {
            const stripeAccount = await this.databaseService.stripeAccount.findUnique({
                where: { tenantId }
            });

            if (!stripeAccount) {
                throw new BadRequestException('Stripe account not found');
            }

            const customer = await this.databaseService.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) {
                throw new BadRequestException('Customer not found');
            }

            // Get or create Stripe customer
            let stripeCustomerId = (typeof customer.customFields === 'object' && customer.customFields !== null ? (customer.customFields as Record<string, unknown>)['stripeCustomerId'] : undefined) as string | undefined;
            if (!stripeCustomerId) {
                const stripeCustomer = await this.stripe.customers.create({
                    email: customer.email ?? undefined,
                    name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined,
                    metadata: {
                        tenantId,
                        customerId: customer.id,
                    },
                }, {
                    stripeAccount: stripeAccount.stripeAccountId,
                });

                stripeCustomerId = stripeCustomer.id as string;

                await this.databaseService.customer.update({
                    where: { id: customerId },
                    data: {
                        customFields: {
                            ...(typeof customer.customFields === 'object' && customer.customFields !== null ? (customer.customFields as Record<string, unknown>) : {}),
                            stripeCustomerId,
                        } as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            // Create invoice items
            for (const item of items) {
                await this.stripe.invoiceItems.create({
                    customer: stripeCustomerId,
                    amount: item.amount,
                    currency: 'usd',
                    description: item.description,
                    quantity: item.quantity || 1,
                }, {
                    stripeAccount: stripeAccount.stripeAccountId,
                });
            }

            // Create and finalize invoice
            const invoice = await this.stripe.invoices.create({
                customer: stripeCustomerId as string,
                auto_advance: true,
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            const accountId = stripeAccount?.stripeAccountId;
            if (!accountId) {
                throw new BadRequestException('Stripe account ID not found');
            }
            const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id, {}, {
                stripeAccount: accountId as string,
            });

            const hostedUrl = finalizedInvoice.hosted_invoice_url;
            if (!hostedUrl) throw new InternalServerErrorException('Missing hosted invoice URL');
            return {
                invoiceId: String(finalizedInvoice.id),
                hostedInvoiceUrl: hostedUrl,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate invoice: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to generate invoice');
        }
    }

    // Private helper methods

    private mapToAccountInfo(dbAccount: unknown, stripeAccount: Stripe.Account): StripeAccountInfo {
        return {
            id: stripeAccount.id,
            email: stripeAccount.email ?? undefined,
            country: stripeAccount.country ?? undefined,
            defaultCurrency: stripeAccount.default_currency ?? undefined,
            businessType: (stripeAccount.business_type ?? undefined) as string | undefined,
            detailsSubmitted: stripeAccount.details_submitted,
            payoutsEnabled: stripeAccount.payouts_enabled,
            chargesEnabled: stripeAccount.charges_enabled,
            requirements: {
                currentlyDue: stripeAccount.requirements?.currently_due || [],
                eventuallyDue: stripeAccount.requirements?.eventually_due || [],
                pastDue: stripeAccount.requirements?.past_due || [],
                pendingVerification: stripeAccount.requirements?.pending_verification || [],
            },
            capabilities: (stripeAccount.capabilities as unknown as Record<string, unknown>) || {},
        };
    }

    private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
        try {
            await this.databaseService.stripeAccount.update({
                where: { stripeAccountId: account.id },
                data: {
                    detailsSubmitted: account.details_submitted,
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    requirements: (account.requirements ?? undefined) as unknown as Prisma.InputJsonValue,
                    capabilities: (account.capabilities ?? undefined) as unknown as Prisma.InputJsonValue,
                    settings: (account.settings ?? undefined) as unknown as Prisma.InputJsonValue,
                },
            });

            this.logger.log(`Updated account: ${account.id}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to handle account updated: ${message}`);
        }
    }

    private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        try {
            const updated = await this.databaseService.paymentIntent.update({
                where: { stripePaymentId: paymentIntent.id },
                data: {
                    status: paymentIntent.status,
                },
            }).catch(() => null);

            this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

            // Attempt to attribute conversion to a campaign
            try {
                const meta = (paymentIntent.metadata || {}) as Record<string, string>;
                const dbPi = updated ?? await this.databaseService.paymentIntent.findFirst({ where: { stripePaymentId: paymentIntent.id } });
                const tenantId = (dbPi as any)?.tenantId || meta['tenantId'];
                const campaignId = (dbPi as any)?.campaignId || meta['campaignId'];
                const deliveryId = meta['deliveryId'];
                const currency = (paymentIntent.currency || 'usd') as string;
                const amount = (typeof (paymentIntent.amount_received as number | undefined) === 'number'
                    ? paymentIntent.amount_received
                    : (paymentIntent.amount as number | undefined)) as number | undefined;
                if (tenantId && campaignId) {
                    await (this.databaseService as any).campaignConversion.create?.({
                        data: {
                            tenantId,
                            campaignId,
                            deliveryId,
                            channel: 'web',
                            amount: amount,
                            currency,
                            source: 'payment_intent',
                            metadata: {
                                paymentIntentId: paymentIntent.id,
                            } as any,
                        },
                    });
                }
            } catch (err) {
                this.logger.warn(`Failed to record campaign conversion (payment_intent): ${String(err)}`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to handle payment intent succeeded: ${message}`);
        }
    }

    private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        try {
            await this.databaseService.paymentIntent.update({
                where: { stripePaymentId: paymentIntent.id },
                data: {
                    status: paymentIntent.status,
                    lastPaymentError: (paymentIntent.last_payment_error ?? undefined) as unknown as Prisma.InputJsonValue,
                },
            });

            this.logger.log(`Payment failed: ${paymentIntent.id}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to handle payment intent failed: ${message}`);
        }
    }

    private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
        // Handle invoice payment success logic here
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        this.logger.log(`Invoice payment failed: ${invoice.id}`);
        // Handle invoice payment failure logic here
    }

    // === Multi-currency & Advanced Billing Features ===

    async listPaymentMethods(tenantId: string): Promise<Stripe.PaymentMethod[]> {
        try {
            const customerId = await this.getOrCreatePlatformStripeCustomer(tenantId);
            if (!customerId) {
                return [];
            }

            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            return paymentMethods.data;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to list payment methods: ${message}`);
            throw new InternalServerErrorException('Failed to list payment methods');
        }
    }

    async attachPaymentMethod(tenantId: string, paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        try {
            const customerId = await this.getOrCreatePlatformStripeCustomer(tenantId);
            if (!customerId) {
                throw new BadRequestException('No Stripe customer found for this tenant');
            }

            const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });

            // Set as default payment method
            await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            return paymentMethod;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to attach payment method: ${message}`);
            throw new InternalServerErrorException('Failed to attach payment method');
        }
    }

    async calculateTax(
        tenantId: string,
        amount: number,
        _currency: string,
        _countryCode?: string,
    ): Promise<{ taxAmount: number; totalAmount: number; taxRate: number }> {
        try {
            // Use Stripe Tax API if available, otherwise fall back to stored tax rates
            const billingConfig = await this.databaseService.billingConfiguration.findUnique({
                where: { tenantId },
            });

            const taxRate = billingConfig?.taxRate ? Number(billingConfig.taxRate) : 0;
            const taxAmount = Math.round(amount * taxRate);
            const totalAmount = amount + taxAmount;

            return {
                taxAmount,
                totalAmount,
                taxRate,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to calculate tax: ${message}`);
            throw new InternalServerErrorException('Failed to calculate tax');
        }
    }

    async updateSubscriptionCurrency(
        tenantId: string,
        currency: string,
    ): Promise<{ success: boolean }> {
        try {
            const customerId = await this.getOrCreatePlatformStripeCustomer(tenantId);
            if (!customerId) {
                throw new BadRequestException('No Stripe customer found');
            }

            // Note: Stripe doesn't allow changing currency on existing subscriptions
            // This would require creating a new subscription with the new currency
            this.logger.log(`Currency change requested for tenant ${tenantId} to ${currency}`);
            this.logger.warn('Currency change requires subscription recreation');

            return { success: false };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to update subscription currency: ${message}`);
            throw new InternalServerErrorException('Failed to update subscription currency');
        }
    }

    async recordUsage(
        tenantId: string,
        metricName: string,
        _quantity: number,
        _timestamp?: Date,
    ): Promise<{ recorded: boolean }> {
        try {
            // Store usage record in database for billing
            // Note: ApiUsage requires endpoint, method, statusCode, duration
            // For now, we'll create a simplified record
            await this.databaseService.apiUsage.create({
                data: {
                    tenantId,
                    endpoint: metricName,
                    method: 'POST', // Default method
                    statusCode: 200, // Default status
                    duration: 0, // Default duration
                },
            });

            this.logger.log(`Recorded usage for ${tenantId}: ${metricName} = ${_quantity}`);
            return { recorded: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to record usage: ${message}`);
            throw new InternalServerErrorException('Failed to record usage');
        }
    }

    async getUsageSummary(
        tenantId: string,
        from: Date,
        to: Date,
    ): Promise<{ apiCalls: number; storage: number; messages: number; seats: number; limits: { agents: number; customers: number; tickets: number; storage: number; apiCalls: number } }> {
        try {
            // Get subscription to determine limits
            const subscription = await this.databaseService.subscription.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
            });

            // Get API usage count
            const apiUsage = await this.databaseService.apiUsage.count({
                where: {
                    tenantId,
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                },
            });

            // Get storage usage (convert bytes to GB)
            const storageResult = await this.databaseService.storageUsage.aggregate({
                where: { tenantId },
                _sum: { fileSize: true },
            });
            const storageBytes = storageResult._sum.fileSize || 0;
            const storageGB = storageBytes / (1024 * 1024 * 1024);

            // Get message count from messages table via conversation relation
            const conversations = await this.databaseService.conversation.findMany({
                where: {
                    tenantId,
                },
                select: { id: true },
            });
            const conversationIds = conversations.map((c) => c.id);
            const messageCount = await this.databaseService.message.count({
                where: {
                    conversationId: { in: conversationIds },
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                },
            });

            // Get team member count (using status instead of deletedAt)
            const seatCount = await this.databaseService.user.count({
                where: {
                    tenantId,
                    status: { not: 'inactive' }, // Exclude inactive users
                },
            });

            // Get limits from subscription plan (hardcoded for now, can be enhanced)
            const planLimits: Record<string, { agents: number; customers: number; tickets: number; storage: number; apiCalls: number }> = {
                starter: { agents: 3, customers: 100, tickets: 1000, storage: 1, apiCalls: 10000 },
                professional: { agents: 10, customers: 1000, tickets: 10000, storage: 10, apiCalls: 100000 },
                business: { agents: 999999, customers: 999999, tickets: 999999, storage: 100, apiCalls: 1000000 },
                pro: { agents: 10, customers: 1000, tickets: 10000, storage: 10, apiCalls: 100000 },
                enterprise: { agents: 999999, customers: 999999, tickets: 999999, storage: 100, apiCalls: 1000000 },
            };
            
            const limits = planLimits[subscription?.plan || 'starter'] || planLimits.starter;

            return {
                apiCalls: apiUsage,
                storage: Math.round(storageGB * 100) / 100, // Round to 2 decimals
                messages: messageCount,
                seats: seatCount,
                limits,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get usage summary: ${message}`);
            return {
                apiCalls: 0,
                storage: 0,
                messages: 0,
                seats: 0,
                limits: {
                    agents: 10,
                    customers: 1000,
                    tickets: 10000,
                    storage: 50,
                    apiCalls: 100000,
                },
            };
        }
    }

    // =============================
    // AI Token Purchase
    // =============================

    /**
     * Create checkout session for AI token purchase
     * @param tenantId Tenant ID
     * @param tokenAmount Number of AI tokens to purchase
     * @param successUrl Success redirect URL
     * @param cancelUrl Cancel redirect URL
     */
    async createAITokenCheckoutSession(
        tenantId: string,
        tokenAmount: number,
        successUrl: string,
        cancelUrl: string,
    ): Promise<{ url: string; sessionId: string }> {
        try {
            // Pricing: $0.01 per AI token (100 tokens = $1.00)
            const pricePerToken = 0.01;
            const totalAmount = Math.round(tokenAmount * pricePerToken * 100); // Convert to cents

            if (totalAmount < 50) {
                throw new BadRequestException('Minimum purchase amount is $0.50 (50 tokens)');
            }

            const customerId = await this.getOrCreatePlatformStripeCustomer(tenantId);
            
            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                customer: customerId,
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${tokenAmount} AI Tokens`,
                            description: `Purchase ${tokenAmount} AI tokens for AI-powered features`,
                        },
                        unit_amount: totalAmount,
                    },
                    quantity: 1,
                }],
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: tenantId,
                metadata: {
                    tenantId,
                    tokenAmount: tokenAmount.toString(),
                    type: 'ai_tokens',
                },
            });

            const url = session.url;
            if (!url) {
                throw new InternalServerErrorException('Failed to create checkout session URL');
            }

            return {
                url,
                sessionId: session.id,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create AI token checkout session: ${message}`, error instanceof Error ? error.stack : undefined);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(`Failed to create AI token checkout session: ${message}`);
        }
    }

    /**
     * Handle AI token purchase webhook (called from handleWebhookEvent)
     */
    async handleAITokenPurchase(session: Stripe.Checkout.Session): Promise<void> {
        try {
            const tenantId = session.metadata?.['tenantId'] as string | undefined;
            const tokenAmount = session.metadata?.['tokenAmount'] 
                ? parseInt(session.metadata['tokenAmount'] as string, 10) 
                : undefined;

            if (!tenantId || !tokenAmount) {
                this.logger.warn('Missing tenantId or tokenAmount in AI token purchase webhook');
                return;
            }

            // Add tokens to tenant's AI wallet
            // We'll need to inject this properly, for now use direct database access

            // Use direct database access to add tokens
            const wallet = await (this.databaseService as any).aITokenWallet.findUnique({
                where: { tenantId },
            });

            if (!wallet) {
                // Create wallet if it doesn't exist
                await (this.databaseService as any).aITokenWallet.create({
                    data: {
                        tenantId,
                        balance: tokenAmount,
                        currency: 'USD',
                        lastSyncedAt: new Date(),
                        metadata: {},
                    },
                });
            } else {
                // Add tokens to existing wallet
                await (this.databaseService as any).aITokenTransaction.create({
                    data: {
                        walletId: wallet.id,
                        tenantId,
                        type: 'purchase',
                        amount: tokenAmount,
                        currency: wallet.currency,
                        description: `Purchase of ${tokenAmount} AI tokens`,
                        referenceId: session.id,
                        metadata: {
                            sessionId: session.id,
                            paymentIntentId: session.payment_intent,
                        },
                    },
                });

                await (this.databaseService as any).aITokenWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: {
                            increment: tokenAmount,
                        },
                        lastSyncedAt: new Date(),
                    },
                });
            }

            this.logger.log(`Added ${tokenAmount} AI tokens to tenant ${tenantId}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to handle AI token purchase: ${message}`);
        }
    }
}