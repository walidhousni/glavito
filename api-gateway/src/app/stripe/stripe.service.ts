/**
 * Stripe Payment Integration Service
 * Handles Stripe Connect accounts, payment processing, billing automation, and webhook management
 */

import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';

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
    capabilities: Record<string, string>;
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

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripe: Stripe;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
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

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
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
                    email: request.email,
                    country: request.country,
                    defaultCurrency: account.default_currency || 'usd',
                    businessType: request.businessType,
                    businessProfile: request.businessProfile || {},
                    detailsSubmitted: account.details_submitted,
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    requirements: account.requirements,
                    capabilities: account.capabilities,
                    settings: account.settings,
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
        } catch (error) {
            this.logger.error(`Failed to create Stripe account: ${error.message}`);
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
        } catch (error) {
            this.logger.error(`Failed to create account link: ${error.message}`);
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
                    requirements: account.requirements,
                    capabilities: account.capabilities,
                    settings: account.settings,
                },
            });

            return this.mapToAccountInfo(stripeAccount, account);
        } catch (error) {
            this.logger.error(`Failed to get Stripe account: ${error.message}`);
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

            return {
                clientSecret: paymentIntent.client_secret!,
                paymentIntentId: paymentIntentRecord.id,
            };
        } catch (error) {
            this.logger.error(`Failed to create payment intent: ${error.message}`);
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
        } catch (error) {
            this.logger.error(`Failed to setup billing configuration: ${error.message}`);
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
        } catch (error) {
            this.logger.error(`Failed to get payment status: ${error.message}`);
            return {
                isConfigured: false,
                payoutsEnabled: false,
                chargesEnabled: false,
                detailsSubmitted: false,
                requirements: [],
                errorMessage: error.message,
            };
        }
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
            let stripeCustomerId = customer.customFields?.stripeCustomerId;
            if (!stripeCustomerId) {
                const stripeCustomer = await this.stripe.customers.create({
                    email: customer.email,
                    name: `${customer.firstName} ${customer.lastName}`.trim(),
                    metadata: {
                        tenantId,
                        customerId: customer.id,
                    },
                }, {
                    stripeAccount: stripeAccount.stripeAccountId,
                });

                stripeCustomerId = stripeCustomer.id;

                // Update customer record
                await this.databaseService.customer.update({
                    where: { id: customerId },
                    data: {
                        customFields: {
                            ...customer.customFields,
                            stripeCustomerId,
                        },
                    },
                });
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: returnUrl,
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            return { url: session.url };
        } catch (error) {
            this.logger.error(`Failed to create customer portal session: ${error.message}`);
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

                default:
                    this.logger.log(`Unhandled webhook event type: ${verifiedEvent.type}`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle webhook event: ${error.message}`);
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
            let stripeCustomerId = customer.customFields?.stripeCustomerId;
            if (!stripeCustomerId) {
                const stripeCustomer = await this.stripe.customers.create({
                    email: customer.email,
                    name: `${customer.firstName} ${customer.lastName}`.trim(),
                    metadata: {
                        tenantId,
                        customerId: customer.id,
                    },
                }, {
                    stripeAccount: stripeAccount.stripeAccountId,
                });

                stripeCustomerId = stripeCustomer.id;

                await this.databaseService.customer.update({
                    where: { id: customerId },
                    data: {
                        customFields: {
                            ...customer.customFields,
                            stripeCustomerId,
                        },
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
                customer: stripeCustomerId,
                auto_advance: true,
            }, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id, {}, {
                stripeAccount: stripeAccount.stripeAccountId,
            });

            return {
                invoiceId: finalizedInvoice.id,
                hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url!,
            };
        } catch (error) {
            this.logger.error(`Failed to generate invoice: ${error.message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to generate invoice');
        }
    }

    // Private helper methods

    private mapToAccountInfo(dbAccount: unknown, stripeAccount: Stripe.Account): StripeAccountInfo {
        return {
            id: stripeAccount.id,
            email: stripeAccount.email,
            country: stripeAccount.country,
            defaultCurrency: stripeAccount.default_currency,
            businessType: stripeAccount.business_type,
            detailsSubmitted: stripeAccount.details_submitted,
            payoutsEnabled: stripeAccount.payouts_enabled,
            chargesEnabled: stripeAccount.charges_enabled,
            requirements: {
                currentlyDue: stripeAccount.requirements?.currently_due || [],
                eventuallyDue: stripeAccount.requirements?.eventually_due || [],
                pastDue: stripeAccount.requirements?.past_due || [],
                pendingVerification: stripeAccount.requirements?.pending_verification || [],
            },
            capabilities: stripeAccount.capabilities || {},
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
                    requirements: account.requirements,
                    capabilities: account.capabilities,
                    settings: account.settings,
                },
            });

            this.logger.log(`Updated account: ${account.id}`);
        } catch (error) {
            this.logger.error(`Failed to handle account updated: ${error.message}`);
        }
    }

    private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        try {
            await this.databaseService.paymentIntent.update({
                where: { stripePaymentId: paymentIntent.id },
                data: {
                    status: paymentIntent.status,
                },
            });

            this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
        } catch (error) {
            this.logger.error(`Failed to handle payment intent succeeded: ${error.message}`);
        }
    }

    private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        try {
            await this.databaseService.paymentIntent.update({
                where: { stripePaymentId: paymentIntent.id },
                data: {
                    status: paymentIntent.status,
                    lastPaymentError: paymentIntent.last_payment_error,
                },
            });

            this.logger.log(`Payment failed: ${paymentIntent.id}`);
        } catch (error) {
            this.logger.error(`Failed to handle payment intent failed: ${error.message}`);
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
}