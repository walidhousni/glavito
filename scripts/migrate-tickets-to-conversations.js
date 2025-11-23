/**
 * Migration Script: Create ConversationAdvanced for Existing Tickets
 * 
 * This script creates ConversationAdvanced records for tickets that don't have them yet.
 * Run this once to fix historical data.
 * 
 * Usage: node scripts/migrate-tickets-to-conversations.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateTicketsToConversations() {
  console.log('🚀 Starting migration: Creating ConversationAdvanced for existing tickets...\n');

  try {
    // Get all tickets
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        tenantId: true,
        customerId: true,
        channelId: true,
        subject: true,
        status: true,
        priority: true,
        assignedAgentId: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`📊 Found ${tickets.length} tickets\n`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const ticket of tickets) {
      const conversationId = `conv_ticket_${ticket.id}`;
      
      try {
        // Check if conversation already exists
        const existing = await prisma.conversationAdvanced.findUnique({
          where: { id: conversationId },
        });

        if (existing) {
          console.log(`⏭️  Skipping ticket ${ticket.id} - conversation already exists`);
          skippedCount++;
          continue;
        }

        // Create the conversation
        await prisma.conversationAdvanced.create({
          data: {
            id: conversationId,
            tenantId: ticket.tenantId,
            customerId: ticket.customerId,
            channelId: ticket.channelId,
            subject: ticket.subject || 'Ticket Conversation',
            status: ticket.status === 'closed' ? 'resolved' : 'active',
            priority: ticket.priority || 'medium',
            assignedAgentId: ticket.assignedAgentId,
            tags: ticket.tags || [],
            messageCount: 0,
            metadata: {
              ticketId: ticket.id,
              source: 'ticket',
              migratedAt: new Date().toISOString(),
              unreadCount: 0,
            },
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          },
        });

        console.log(`✅ Created conversation for ticket ${ticket.id}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating conversation for ticket ${ticket.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Created: ${createdCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${tickets.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the error messages above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTicketsToConversations()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

