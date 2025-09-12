const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1) Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'acme' },
    update: {},
    create: {
      name: 'Acme Inc',
      slug: 'acme',
      subdomain: 'acme',
      plan: 'starter',
      status: 'active',
      settings: { branding: { name: 'Acme Support' } },
    },
  })
  console.log('✅ Tenant:', tenant.name)

  // 2) Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {
      tenantId: tenant.id,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Admin123!', 10),
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@acme.com',
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Admin123!', 10),
    },
  })

  const agent = await prisma.user.upsert({
    where: { email: 'agent@acme.com' },
    update: {
      tenantId: tenant.id,
      role: 'agent',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Agent123!', 10),
    },
    create: {
      tenantId: tenant.id,
      email: 'agent@acme.com',
      firstName: 'Bob',
      lastName: 'Agent',
      role: 'agent',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Agent123!', 10),
    },
  })
  console.log('✅ Users:', admin.email, agent.email)

  // Agent Profile for routing realism
  const agentProfile = await prisma.agentProfile.upsert({
    where: { userId: agent.id },
    update: {
      skills: ['billing','integration','technical'],
      languages: ['en','fr'],
      maxConcurrentTickets: 5,
      autoAssign: true,
    },
    create: {
      userId: agent.id,
      displayName: 'Bob Agent',
      bio: 'Senior support engineer specialized in billing and integrations.',
      skills: ['billing','integration','technical'],
      languages: ['en','fr'],
      timezone: 'UTC',
      workingHours: { mon: { start: '09:00', end: '17:00' } },
      maxConcurrentTickets: 5,
      autoAssign: true,
      notificationSettings: { email: true },
    },
  })
  console.log('✅ Agent profile:', agentProfile.userId)

  // 3) Channels
  const emailChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: 'email' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Email Support',
      type: 'email',
      config: { from: 'support@acme.com' },
      isActive: true,
    },
  })

  const whatsappChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: 'whatsapp' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'WhatsApp Business',
      type: 'whatsapp',
      config: { phone: '+14155550123' },
      isActive: true,
    },
  })

  const instagramChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: 'instagram' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Instagram DM',
      type: 'instagram',
      config: {},
      isActive: true,
    },
  })
  console.log('✅ Channels:', emailChannel.type, whatsappChannel.type, instagramChannel.type)

  // 4) Customers
  const customer1 = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'walid.housni.30@gmail.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'walid.housni.30@gmail.com',
      firstName: 'Walid',
      lastName: 'Housni',
      company: 'Acme',
      tags: ['vip'],
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'demo@customer.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'demo@customer.com',
      firstName: 'Demo',
      lastName: 'Customer',
      company: 'Demo Co',
      tags: ['trial'],
    },
  })
  console.log('✅ Customers:', customer1.email, customer2.email)

  // 5) Tickets
  const t1 = await prisma.ticket.create({
    data: {
      tenantId: tenant.id,
      customerId: customer1.id,
      channelId: emailChannel.id,
      subject: 'Unable to access premium features',
      description: 'Upgraded yesterday but still cannot access premium.',
      priority: 'high',
      status: 'open',
      assignedAgentId: agent.id,
      tags: ['billing','premium'],
    },
  })

  const t2 = await prisma.ticket.create({
    data: {
      tenantId: tenant.id,
      customerId: customer2.id,
      channelId: whatsappChannel.id,
      subject: 'Integration API returns 500 errors',
      description: 'Started this morning; impacting production.',
      priority: 'critical',
      status: 'open',
      tags: ['api','critical'],
    },
  })

  const t3 = await prisma.ticket.create({
    data: {
      tenantId: tenant.id,
      customerId: customer2.id,
      channelId: instagramChannel.id,
      subject: 'Request custom dashboard features',
      description: 'Looking to discuss customizations.',
      priority: 'medium',
      status: 'waiting',
      assignedAgentId: admin.id,
      tags: ['feature-request'],
    },
  })
  console.log('✅ Tickets:', t1.id, t2.id, t3.id)

  // 6) SLA policy + instance for t1
  const sla = await prisma.sLAPolicy.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Default SLA' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Default SLA',
      description: 'First response in 2h, resolution in 24h',
      priority: 'medium',
      isActive: true,
      conditions: [],
      targets: { responseTime: 120, resolutionTime: 1440 },
      businessHours: { enabled: true, timezone: 'UTC' },
      holidays: [],
      escalationRules: [],
      notifications: [],
      metadata: {},
    },
  })

  await prisma.sLAInstance.create({
    data: {
      slaId: sla.id,
      ticketId: t1.id,
      status: 'active',
      firstResponseDue: new Date(Date.now() + 2 * 60 * 60 * 1000),
      resolutionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ SLA seeded')

  // 7) FAQ articles (optional quick help)
  await prisma.faqArticle.createMany({
    data: [
      { tenantId: tenant.id, title: 'Getting Started', content: 'Welcome to the help center.', category: 'General', isPublished: true },
      { tenantId: tenant.id, title: 'Billing FAQ', content: 'Common billing questions.', category: 'Billing', isPublished: true },
    ],
    skipDuplicates: true,
  })

  // 7.5) Knowledge Base articles (published)
  const kb1 = await prisma.knowledgeBase.findFirst({ where: { tenantId: tenant.id, title: 'Reset your password' } })
  if (!kb1) {
    await prisma.knowledgeBase.create({
      data: {
        tenantId: tenant.id,
        title: 'Reset your password',
        content: '<h1>Reset your password</h1><p>Use the “Forgot password” link on the login page. You will receive an email with a secure link to create a new password. For security, the link expires after 60 minutes.</p><ol><li>Go to the login page</li><li>Click “Forgot password”</li><li>Check your email and follow the link</li><li>Choose a strong new password</li></ol>',
        category: 'account',
        tags: ['password','account','security'],
        isPublished: true,
      },
    })
  }
  const kb2 = await prisma.knowledgeBase.findFirst({ where: { tenantId: tenant.id, title: 'Set up email sending (SMTP)' } })
  if (!kb2) {
    await prisma.knowledgeBase.create({
      data: {
        tenantId: tenant.id,
        title: 'Set up email sending (SMTP)',
        content: '<h1>Configure SMTP</h1><p>To send branded emails, configure your SMTP provider and verify DKIM/SPF.</p><h2>Steps</h2><ol><li>Open Admin → Settings → Email</li><li>Enter SMTP credentials</li><li>Add DKIM/SPF DNS records</li><li>Validate DNS</li><li>Send a test email</li></ol>',
        category: 'email',
        tags: ['email','smtp','dkim','spf'],
        isPublished: true,
      },
    })
  }

  // 8) CRM: Sales Pipeline, Lead, Deal, Segment
  const pipeline = await prisma.salesPipeline.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Default Pipeline' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Default Pipeline',
      description: 'Standard sales pipeline',
      stages: {
        stages: [
          { id: 'new', name: 'New' },
          { id: 'qualified', name: 'Qualified' },
          { id: 'proposal', name: 'Proposal' },
          { id: 'negotiation', name: 'Negotiation' },
          { id: 'won', name: 'Won' },
          { id: 'lost', name: 'Lost' },
        ],
      },
      isDefault: true,
      isActive: true,
    },
  })

  const leadEmail = 'lead@acme.com'
  let lead = await prisma.lead.findFirst({ where: { tenantId: tenant.id, email: leadEmail } })
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        email: leadEmail,
        firstName: 'Liam',
        lastName: 'Lead',
        source: 'website',
        status: 'NEW',
        assignedUserId: admin.id,
        tags: ['high-intent'],
      },
    })
  }

  const deal = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      leadId: lead.id,
      customerId: customer1.id,
      name: 'Acme Pro Subscription',
      description: 'Yearly subscription for 10 seats',
      value: 2400,
      currency: 'USD',
      probability: 65,
      stage: 'QUALIFIED',
      pipelineId: pipeline.id,
      assignedUserId: admin.id,
      expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tags: ['subscription'],
    },
  })

  const segment = await prisma.customerSegment.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'VIP Customers' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'VIP Customers',
      description: 'High-value accounts',
      criteria: { tags: ['vip'] },
      isActive: true,
      isDynamic: true,
    },
  })

  await prisma.customerSegmentMembership.upsert({
    where: { segmentId_customerId: { segmentId: segment.id, customerId: customer1.id } },
    update: {},
    create: { segmentId: segment.id, customerId: customer1.id },
  })

  // 9) White Labeling: Brand assets, templates, toggles, portal, domain, API key
  const existingLogo = await prisma.brandAsset.findFirst({ where: { tenantId: tenant.id, type: 'logo' } })
  if (!existingLogo) {
    await prisma.brandAsset.create({
      data: {
        tenantId: tenant.id,
        type: 'logo',
        originalUrl: 'https://dummyimage.com/300x80/0f172a/ffffff&text=Acme+Logo',
        variants: [
          { size: '300x80', format: 'png', url: 'https://dummyimage.com/300x80/0f172a/ffffff&text=Acme+Logo' },
          { size: '64x64', format: 'png', url: 'https://dummyimage.com/64x64/0f172a/ffffff&text=A' },
        ],
        metadata: { brand: 'Acme' },
      },
    })
  }

  await prisma.whiteLabelTemplate.upsert({
    where: { tenantId_type_name: { tenantId: tenant.id, type: 'email', name: 'Welcome Email' } },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'email',
      name: 'Welcome Email',
      subject: 'Welcome to {{brand}}',
      content: '<html><body><h1>Welcome, {{firstName}}</h1><p>Thanks for joining {{brand}}.</p></body></html>',
      variables: ['firstName', 'brand'],
      isActive: true,
    },
  })

  await prisma.whiteLabelTemplate.upsert({
    where: { tenantId_type_name: { tenantId: tenant.id, type: 'api_doc', name: 'API Docs Branding' } },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'api_doc',
      name: 'API Docs Branding',
      content: '{ "primaryColor": "#0ea5e9", "logoUrl": "https://dummyimage.com/160x40/0f172a/ffffff&text=Acme+API" }',
      variables: [],
      isActive: true,
    },
  })

  await prisma.featureToggle.upsert({
    where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: 'white_label' } },
    update: { isEnabled: true },
    create: { tenantId: tenant.id, featureKey: 'white_label', isEnabled: true },
  })
  await prisma.featureToggle.upsert({
    where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: 'analytics' } },
    update: { isEnabled: true },
    create: { tenantId: tenant.id, featureKey: 'analytics', isEnabled: true },
  })
  await prisma.featureToggle.upsert({
    where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: 'customer_portal' } },
    update: { isEnabled: true },
    create: { tenantId: tenant.id, featureKey: 'customer_portal', isEnabled: true },
  })

  const portal = await prisma.customerPortal.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Acme Support Portal',
      description: 'Customer self-service portal for Acme',
      subdomain: 'acme-support',
      isActive: true,
      isPublished: true,
      branding: { name: 'Acme Support', colors: { primary: '#0ea5e9', secondary: '#0f172a' } },
      features: { kb: true, ticketSubmit: true, chat: false },
      customization: { navigation: [{ label: 'Home', url: '/' }, { label: 'Tickets', url: '/tickets' }] },
      seoSettings: { title: 'Acme Support', description: 'Help center and customer portal' },
      publishedAt: new Date(),
      lastPublishedAt: new Date(),
    },
  })

  await prisma.customDomain.upsert({
    where: { domain: 'support.acme.test' },
    update: { status: 'active', verifiedAt: new Date(), sslStatus: 'active' },
    create: {
      tenantId: tenant.id,
      portalId: portal.id,
      domain: 'support.acme.test',
      status: 'active',
      sslStatus: 'active',
      verifiedAt: new Date(),
      dnsRecords: [
        { type: 'CNAME', host: 'support', value: 'cname.glavito.example' },
      ],
    },
  })

  await prisma.mobileAppConfig.upsert({
    where: { tenantId_bundleId: { tenantId: tenant.id, bundleId: 'com.acme.support' } },
      update: {},
      create: {
      tenantId: tenant.id,
      appName: 'Acme Support',
      bundleId: 'com.acme.support',
      version: '1.0.0',
      features: ['chat', 'kb', 'tickets'],
      colorScheme: { primary: '#0ea5e9' },
    },
  })

  const apiKeyName = 'Default SDK Key'
  const existingKey = await prisma.apiKey.findUnique({ where: { tenantId_name: { tenantId: tenant.id, name: apiKeyName } } })
  if (!existingKey) {
    const plain = 'pk_acme_' + crypto.randomBytes(18).toString('hex')
    const keyHash = crypto.createHash('sha256').update(plain).digest('hex')
    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: apiKeyName,
        prefix: 'pk_acme_',
        keyHash,
        permissions: ['crm:read', 'crm:write', 'analytics:read', 'portal:publish'],
        isActive: true,
      },
    })
    console.log('🔑 API Key (store this now):', plain)
  }

  // 10) Email tracking sample
  const delivery = await prisma.emailDelivery.create({
    data: {
      tenantId: tenant.id,
      to: customer1.email,
      subject: 'Welcome to Acme Support',
      templateId: null,
      variables: { firstName: customer1.firstName || 'there' },
      status: 'sent',
      messageId: `msg_demo_${Date.now()}`,
      sentAt: new Date(),
    },
  })
  await prisma.emailEvent.create({
    data: {
      tenantId: tenant.id,
      deliveryId: delivery.id,
      type: 'delivered',
    },
  })

  // 11) Analytics seeds
  const reportTemplate = await prisma.analyticsReportTemplate.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Monthly Performance Summary' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Monthly Performance Summary',
      category: 'performance',
      definition: {
        metrics: [
          { name: 'Total Tickets', field: 'tickets', aggregation: 'count' },
          { name: 'SLA Breaches', field: 'slaBreaches', aggregation: 'count' },
        ],
        dimensions: [
          { name: 'Date', field: 'createdAt', type: 'date', groupBy: 'month' },
        ],
        visualizations: [
          { type: 'table', configuration: {} },
        ],
      },
    },
  })

  const dashboard = await prisma.analyticsDashboard.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'CX KPIs' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'CX KPIs',
      description: 'Key customer experience indicators',
      layout: { columns: 12 },
      isDefault: true,
      isPublic: false,
      createdById: admin.id,
    },
  })

  await prisma.analyticsDashboardWidget.create({
    data: {
      dashboardId: dashboard.id,
      type: 'metric',
      title: 'Open Tickets',
      position: { x: 0, y: 0 },
      size: { w: 3, h: 2 },
      configuration: { icon: 'Inbox', color: 'blue' },
      dataSource: { entity: 'tickets', filter: { status: 'open' } },
      sortOrder: 0,
      isVisible: true,
    },
  })

  await prisma.analyticsReport.create({
    data: {
      tenantId: tenant.id,
      templateId: reportTemplate.id,
      name: 'Monthly Performance Summary - Last Month',
      parameters: { period: 'last_month' },
      format: 'pdf',
      status: 'completed',
      fileUrl: 'https://example.com/reports/acme_monthly_performance.pdf',
      completedAt: new Date(),
    },
  })

  await prisma.analyticsExportJob.create({
    data: {
      tenantId: tenant.id,
      type: 'report',
      sourceId: reportTemplate.id,
      templateId: reportTemplate.id,
      format: 'csv',
      status: 'completed',
      fileUrl: 'https://example.com/exports/acme_monthly_performance.csv',
      requestedById: admin.id,
      completedAt: new Date(),
    },
  })

  // 12) CSAT sample
  await prisma.customerSatisfactionSurvey.create({
    data: {
      tenantId: tenant.id,
      customerId: customer1.id,
      rating: 5,
      comment: 'Great support experience!',
    },
  })

  // 8) Sample ConversationAdvanced records
  const conversation1 = await prisma.conversationAdvanced.upsert({
    where: { id: 'conv_1' },
    update: {},
    create: {
      id: 'conv_1',
      tenantId: tenant.id,
      customerId: customer1.id,
      channelId: emailChannel.id,
      subject: 'Product Support Request',
      status: 'active',
      priority: 'medium',
      assignedAgentId: agent.id,
      tags: ['support', 'product'],
      messageCount: 3,
      metadata: {
        ticketId: 'ticket_1',
        unreadCount: 1,
        source: 'email'
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  })

  const conversation2 = await prisma.conversationAdvanced.upsert({
    where: { id: 'conv_2' },
    update: {},
    create: {
      id: 'conv_2',
      tenantId: tenant.id,
      customerId: customer2.id,
      channelId: whatsappChannel.id,
      subject: 'Billing Question',
      status: 'waiting',
      priority: 'high',
      assignedAgentId: null,
      tags: ['billing', 'urgent'],
      messageCount: 1,
      metadata: {
        unreadCount: 1,
        source: 'whatsapp'
      },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  })

  const conversation3 = await prisma.conversationAdvanced.upsert({
    where: { id: 'conv_3' },
    update: {},
    create: {
      id: 'conv_3',
      tenantId: tenant.id,
      customerId: customer2.id,
      channelId: instagramChannel.id,
      subject: 'General Inquiry',
      status: 'closed',
      priority: 'low',
      assignedAgentId: agent.id,
      tags: ['general'],
      messageCount: 5,
      metadata: {
        unreadCount: 0,
        source: 'instagram',
        closeReason: 'resolved'
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      lastMessageAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      closedBy: agent.id,
      closeReason: 'resolved',
    },
  })

  // 9) Sample MessageAdvanced records
  await prisma.messageAdvanced.upsert({
    where: { id: 'msg_1' },
    update: {},
    create: {
      id: 'msg_1',
      conversationId: conversation1.id,
      senderId: customer1.id,
      senderType: 'customer',
      content: 'Hi, I need help with my recent order. The tracking shows it was delivered but I haven\'t received it.',
      messageType: 'text',
      channel: 'email',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  })

  await prisma.messageAdvanced.upsert({
    where: { id: 'msg_2' },
    update: {},
    create: {
      id: 'msg_2',
      conversationId: conversation1.id,
      senderId: agent.id,
      senderType: 'agent',
      content: 'I\'ll help you track down your order. Let me check the delivery details for you.',
      messageType: 'text',
      channel: 'email',
      createdAt: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
    },
  })

  await prisma.messageAdvanced.upsert({
    where: { id: 'msg_3' },
    update: {},
    create: {
      id: 'msg_3',
      conversationId: conversation1.id,
      senderId: customer1.id,
      senderType: 'customer',
      content: 'Thank you! The order number is #12345.',
      messageType: 'text',
      channel: 'email',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
  })

  await prisma.messageAdvanced.upsert({
    where: { id: 'msg_4' },
    update: {},
    create: {
      id: 'msg_4',
      conversationId: conversation2.id,
      senderId: customer2.id,
      senderType: 'customer',
      content: 'I was charged twice for my subscription. Can you help me get a refund?',
      messageType: 'text',
      channel: 'whatsapp',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
  })

  await prisma.messageAdvanced.upsert({
    where: { id: 'msg_5' },
    update: {},
    create: {
      id: 'msg_5',
      conversationId: conversation3.id,
      senderId: customer2.id,
      senderType: 'customer',
      content: 'What are your business hours?',
      messageType: 'text',
      channel: 'instagram',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  })

  console.log('✅ Sample conversations and messages created')

  console.log('🎉 Seeding completed.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })