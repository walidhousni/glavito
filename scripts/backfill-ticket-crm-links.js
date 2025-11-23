#!/usr/bin/env node

/**
 * Backfill script to link existing tickets to leads and deals
 * 
 * This script attempts to automatically link tickets to leads/deals based on:
 * 1. Customer email matching
 * 2. Customer phone matching
 * 3. Customer company matching
 * 
 * Usage:
 *   node scripts/backfill-ticket-crm-links.js [--tenant-id=<id>] [--batch-size=<size>] [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  tenantId: null,
  batchSize: 100,
  dryRun: false,
};

for (const arg of args) {
  if (arg.startsWith('--tenant-id=')) {
    options.tenantId = arg.split('=')[1];
  } else if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
}

console.log('Backfill Ticket CRM Links');
console.log('=========================');
console.log('Options:', options);
console.log('');

async function backfillTicketLinks() {
  try {
    // Get all tenants or specific tenant
    const tenants = options.tenantId
      ? await prisma.tenant.findMany({ where: { id: options.tenantId } })
      : await prisma.tenant.findMany();

    console.log(`Processing ${tenants.length} tenant(s)...\n`);

    let totalProcessed = 0;
    let totalLinkedToLeads = 0;
    let totalLinkedToDeals = 0;
    let totalErrors = 0;

    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`);
      console.log('─'.repeat(60));

      // Get tickets without CRM links
      const tickets = await prisma.ticket.findMany({
        where: {
          tenantId: tenant.id,
          relatedLeadId: null,
          relatedDealId: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              company: true,
            },
          },
        },
        take: options.batchSize,
      });

      console.log(`Found ${tickets.length} unlinked tickets`);

      for (const ticket of tickets) {
        totalProcessed++;

        try {
          const customer = ticket.customer;
          let linkedToLead = false;
          let linkedToDeal = false;

          // Try to find matching lead
          if (customer.email || customer.phone || customer.company) {
            const leadWhere = {
              tenantId: tenant.id,
              OR: [],
            };

            if (customer.email) {
              leadWhere.OR.push({ email: customer.email });
            }
            if (customer.phone) {
              leadWhere.OR.push({ phone: customer.phone });
            }
            if (customer.company) {
              leadWhere.OR.push({ company: customer.company });
            }

            const lead = await prisma.lead.findFirst({
              where: leadWhere,
              orderBy: { createdAt: 'desc' },
            });

            if (lead) {
              if (!options.dryRun) {
                await prisma.ticket.update({
                  where: { id: ticket.id },
                  data: { relatedLeadId: lead.id },
                });
              }
              linkedToLead = true;
              totalLinkedToLeads++;
              console.log(`  ✓ Linked ticket ${ticket.id} to lead ${lead.id}`);
            }
          }

          // Try to find matching deal
          const deal = await prisma.deal.findFirst({
            where: {
              tenantId: tenant.id,
              customerId: customer.id,
              stage: {
                notIn: ['WON', 'LOST'],
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (deal) {
            if (!options.dryRun) {
              await prisma.ticket.update({
                where: { id: ticket.id },
                data: { relatedDealId: deal.id },
              });
            }
            linkedToDeal = true;
            totalLinkedToDeals++;
            console.log(`  ✓ Linked ticket ${ticket.id} to deal ${deal.id}`);
          }

          if (!linkedToLead && !linkedToDeal) {
            console.log(`  ○ No matches found for ticket ${ticket.id}`);
          }
        } catch (error) {
          totalErrors++;
          console.error(`  ✗ Error processing ticket ${ticket.id}:`, error.message);
        }
      }

      console.log(`\nTenant ${tenant.name} summary:`);
      console.log(`  Processed: ${tickets.length} tickets`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tickets processed: ${totalProcessed}`);
    console.log(`Linked to leads: ${totalLinkedToLeads}`);
    console.log(`Linked to deals: ${totalLinkedToDeals}`);
    console.log(`Errors: ${totalErrors}`);
    
    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
    } else {
      console.log('\n✓ Backfill completed successfully');
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillTicketLinks()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  });

