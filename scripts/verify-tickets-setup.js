/**
 * Verification Script: Check Tickets/Conversations Setup
 * 
 * This script verifies that the tickets and conversations are properly set up.
 * 
 * Usage: node scripts/verify-tickets-setup.js [tenantId]
 * Example: node scripts/verify-tickets-setup.js walid-housni-30
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySetup(tenantId) {
  console.log('🔍 Verifying Tickets/Conversations Setup...\n');

  if (tenantId) {
    console.log(`📌 Filtering by tenant: ${tenantId}\n`);
  }

  try {
    // Check tenants
    const tenants = await prisma.tenant.findMany({
      where: tenantId ? { id: tenantId } : undefined,
      select: { id: true, name: true, subdomain: true },
    });

    console.log(`👥 Found ${tenants.length} tenant(s):`);
    tenants.forEach(t => console.log(`   - ${t.id} (${t.name}) - ${t.subdomain}`));
    console.log('');

    if (tenants.length === 0) {
      console.log('❌ No tenants found!');
      return;
    }

    const targetTenantId = tenantId || tenants[0].id;

    // Check tickets
    const tickets = await prisma.ticket.findMany({
      where: { tenantId: targetTenantId },
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        customerId: true,
        channelId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`🎫 Found ${tickets.length} ticket(s) for tenant ${targetTenantId}:`);
    tickets.forEach(t => {
      console.log(`   - ${t.id}`);
      console.log(`     Subject: ${t.subject}`);
      console.log(`     Status: ${t.status}, Priority: ${t.priority}`);
      console.log(`     Created: ${t.createdAt.toISOString()}`);
    });
    console.log('');

    // Check conversations
    const conversations = await prisma.conversationAdvanced.findMany({
      where: { tenantId: targetTenantId },
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        customerId: true,
        channelId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`💬 Found ${conversations.length} conversation(s) for tenant ${targetTenantId}:`);
    conversations.forEach(c => {
      console.log(`   - ${c.id}`);
      console.log(`     Subject: ${c.subject}`);
      console.log(`     Status: ${c.status}, Priority: ${c.priority}`);
      console.log(`     Metadata: ${JSON.stringify(c.metadata)}`);
      console.log(`     Created: ${c.createdAt.toISOString()}`);
    });
    console.log('');

    // Check ticket-conversation mapping
    const ticketsWithConversations = await prisma.ticket.findMany({
      where: { tenantId: targetTenantId },
      select: { id: true, subject: true },
    });

    let mappedCount = 0;
    let unmappedCount = 0;

    console.log('🔗 Checking Ticket-Conversation Mapping:');
    for (const ticket of ticketsWithConversations) {
      const conversationId = `conv_ticket_${ticket.id}`;
      const conversation = await prisma.conversationAdvanced.findUnique({
        where: { id: conversationId },
      });

      if (conversation) {
        console.log(`   ✅ Ticket ${ticket.id} → Conversation ${conversationId}`);
        mappedCount++;
      } else {
        console.log(`   ❌ Ticket ${ticket.id} has NO conversation`);
        unmappedCount++;
      }
    }
    console.log('');

    // Check users
    const users = await prisma.user.findMany({
      where: { tenantId: targetTenantId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    console.log(`👤 Found ${users.length} user(s) for tenant ${targetTenantId}:`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
      console.log(`     ID: ${u.id}`);
      console.log(`     Name: ${u.firstName} ${u.lastName}`);
    });
    console.log('');

    // Check channels
    const channels = await prisma.channel.findMany({
      where: { tenantId: targetTenantId },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });

    console.log(`📡 Found ${channels.length} channel(s) for tenant ${targetTenantId}:`);
    channels.forEach(ch => {
      console.log(`   - ${ch.name} (${ch.type}) - ${ch.isActive ? 'Active' : 'Inactive'}`);
      console.log(`     ID: ${ch.id}`);
    });
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log(`   Tenants: ${tenants.length}`);
    console.log(`   Tickets: ${tickets.length}`);
    console.log(`   Conversations: ${conversations.length}`);
    console.log(`   Mapped: ${mappedCount}`);
    console.log(`   Unmapped: ${unmappedCount}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Channels: ${channels.length}`);
    console.log('');

    if (unmappedCount > 0) {
      console.log('⚠️  WARNING: Some tickets do not have conversations!');
      console.log('   Run: node scripts/migrate-tickets-to-conversations.js');
    } else if (mappedCount > 0) {
      console.log('✅ All tickets have corresponding conversations!');
    }

    if (conversations.length === 0 && tickets.length > 0) {
      console.log('❌ ERROR: Tickets exist but no conversations found!');
      console.log('   Run: node scripts/migrate-tickets-to-conversations.js');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get tenantId from command line args
const tenantId = process.argv[2];

// Run verification
verifySetup(tenantId)
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

