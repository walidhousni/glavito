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

  await prisma.deal.create({
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

  // ========= WALID-HOUSNI-30 TENANT =========
  const wTenant = await prisma.tenant.upsert({
    where: { subdomain: 'walid-housni-30' },
    update: {},
    create: {
      name: 'Walid Housni Workspace',
      slug: 'walid-housni-30',
      subdomain: 'walid-housni-30',
      plan: 'pro',
      status: 'active',
      settings: { branding: { name: 'Walid Support' } },
    },
  })
  console.log('✅ Tenant:', wTenant.name)

  // Users
  const wAdmin = await prisma.user.upsert({
    where: { email: 'walid.housni.30@gmail.com' },
    update: {
      tenantId: wTenant.id,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('password1234', 10),
    },
    create: {
      tenantId: wTenant.id,
      email: 'walid.housni.30@gmail.com',
      firstName: 'Walid',
      lastName: 'Housni',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('password1234', 10),
    },
  })

  const wAgent = await prisma.user.upsert({
    where: { email: 'agent@walid-housni-30.com' },
    update: {
      tenantId: wTenant.id,
      role: 'agent',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Agent123!', 10),
    },
    create: {
      tenantId: wTenant.id,
      email: 'agent@walid-housni-30.com',
      firstName: 'Wafa',
      lastName: 'Agent',
      role: 'agent',
      status: 'active',
      emailVerified: true,
      passwordHash: bcrypt.hashSync('Agent123!', 10),
    },
  })
  console.log('✅ Users:', wAdmin.email, wAgent.email)

  const wAgentProfile = await prisma.agentProfile.upsert({
    where: { userId: wAgent.id },
    update: {
      skills: ['billing','integration','technical'],
      languages: ['en','ar'],
      maxConcurrentTickets: 6,
      autoAssign: true,
    },
    create: {
      userId: wAgent.id,
      displayName: 'Wafa Agent',
      bio: 'Support engineer fluent in EN/AR.',
      skills: ['billing','integration','technical'],
      languages: ['en','ar'],
      timezone: 'UTC',
      workingHours: { mon: { start: '09:00', end: '17:00' } },
      maxConcurrentTickets: 6,
      autoAssign: true,
      notificationSettings: { email: true },
    },
  })
  console.log('✅ Agent profile:', wAgentProfile.userId)

  // Channels
  const wEmailChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: wTenant.id, type: 'email' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Walid Email Support',
      type: 'email',
      config: { from: 'support@walid-housni-30.com' },
      isActive: true,
    },
  })
  const wWhatsAppChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: wTenant.id, type: 'whatsapp' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Walid WhatsApp',
      type: 'whatsapp',
      config: { phone: '+14155550999' },
      isActive: true,
    },
  })
  const wInstagramChannel = await prisma.channel.upsert({
    where: { tenantId_type: { tenantId: wTenant.id, type: 'instagram' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Walid Instagram DM',
      type: 'instagram',
      config: {},
      isActive: true,
    },
  })
  console.log('✅ Channels:', wEmailChannel.type, wWhatsAppChannel.type, wInstagramChannel.type)

  // Customers
  const wCustomer1 = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: wTenant.id, email: 'client1@walid-housni-30.com' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      email: 'client1@walid-housni-30.com',
      firstName: 'Client',
      lastName: 'One',
      company: 'Walid Co',
      tags: ['vip'],
    },
  })
  const wCustomer2 = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId: wTenant.id, email: 'client2@walid-housni-30.com' } },
    update: {
      phone: '+212708014380',
      customFields: {
        instagramId: '17841405822304914',
        marketingPreferences: { whatsappOptOut: false, emailOptOut: false }
      }
    },
    create: {
      tenantId: wTenant.id,
      email: 'client2@walid-housni-30.com',
      firstName: 'Client',
      lastName: 'Two',
      company: 'Walid Co',
      phone: '+212708014380',
      tags: ['trial'],
      customFields: {
        instagramId: '17841405822304914',
        marketingPreferences: { whatsappOptOut: false, emailOptOut: false }
      }
    },
  })
  console.log('✅ Customers:', wCustomer1.email, wCustomer2.email)

  // Tickets
  const wt1 = await prisma.ticket.create({
    data: {
      tenantId: wTenant.id,
      customerId: wCustomer1.id,
      channelId: wEmailChannel.id,
      subject: 'Payment failed at checkout',
      description: 'Card declined during checkout.',
      priority: 'high',
      status: 'open',
      assignedAgentId: wAgent.id,
      tags: ['billing','checkout'],
    },
  })
  const wt2 = await prisma.ticket.create({
    data: {
      tenantId: wTenant.id,
      customerId: wCustomer2.id,
      channelId: wWhatsAppChannel.id,
      subject: 'API throttling limits',
      description: 'Hitting rate limits frequently.',
      priority: 'urgent',
      status: 'open',
      tags: ['api','rate-limit'],
    },
  })
  const wt3 = await prisma.ticket.create({
    data: {
      tenantId: wTenant.id,
      customerId: wCustomer2.id,
      channelId: wInstagramChannel.id,
      subject: 'Feature request: dark mode',
      description: 'Please add dark mode to the portal.',
      priority: 'medium',
      status: 'waiting',
      assignedAgentId: wAdmin.id,
      tags: ['feature-request'],
    },
  })
  console.log('✅ Tickets:', wt1.id, wt2.id, wt3.id)

  // SLA policy and instance
  const wSla = await prisma.sLAPolicy.upsert({
    where: { tenantId_name: { tenantId: wTenant.id, name: 'Default SLA' } },
    update: {},
    create: {
      tenantId: wTenant.id,
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
      slaId: wSla.id,
      ticketId: wt1.id,
      status: 'active',
      firstResponseDue: new Date(Date.now() + 2 * 60 * 60 * 1000),
      resolutionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ SLA seeded (walid)')

  // FAQs and KB
  await prisma.faqArticle.createMany({
    data: [
      { tenantId: wTenant.id, title: 'Getting Started (Walid)', content: 'Welcome to Walid support.', category: 'General', isPublished: true },
      { tenantId: wTenant.id, title: 'Payments FAQ', content: 'Common payment questions.', category: 'Billing', isPublished: true },
    ],
    skipDuplicates: true,
  })
  const wkb1 = await prisma.knowledgeBase.findFirst({ where: { tenantId: wTenant.id, title: 'Reset two-factor authentication' } })
  if (!wkb1) {
    await prisma.knowledgeBase.create({
      data: {
        tenantId: wTenant.id,
        title: 'Reset two-factor authentication',
        content: '<h1>Reset 2FA</h1><p>Contact support to reset 2FA if locked out.</p>',
        category: 'account',
        tags: ['2fa','account','security'],
        isPublished: true,
      },
    })
  }

  // CRM
  const wPipeline = await prisma.salesPipeline.upsert({
    where: { tenantId_name: { tenantId: wTenant.id, name: 'Default Pipeline' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Default Pipeline',
      description: 'Standard sales pipeline',
      stages: { stages: [
        { id: 'new', name: 'New' },
        { id: 'qualified', name: 'Qualified' },
        { id: 'proposal', name: 'Proposal' },
        { id: 'negotiation', name: 'Negotiation' },
        { id: 'won', name: 'Won' },
        { id: 'lost', name: 'Lost' },
      ]},
      isDefault: true,
      isActive: true,
    },
  })
  const wLeadEmail = 'lead@walid-housni-30.com'
  let wLead = await prisma.lead.findFirst({ where: { tenantId: wTenant.id, email: wLeadEmail } })
  if (!wLead) {
    wLead = await prisma.lead.create({
      data: {
        tenantId: wTenant.id,
        email: wLeadEmail,
        firstName: 'Meryem',
        lastName: 'Lead',
        source: 'website',
        status: 'NEW',
        assignedUserId: wAdmin.id,
        tags: ['high-intent'],
      },
    })
  }
  await prisma.deal.create({
    data: {
      tenantId: wTenant.id,
      leadId: wLead.id,
      customerId: wCustomer1.id,
      name: 'Pro Subscription - 5 seats',
      description: 'Yearly subscription for 5 seats',
      value: 1200,
      currency: 'USD',
      probability: 60,
      stage: 'QUALIFIED',
      pipelineId: wPipeline.id,
      assignedUserId: wAdmin.id,
      expectedCloseDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      tags: ['subscription'],
    },
  })
  const wSegment = await prisma.customerSegment.upsert({
    where: { tenantId_name: { tenantId: wTenant.id, name: 'Priority Customers' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Priority Customers',
      description: 'High-value accounts',
      criteria: { tags: ['vip'] },
      isActive: true,
      isDynamic: true,
    },
  })
  await prisma.customerSegmentMembership.upsert({
    where: { segmentId_customerId: { segmentId: wSegment.id, customerId: wCustomer1.id } },
    update: {},
    create: { segmentId: wSegment.id, customerId: wCustomer1.id },
  })

  // Branding / portal / toggles
  const wLogo = await prisma.brandAsset.findFirst({ where: { tenantId: wTenant.id, type: 'logo' } })
  if (!wLogo) {
    await prisma.brandAsset.create({
      data: {
        tenantId: wTenant.id,
        type: 'logo',
        originalUrl: 'https://dummyimage.com/300x80/1f2937/ffffff&text=Walid+Logo',
        variants: [
          { size: '300x80', format: 'png', url: 'https://dummyimage.com/300x80/1f2937/ffffff&text=Walid+Logo' },
          { size: '64x64', format: 'png', url: 'https://dummyimage.com/64x64/1f2937/ffffff&text=W' },
        ],
        metadata: { brand: 'Walid' },
      },
    })
  }
  await prisma.whiteLabelTemplate.upsert({
    where: { tenantId_type_name: { tenantId: wTenant.id, type: 'email', name: 'Welcome Email' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      type: 'email',
      name: 'Welcome Email',
      subject: 'Welcome to {{brand}}',
      content: '<html><body><h1>Welcome, {{firstName}}</h1><p>Thanks for joining {{brand}}.</p></body></html>',
      variables: ['firstName', 'brand'],
      isActive: true,
    },
  })
  await prisma.whiteLabelTemplate.upsert({
    where: { tenantId_type_name: { tenantId: wTenant.id, type: 'api_doc', name: 'API Docs Branding' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      type: 'api_doc',
      name: 'API Docs Branding',
      content: '{ "primaryColor": "#0ea5e9", "logoUrl": "https://dummyimage.com/160x40/1f2937/ffffff&text=Walid+API" }',
      variables: [],
      isActive: true,
    },
  })
  await prisma.featureToggle.upsert({ where: { tenantId_featureKey: { tenantId: wTenant.id, featureKey: 'white_label' } }, update: { isEnabled: true }, create: { tenantId: wTenant.id, featureKey: 'white_label', isEnabled: true } })
  await prisma.featureToggle.upsert({ where: { tenantId_featureKey: { tenantId: wTenant.id, featureKey: 'analytics' } }, update: { isEnabled: true }, create: { tenantId: wTenant.id, featureKey: 'analytics', isEnabled: true } })
  await prisma.featureToggle.upsert({ where: { tenantId_featureKey: { tenantId: wTenant.id, featureKey: 'customer_portal' } }, update: { isEnabled: true }, create: { tenantId: wTenant.id, featureKey: 'customer_portal', isEnabled: true } })

  const wPortal = await prisma.customerPortal.upsert({
    where: { tenantId: wTenant.id },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Walid Support Portal',
      description: 'Customer self-service portal',
      subdomain: 'walid-support',
      isActive: true,
      isPublished: true,
      branding: { name: 'Walid Support', colors: { primary: '#0ea5e9', secondary: '#1f2937' } },
      features: { kb: true, ticketSubmit: true, chat: false },
      customization: { navigation: [{ label: 'Home', url: '/' }, { label: 'Tickets', url: '/tickets' }] },
      seoSettings: { title: 'Walid Support', description: 'Help center' },
      publishedAt: new Date(),
      lastPublishedAt: new Date(),
    },
  })
  await prisma.customDomain.upsert({
    where: { domain: 'support.walid-housni-30.test' },
    update: { status: 'active', verifiedAt: new Date(), sslStatus: 'active' },
    create: {
      tenantId: wTenant.id,
      portalId: wPortal.id,
      domain: 'support.walid-housni-30.test',
      status: 'active',
      sslStatus: 'active',
      verifiedAt: new Date(),
      dnsRecords: [ { type: 'CNAME', host: 'support', value: 'cname.glavito.example' } ],
    },
  })
  await prisma.mobileAppConfig.upsert({
    where: { tenantId_bundleId: { tenantId: wTenant.id, bundleId: 'com.walid.housni.support' } },
    update: {},
    create: { tenantId: wTenant.id, appName: 'Walid Support', bundleId: 'com.walid.housni.support', version: '1.0.0', features: ['chat','kb','tickets'], colorScheme: { primary: '#0ea5e9' } },
  })

  const wApiKeyName = 'Walid Default SDK Key'
  const wExistingKey = await prisma.apiKey.findUnique({ where: { tenantId_name: { tenantId: wTenant.id, name: wApiKeyName } } })
  if (!wExistingKey) {
    const wPlain = 'pk_walid_' + crypto.randomBytes(18).toString('hex')
    const wHash = crypto.createHash('sha256').update(wPlain).digest('hex')
    await prisma.apiKey.create({ data: { tenantId: wTenant.id, name: wApiKeyName, prefix: 'pk_walid_', keyHash: wHash, permissions: ['crm:read','crm:write','analytics:read','portal:publish'], isActive: true } })
    console.log('🔑 API Key (store this now):', wPlain)
  }

  // Email tracking sample
  const wDelivery = await prisma.emailDelivery.create({
    data: {
      tenantId: wTenant.id,
      to: wCustomer1.email,
      subject: 'Welcome to Walid Support',
      templateId: null,
      variables: { firstName: wCustomer1.firstName || 'there' },
      status: 'sent',
      messageId: `msg_demo_w_${Date.now()}`,
      sentAt: new Date(),
    },
  })
  await prisma.emailEvent.create({ data: { tenantId: wTenant.id, deliveryId: wDelivery.id, type: 'delivered' } })

  // Analytics
  const wReportTemplate = await prisma.analyticsReportTemplate.upsert({
    where: { tenantId_name: { tenantId: wTenant.id, name: 'Monthly Performance Summary' } },
    update: {},
    create: {
      tenantId: wTenant.id,
      name: 'Monthly Performance Summary',
      category: 'performance',
      definition: {
        metrics: [ { name: 'Total Tickets', field: 'tickets', aggregation: 'count' }, { name: 'SLA Breaches', field: 'slaBreaches', aggregation: 'count' } ],
        dimensions: [ { name: 'Date', field: 'createdAt', type: 'date', groupBy: 'month' } ],
        visualizations: [ { type: 'table', configuration: {} } ],
      },
    },
  })
  const wDashboard = await prisma.analyticsDashboard.upsert({
    where: { tenantId_name: { tenantId: wTenant.id, name: 'CX KPIs' } },
    update: {},
    create: { tenantId: wTenant.id, name: 'CX KPIs', description: 'Key customer experience indicators', layout: { columns: 12 }, isDefault: true, isPublic: false, createdById: wAdmin.id },
  })
  await prisma.analyticsDashboardWidget.create({
    data: { dashboardId: wDashboard.id, type: 'metric', title: 'Open Tickets', position: { x: 0, y: 0 }, size: { w: 3, h: 2 }, configuration: { icon: 'Inbox', color: 'blue' }, dataSource: { entity: 'tickets', filter: { status: 'open' } }, sortOrder: 0, isVisible: true },
  })
  await prisma.analyticsReport.create({
    data: { tenantId: wTenant.id, templateId: wReportTemplate.id, name: 'Monthly Performance Summary - Last Month', parameters: { period: 'last_month' }, format: 'pdf', status: 'completed', fileUrl: 'https://example.com/reports/walid_monthly_performance.pdf', completedAt: new Date() },
  })
  await prisma.analyticsExportJob.create({
    data: { tenantId: wTenant.id, type: 'report', sourceId: wReportTemplate.id, templateId: wReportTemplate.id, format: 'csv', status: 'completed', fileUrl: 'https://example.com/exports/walid_monthly_performance.csv', requestedById: wAdmin.id, completedAt: new Date() },
  })

  // CSAT sample
  await prisma.customerSatisfactionSurvey.create({ data: { tenantId: wTenant.id, customerId: wCustomer1.id, rating: 4, comment: 'Quick resolution. Thanks!' } })

  // Advanced conversations and messages
  const wConv1 = await prisma.conversationAdvanced.upsert({
    where: { id: 'wal_conv_1' },
    update: {},
    create: {
      id: 'wal_conv_1',
      tenantId: wTenant.id,
      customerId: wCustomer1.id,
      channelId: wEmailChannel.id,
      subject: 'Order Issue',
      status: 'active',
      priority: 'medium',
      assignedAgentId: wAgent.id,
      tags: ['support','order'],
      messageCount: 2,
      metadata: { unreadCount: 0, source: 'email' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  })
  await prisma.conversationAdvanced.upsert({
    where: { id: 'wal_conv_2' },
    update: {},
    create: {
      id: 'wal_conv_2',
      tenantId: wTenant.id,
      customerId: wCustomer2.id,
      channelId: wWhatsAppChannel.id,
      subject: 'Refund Request',
      status: 'waiting',
      priority: 'high',
      assignedAgentId: null,
      tags: ['billing','refund'],
      messageCount: 1,
      metadata: { unreadCount: 1, source: 'whatsapp' },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  })
  await prisma.messageAdvanced.upsert({
    where: { id: 'wal_msg_1' },
    update: {},
    create: {
      id: 'wal_msg_1',
      conversationId: wConv1.id,
      senderId: wCustomer1.id,
      senderType: 'customer',
      content: 'I cannot track my order.',
      messageType: 'text',
      channel: 'email',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  })
  await prisma.messageAdvanced.upsert({
    where: { id: 'wal_msg_2' },
    update: {},
    create: {
      id: 'wal_msg_2',
      conversationId: wConv1.id,
      senderId: wAgent.id,
      senderType: 'agent',
      content: 'I am checking this for you now.',
      messageType: 'text',
      channel: 'email',
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
    },
  })
  // AI Analysis Results for both tenants
  const aiAnalysisData = [
    {
      id: 'ai_analysis_1',
      tenantId: tenant.id,
      conversationId: conversation1.id,
      customerId: customer1.id,
      content: 'Hi, I need help with my recent order. The tracking shows it was delivered but I haven\'t received it.',
      results: {
        sentiment: { score: 0.3, label: 'frustrated', confidence: 0.85 },
        intent: { primary: 'order_support', confidence: 0.92 },
        urgency: { score: 0.8, label: 'high', confidence: 0.78 },
        classification: { category: 'shipping', subcategory: 'delivery_issue', confidence: 0.89 },
        keyPhrases: ['order', 'delivered', 'not received', 'tracking'],
        entities: [{ type: 'order', value: 'recent order' }],
        suggestedActions: ['Check tracking details', 'Contact carrier', 'Offer replacement'],
        coaching: {
          clarity: 0.85,
          filler: 0.15,
          sentiment: 0.3,
          effectiveness: 0.7
        }
      },
      processingTime: 1200,
      confidence: 0.87,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'ai_analysis_2',
      tenantId: tenant.id,
      conversationId: conversation1.id,
      customerId: customer1.id,
      content: 'I\'ll help you track down your order. Let me check the delivery details for you.',
      results: {
        sentiment: { score: 0.8, label: 'helpful', confidence: 0.91 },
        intent: { primary: 'provide_support', confidence: 0.88 },
        urgency: { score: 0.6, label: 'medium', confidence: 0.82 },
        classification: { category: 'agent_response', subcategory: 'acknowledgment', confidence: 0.94 },
        keyPhrases: ['help', 'track down', 'delivery details', 'check'],
        entities: [],
        suggestedActions: ['Follow up with carrier', 'Provide tracking update', 'Set expectation'],
        coaching: {
          clarity: 0.92,
          filler: 0.08,
          sentiment: 0.8,
          effectiveness: 0.88
        }
      },
      processingTime: 980,
      confidence: 0.89,
      createdAt: new Date(Date.now() - 90 * 60 * 1000)
    },
    {
      id: 'ai_analysis_3',
      tenantId: tenant.id,
      conversationId: conversation2.id,
      customerId: customer2.id,
      content: 'I was charged twice for my subscription. Can you help me get a refund?',
      results: {
        sentiment: { score: 0.2, label: 'concerned', confidence: 0.83 },
        intent: { primary: 'billing_support', confidence: 0.95 },
        urgency: { score: 0.9, label: 'critical', confidence: 0.87 },
        classification: { category: 'billing', subcategory: 'duplicate_charge', confidence: 0.93 },
        keyPhrases: ['charged twice', 'subscription', 'refund', 'help'],
        entities: [{ type: 'financial', value: 'subscription' }],
        suggestedActions: ['Check payment history', 'Process refund', 'Explain billing cycle'],
        coaching: {
          clarity: 0.78,
          filler: 0.12,
          sentiment: 0.2,
          effectiveness: 0.65
        }
      },
      processingTime: 1150,
      confidence: 0.91,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  ]

  // Seed AI analysis data
  for (const analysis of aiAnalysisData) {
    await prisma.aIAnalysisResult.upsert({
      where: { id: analysis.id },
      update: {},
      create: analysis
    })
  }

  // AI Models for both tenants
  const aiModels = [
    {
      id: 'ai_model_1',
      tenantId: tenant.id,
      name: 'Sentiment Analysis v1',
      type: 'sentiment',
      status: 'ready',
      configuration: { model: 'roberta-base', threshold: 0.7 },
      accuracy: 0.89,
      version: '1.0',
      isActive: true,
      description: 'Customer sentiment analysis model'
    },
    {
      id: 'ai_model_2',
      tenantId: tenant.id,
      name: 'Intent Classification v1',
      type: 'classification',
      status: 'ready',
      configuration: { model: 'bert-base', classes: ['support', 'billing', 'technical'] },
      accuracy: 0.92,
      version: '1.0',
      isActive: true,
      description: 'Customer intent classification model'
    },
    {
      id: 'ai_model_3',
      tenantId: wTenant.id,
      name: 'Walid Sentiment Analysis',
      type: 'sentiment',
      status: 'ready',
      configuration: { model: 'roberta-base', threshold: 0.75 },
      accuracy: 0.87,
      version: '1.0',
      isActive: true,
      description: 'Custom sentiment analysis for Walid workspace'
    }
  ]

  for (const model of aiModels) {
    await prisma.aIModel.upsert({
      where: { id: model.id },
      update: {},
      create: model
    })
  }

  // Model Training Jobs
  const trainingJobs = [
    {
      id: 'training_job_1',
      tenantId: tenant.id,
      modelId: 'ai_model_1',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      duration: 4 * 60 * 60 * 1000,
      trainingDataSize: 10000,
      hyperparameters: { learningRate: 0.001, batchSize: 32 },
      metrics: { accuracy: 0.89, precision: 0.87, recall: 0.91 },
      logs: ['Training started', 'Epoch 1 completed', 'Model converged', 'Training completed']
    },
    {
      id: 'training_job_2',
      tenantId: wTenant.id,
      modelId: 'ai_model_3',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      duration: 3 * 60 * 60 * 1000,
      trainingDataSize: 5000,
      hyperparameters: { learningRate: 0.002, batchSize: 16 },
      metrics: { accuracy: 0.87, precision: 0.85, recall: 0.89 },
      logs: ['Training started', 'Epoch 1 completed', 'Model converged', 'Training completed']
    }
  ]

  for (const job of trainingJobs) {
    await prisma.modelTrainingJob.upsert({
      where: { id: job.id },
      update: {},
      create: job
    })
  }

  // Coaching Sessions and Outcomes
  const coachingSessions = [
    {
      id: 'coaching_1',
      tenantId: tenant.id,
      coachUserId: admin.id,
      agentUserId: agent.id,
      topic: 'Customer Communication',
      notes: 'Worked on improving clarity and reducing filler words',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: 'completed',
      feedbackScore: 8
    },
    {
      id: 'coaching_2',
      tenantId: wTenant.id,
      coachUserId: wAdmin.id,
      agentUserId: wAgent.id,
      topic: 'Response Time Optimization',
      notes: 'Focused on faster initial responses and better issue resolution',
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      status: 'completed',
      feedbackScore: 9
    }
  ]

  for (const session of coachingSessions) {
    await prisma.coachingSession.upsert({
      where: { id: session.id },
      update: {},
      create: session
    })
  }

  // Coaching Outcomes
  const coachingOutcomes = [
    {
      id: 'outcome_1',
      tenantId: tenant.id,
      agentUserId: agent.id,
      periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now()),
      metrics: {
        clarityDelta: 0.15,
        fillerDelta: -0.08,
        sentimentDelta: 0.12,
        samples: 45
      },
      effectivenessScore: 0.82
    },
    {
      id: 'outcome_2',
      tenantId: wTenant.id,
      agentUserId: wAgent.id,
      periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now()),
      metrics: {
        clarityDelta: 0.18,
        fillerDelta: -0.12,
        sentimentDelta: 0.15,
        samples: 32
      },
      effectivenessScore: 0.87
    }
  ]

  for (const outcome of coachingOutcomes) {
    await prisma.coachingOutcome.upsert({
      where: { id: outcome.id },
      update: {},
      create: outcome
    })
  }

  console.log('✅ AI Analysis data seeded')
  console.log('✅ Walid tenant seeded')

  // === Additional Walid seeding: teams, channels, customers, tickets, SLA breach, conversations, internal comms ===
  try {
    // 1) Teams
    const wSupportTeam = await prisma.team.upsert({
      where: { tenantId_name: { tenantId: wTenant.id, name: 'Support' } },
      update: { isDefault: true },
      create: {
        tenantId: wTenant.id,
        name: 'Support',
        description: 'Primary customer support team',
        color: '#0ea5e9',
        isDefault: true,
      },
    })
    const wBillingTeam = await prisma.team.upsert({
      where: { tenantId_name: { tenantId: wTenant.id, name: 'Billing' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        name: 'Billing',
        description: 'Billing and refunds team',
        color: '#f97316',
      },
    })

    // 2) Team members
    const wSupportMemberAdmin = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: wSupportTeam.id, userId: wAdmin.id } },
      update: { role: 'lead', permissions: ['assign','manage'] },
      create: {
        teamId: wSupportTeam.id,
        userId: wAdmin.id,
        role: 'lead',
        permissions: ['assign','manage'],
        skills: ['leadership','routing'],
      },
    })
    const wSupportMemberAgent = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: wSupportTeam.id, userId: wAgent.id } },
      update: { role: 'member' },
      create: {
        teamId: wSupportTeam.id,
        userId: wAgent.id,
        role: 'member',
        skills: ['billing','integration','technical'],
      },
    })
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: wBillingTeam.id, userId: wAgent.id } },
      update: { role: 'member' },
      create: {
        teamId: wBillingTeam.id,
        userId: wAgent.id,
        role: 'member',
        skills: ['billing'],
      },
    })

    // 3) Extra channels (web, sms)
    const wWebChannel = await prisma.channel.upsert({
      where: { tenantId_type: { tenantId: wTenant.id, type: 'web' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        name: 'Web Chat',
        type: 'web',
        config: { widget: true },
        isActive: true,
      },
    })
    const wSmsChannel = await prisma.channel.upsert({
      where: { tenantId_type: { tenantId: wTenant.id, type: 'sms' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        name: 'SMS',
        type: 'sms',
        config: { provider: 'twilio' },
        isActive: true,
      },
    })

    // 4) More customers
    const wCustomer3 = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId: wTenant.id, email: 'client3@walid-housni-30.com' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        email: 'client3@walid-housni-30.com',
        firstName: 'Client',
        lastName: 'Three',
        company: 'Walid Co',
        tags: ['vip','priority'],
      },
    })
    const wCustomer4 = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId: wTenant.id, email: 'client4@walid-housni-30.com' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        email: 'client4@walid-housni-30.com',
        firstName: 'Client',
        lastName: 'Four',
        company: 'Walid Co',
        tags: ['trial'],
      },
    })
    const wCustomer5 = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId: wTenant.id, email: 'client5@walid-housni-30.com' } },
      update: {},
      create: {
        tenantId: wTenant.id,
        email: 'client5@walid-housni-30.com',
        firstName: 'Client',
        lastName: 'Five',
        company: 'Walid Co',
        tags: ['refund'],
      },
    })

    // 5) Tickets across statuses and assignments
    const wTicket4 = await prisma.ticket.create({
      data: {
        tenantId: wTenant.id,
        customerId: wCustomer3.id,
        channelId: wWebChannel.id,
        subject: 'Chat: Need help with order #987',
        description: 'Live chat initiated from web widget.',
        priority: 'medium',
        status: 'snoozed',
        teamId: wSupportTeam.id,
        snoozedUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
        tags: ['chat','order'],
      },
    })
    const wTicket5 = await prisma.ticket.create({
      data: {
        tenantId: wTenant.id,
        customerId: wCustomer4.id,
        channelId: wSmsChannel.id,
        subject: 'SMS: Cancel subscription',
        description: 'Customer asked to cancel via SMS.',
        priority: 'low',
        status: 'closed',
        resolvedAt: new Date(),
        teamId: wSupportTeam.id,
        assignedAgentId: wAdmin.id,
        tags: ['subscription','cancellation'],
      },
    })
    const wTicket6 = await prisma.ticket.create({
      data: {
        tenantId: wTenant.id,
        customerId: wCustomer5.id,
        channelId: wWhatsAppChannel.id,
        subject: 'Double charge on last invoice',
        description: 'Customer reported duplicate charge.',
        priority: 'urgent',
        status: 'waiting',
        teamId: wBillingTeam.id,
        tags: ['billing','urgent'],
      },
    })

    // Watchers and notes
    await prisma.ticketWatcher.upsert({
      where: { ticketId_userId: { ticketId: wTicket4.id, userId: wAdmin.id } },
      update: {},
      create: { ticketId: wTicket4.id, userId: wAdmin.id },
    })
    await prisma.ticketNote.create({
      data: { ticketId: wTicket4.id, userId: wAdmin.id, content: 'Follow up after snooze ends.', isPrivate: true },
    })

    // 6) SLA instance with breach for an existing Walid ticket (wt2)
    await prisma.sLAInstance.upsert({
      where: { ticketId: wt2.id },
      update: {
        status: 'breached',
        breachCount: 1,
        escalationLevel: 1,
        lastEscalatedAt: new Date(),
      },
      create: {
        slaId: wSla.id,
        ticketId: wt2.id,
        status: 'breached',
        firstResponseDue: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() - 30 * 60 * 1000),
        breachCount: 1,
        escalationLevel: 1,
        lastEscalatedAt: new Date(),
      },
    })

    // 7) Advanced conversations linked to tickets (metadata.ticketId)
    const wConv3 = await prisma.conversationAdvanced.upsert({
      where: { id: 'wal_conv_3' },
      update: {},
      create: {
        id: 'wal_conv_3',
        tenantId: wTenant.id,
        customerId: wCustomer3.id,
        channelId: wWebChannel.id,
        subject: 'Web chat follow-up',
        status: 'active',
        priority: 'medium',
        assignedAgentId: wAgent.id,
        tags: ['chat'],
        messageCount: 2,
        metadata: { ticketId: wTicket4.id, unreadCount: 0, source: 'web' },
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
        updatedAt: new Date(Date.now() - 20 * 60 * 1000),
        lastMessageAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    })
    await prisma.conversationAdvanced.upsert({
      where: { id: 'wal_conv_4' },
      update: {},
      create: {
        id: 'wal_conv_4',
        tenantId: wTenant.id,
        customerId: wCustomer5.id,
        channelId: wWhatsAppChannel.id,
        subject: 'Refund processing',
        status: 'active',
        priority: 'high',
        assignedAgentId: wAgent.id,
        tags: ['billing','refund'],
        messageCount: 1,
        metadata: { ticketId: wTicket6.id, unreadCount: 1, source: 'whatsapp' },
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
        updatedAt: new Date(Date.now() - 50 * 60 * 1000),
        lastMessageAt: new Date(Date.now() - 50 * 60 * 1000),
      },
    })
    await prisma.messageAdvanced.upsert({
      where: { id: 'wal_msg_3b' },
      update: {},
      create: {
        id: 'wal_msg_3b',
        conversationId: wConv3.id,
        senderId: wCustomer3.id,
        senderType: 'customer',
        content: 'Can someone confirm my order status?',
        messageType: 'text',
        channel: 'web',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
    })
    await prisma.messageAdvanced.upsert({
      where: { id: 'wal_msg_4b' },
      update: {},
      create: {
        id: 'wal_msg_4b',
        conversationId: wConv3.id,
        senderId: wAgent.id,
        senderType: 'agent',
        content: 'Yes, your order is being prepared for shipment.',
        messageType: 'text',
        channel: 'web',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    })

    // 8) Internal channel for Support team + participants + messages
    const wSupportRoom = await prisma.internalChannel.upsert({
      where: { id: 'w_support_room' },
      update: { name: 'Support Room', type: 'team', teamId: wSupportTeam.id },
      create: {
        id: 'w_support_room',
        tenantId: wTenant.id,
        name: 'Support Room',
        type: 'team',
        teamId: wSupportTeam.id,
        createdById: wAdmin.id,
      },
    })
    await prisma.internalChannelParticipant.upsert({
      where: { channelId_userId: { channelId: wSupportRoom.id, userId: wAdmin.id } },
      update: {},
      create: { channelId: wSupportRoom.id, userId: wAdmin.id, role: 'owner' },
    })
    await prisma.internalChannelParticipant.upsert({
      where: { channelId_userId: { channelId: wSupportRoom.id, userId: wAgent.id } },
      update: {},
      create: { channelId: wSupportRoom.id, userId: wAgent.id, role: 'member' },
    })
    await prisma.internalMessage.upsert({
      where: { id: 'w_ic_msg_1' },
      update: {},
      create: { id: 'w_ic_msg_1', channelId: wSupportRoom.id, senderId: wAdmin.id, content: 'Please prioritize refunds this morning.' },
    })
    await prisma.internalMessage.upsert({
      where: { id: 'w_ic_msg_2' },
      update: {},
      create: { id: 'w_ic_msg_2', channelId: wSupportRoom.id, senderId: wAgent.id, content: 'Acknowledged. I am on it.' },
    })

    // 9) Saved Search for Walid admin
    await prisma.savedSearch.upsert({
      where: { tenantId_userId_name: { tenantId: wTenant.id, userId: wAdmin.id, name: 'SLA at Risk' } },
      update: { filters: { status: ['open','waiting'], sla: 'at_risk' }, alertsEnabled: true },
      create: {
        tenantId: wTenant.id,
        userId: wAdmin.id,
        name: 'SLA at Risk',
        query: '',
        filters: { status: ['open','waiting'], sla: 'at_risk' },
        alertsEnabled: true,
      },
    })

    // 10) Ticket assignment record (to support agent)
    await prisma.ticketAssignment.upsert({
      where: { id: 'wal_assign_1' },
      update: {},
      create: {
        id: 'wal_assign_1',
        ticketId: wTicket6.id,
        teamMemberId: wSupportMemberAgent.id,
        assignedBy: wAdmin.id,
        status: 'assigned',
        notes: 'Assign urgent billing issue to support agent',
      },
    })

    // 11) Example call record (ended)
    const wCall = await prisma.call.upsert({
      where: { id: 'w_call_1' },
      update: { status: 'ended', endedAt: new Date() },
      create: {
        id: 'w_call_1',
        tenantId: wTenant.id,
        startedBy: wAdmin.id,
        type: 'voice',
        status: 'ended',
        startedAt: new Date(Date.now() - 20 * 60 * 1000),
        endedAt: new Date(Date.now() - 10 * 60 * 1000),
        metadata: { demo: true },
      },
    })
    await prisma.callParticipant.upsert({
      where: { id: 'w_call_part_admin' },
      update: {},
      create: { id: 'w_call_part_admin', callId: wCall.id, userId: wAdmin.id, role: 'host', audioEnabled: true, videoEnabled: false },
    })
    await prisma.callParticipant.upsert({
      where: { id: 'w_call_part_cust' },
      update: {},
      create: { id: 'w_call_part_cust', callId: wCall.id, customerId: wCustomer3.id, role: 'participant', audioEnabled: true, videoEnabled: false },
    })

    console.log('✅ Additional Walid teams/channels/customers/tickets seeded')
  } catch (e) {
    console.warn('⚠️  Skipped additional Walid seeding due to error:', e?.message || e)
  }

  // Integration Marketplace Seed Data
  console.log('🌐 Seeding Integration Marketplace...')
  const integrations = [
    {
      slug: 'salesforce',
      name: 'Salesforce',
      category: 'crm',
      description: 'Connect Salesforce CRM to sync contacts, leads, and opportunities.',
      icon: 'https://img.icons8.com/color/96/000000/salesforce.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { two_way: true, bidirectional: true, contacts: true, leads: true, deals: true },
      features: ['automations', 'two_way', 'webhooks', 'field_mapping'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Salesforce',
      version: '1.0.0',
    },
    {
      slug: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      description: 'Sync HubSpot contacts, companies, and deals with your Glavito workspace.',
      icon: 'https://img.icons8.com/color/96/000000/hubspot.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { two_way: true, bidirectional: true, contacts: true, companies: true, deals: true },
      features: ['automations', 'two_way', 'webhooks', 'field_mapping'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'HubSpot',
      version: '1.0.0',
    },
    {
      slug: 'dynamics',
      name: 'Microsoft Dynamics 365',
      category: 'crm',
      description: 'Integrate Microsoft Dynamics 365 for seamless CRM synchronization.',
      icon: 'https://img.icons8.com/color/96/000000/microsoft.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { two_way: true, contacts: true, accounts: true },
      features: ['automations', 'two_way', 'webhooks'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Microsoft',
      version: '1.0.0',
    },
    {
      slug: 'marketo',
      name: 'Marketo',
      category: 'marketing',
      description: 'Connect Marketo for advanced marketing automation and lead management.',
      icon: 'https://img.icons8.com/color/96/000000/marketo.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { leads: true, campaigns: true },
      features: ['automations', 'webhooks'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Adobe',
      version: '1.0.0',
    },
    {
      slug: 'pardot',
      name: 'Salesforce Pardot',
      category: 'marketing',
      description: 'Sync Pardot prospects and marketing campaigns with Glavito.',
      icon: 'https://img.icons8.com/color/96/000000/salesforce.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { prospects: true, campaigns: true },
      features: ['automations', 'webhooks'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Salesforce',
      version: '1.0.0',
    },
    {
      slug: 'mailchimp',
      name: 'Mailchimp',
      category: 'marketing',
      description: 'Sync Mailchimp subscribers and manage email campaigns.',
      icon: 'https://img.icons8.com/color/96/000000/mailchimp.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { subscribers: true, campaigns: true, lists: true },
      features: ['automations', 'webhooks', 'email_marketing'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Mailchimp',
      version: '1.0.0',
    },
    {
      slug: 'sendgrid',
      name: 'SendGrid',
      category: 'marketing',
      description: 'Send transactional emails through SendGrid with tracking and analytics.',
      icon: 'https://img.icons8.com/color/96/000000/sendgrid.png',
      authType: 'api_key',
      webhookSupport: true,
      capabilities: { email: true, tracking: true },
      features: ['email_delivery', 'webhooks', 'analytics'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Twilio',
      version: '1.0.0',
    },
    {
      slug: 'slack',
      name: 'Slack',
      category: 'communication',
      description: 'Get notifications and updates in Slack channels.',
      icon: 'https://img.icons8.com/color/96/000000/slack.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { notifications: true, channels: true },
      features: ['notifications', 'webhooks'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Slack',
      version: '1.0.0',
    },
    {
      slug: 'twilio',
      name: 'Twilio',
      category: 'communication',
      description: 'Send SMS messages and make voice calls through Twilio.',
      icon: 'https://img.icons8.com/color/96/000000/twilio.png',
      authType: 'api_key',
      webhookSupport: true,
      capabilities: { sms: true, voice: true },
      features: ['sms', 'voice', 'webhooks'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Twilio',
      version: '1.0.0',
    },
    {
      slug: 'shopify',
      name: 'Shopify',
      category: 'ecommerce',
      description: 'Sync Shopify orders, customers, and products. Track abandoned carts.',
      icon: 'https://img.icons8.com/color/96/000000/shopify.png',
      authType: 'oauth2',
      webhookSupport: true,
      capabilities: { orders: true, customers: true, products: true, two_way: true },
      features: ['automations', 'webhooks', 'order_sync', 'cart_tracking'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Shopify',
      version: '1.0.0',
    },
    {
      slug: 'woocommerce',
      name: 'WooCommerce',
      category: 'ecommerce',
      description: 'Connect WooCommerce store to sync orders and customers.',
      icon: 'https://img.icons8.com/color/96/000000/woocommerce.png',
      authType: 'api_key',
      webhookSupport: true,
      capabilities: { orders: true, customers: true, products: true },
      features: ['automations', 'webhooks', 'order_sync'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'WooCommerce',
      version: '1.0.0',
    },
    {
      slug: 'stripe',
      name: 'Stripe',
      category: 'payment',
      description: 'Process payments, manage subscriptions, and track revenue.',
      icon: 'https://img.icons8.com/color/96/000000/stripe.png',
      authType: 'api_key',
      webhookSupport: true,
      capabilities: { payments: true, subscriptions: true, invoices: true },
      features: ['payments', 'webhooks', 'subscriptions', 'invoicing'],
      isOfficial: true,
      isVerified: true,
      isActive: true,
      publisher: 'Stripe',
      version: '1.0.0',
    },
  ]

  for (const integration of integrations) {
    await prisma.integrationMarketplace.upsert({
      where: { slug: integration.slug },
      update: {
        name: integration.name,
        category: integration.category,
        description: integration.description,
        icon: integration.icon,
        authType: integration.authType,
        webhookSupport: integration.webhookSupport,
        capabilities: integration.capabilities,
        features: integration.features,
        isOfficial: integration.isOfficial,
        isVerified: integration.isVerified,
        isActive: integration.isActive,
        publisher: integration.publisher,
        version: integration.version,
      },
      create: {
        slug: integration.slug,
        name: integration.name,
        category: integration.category,
        description: integration.description,
        longDescription: `${integration.description} This integration enables seamless data synchronization between ${integration.name} and Glavito.`,
        icon: integration.icon,
        authType: integration.authType,
        webhookSupport: integration.webhookSupport,
        capabilities: integration.capabilities,
        features: integration.features,
        isOfficial: integration.isOfficial,
        isVerified: integration.isVerified,
        isActive: integration.isActive,
        publisher: integration.publisher,
        version: integration.version,
        configSchema: {},
        tags: [integration.category, integration.slug],
        industries: [],
        pricingType: 'free',
        publishedAt: new Date(),
      },
    })
  }
  console.log(`✅ Seeded ${integrations.length} integrations in marketplace`)

  // Marketplace Items Seed Data (for MarketplaceItem model)
  console.log('📦 Seeding Marketplace Items...')
  const marketplaceItems = [
    {
      type: 'workflow',
      name: 'Auto-Assign by Load',
      slug: 'auto-assign-workflow',
      description: 'Automatically assign tickets to the least-loaded available agent based on current workload.',
      category: 'workflow',
      tags: ['workflow', 'routing', 'automation', 'assignment'],
      isPremium: false,
      rating: 4.6,
      ratingCount: 123,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=auto-assign',
      screenshots: [],
      metadata: { featured: true, popular: true },
      content: {
        name: 'Auto-Assign by Load',
        type: 'n8n',
        triggers: [{ type: 'ticket.created' }],
        actions: [],
        conditions: [],
        metadata: { category: 'routing' },
      },
    },
    {
      type: 'channel',
      name: 'WhatsApp Business',
      slug: 'whatsapp-channel',
      description: 'Connect WhatsApp Business for inbound and outbound messaging with customers.',
      category: 'integration',
      tags: ['channel', 'whatsapp', 'messaging', 'communication'],
      isPremium: false,
      rating: 4.8,
      ratingCount: 220,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=whatsapp',
      screenshots: [],
      metadata: { featured: true },
      content: {
        type: 'channel',
        configuration: { provider: 'whatsapp', apiKey: '', phoneNumber: '' },
      },
    },
    {
      type: 'workflow',
      name: 'SLA Breach Alert',
      slug: 'sla-breach-alert',
      description: 'Automatically alert managers when tickets are at risk of breaching SLA targets.',
      category: 'workflow',
      tags: ['workflow', 'sla', 'alerts', 'monitoring'],
      isPremium: true,
      priceCents: 999,
      rating: 4.7,
      ratingCount: 89,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=sla-alert',
      screenshots: [],
      metadata: { premium: true },
      content: {
        name: 'SLA Breach Alert',
        type: 'n8n',
        triggers: [{ type: 'sla.at_risk' }],
        actions: [{ type: 'notify', target: 'manager' }],
        conditions: [],
        metadata: { category: 'sla' },
      },
    },
    {
      type: 'widget',
      name: 'Customer Satisfaction Dashboard',
      slug: 'csat-dashboard-widget',
      description: 'Display real-time customer satisfaction metrics and trends on your dashboard.',
      category: 'analytics',
      tags: ['widget', 'dashboard', 'csat', 'analytics'],
      isPremium: false,
      rating: 4.5,
      ratingCount: 156,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=csat',
      screenshots: [],
      metadata: {},
      content: {
        widgetType: 'csat',
        config: { period: '30d', showTrend: true },
      },
    },
    {
      type: 'workflow',
      name: 'Auto-Response Generator',
      slug: 'auto-response-generator',
      description: 'Generate intelligent auto-responses for common customer inquiries using AI.',
      category: 'workflow',
      tags: ['workflow', 'ai', 'automation', 'responses'],
      isPremium: true,
      priceCents: 1999,
      rating: 4.9,
      ratingCount: 234,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=ai-response',
      screenshots: [],
      metadata: { premium: true, ai: true },
      content: {
        name: 'Auto-Response Generator',
        type: 'n8n',
        triggers: [{ type: 'ticket.created' }],
        actions: [{ type: 'ai.generate_response' }],
        conditions: [{ field: 'category', operator: 'in', value: ['common', 'faq'] }],
        metadata: { category: 'ai' },
      },
    },
    {
      type: 'channel',
      name: 'Instagram DM',
      slug: 'instagram-channel',
      description: 'Connect Instagram Direct Messages to handle customer conversations.',
      category: 'integration',
      tags: ['channel', 'instagram', 'social', 'messaging'],
      isPremium: false,
      rating: 4.4,
      ratingCount: 98,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=instagram',
      screenshots: [],
      metadata: {},
      content: {
        type: 'channel',
        configuration: { provider: 'instagram', apiKey: '', accountId: '' },
      },
    },
    {
      type: 'workflow',
      name: 'Customer Tag Auto-Tagger',
      slug: 'customer-tag-autotagger',
      description: 'Automatically tag customers based on their behavior, purchase history, and interactions.',
      category: 'workflow',
      tags: ['workflow', 'tags', 'automation', 'segmentation'],
      isPremium: false,
      rating: 4.3,
      ratingCount: 67,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=tags',
      screenshots: [],
      metadata: {},
      content: {
        name: 'Customer Tag Auto-Tagger',
        type: 'n8n',
        triggers: [{ type: 'customer.updated' }, { type: 'ticket.closed' }],
        actions: [{ type: 'tag.customer' }],
        conditions: [],
        metadata: { category: 'tagging' },
      },
    },
    {
      type: 'widget',
      name: 'Team Performance Widget',
      slug: 'team-performance-widget',
      description: 'Track team performance metrics including response times, resolution rates, and workload distribution.',
      category: 'analytics',
      tags: ['widget', 'dashboard', 'team', 'performance'],
      isPremium: true,
      priceCents: 1499,
      rating: 4.6,
      ratingCount: 112,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=team',
      screenshots: [],
      metadata: { premium: true },
      content: {
        widgetType: 'team_performance',
        config: { showComparison: true, period: '7d' },
      },
    },
    {
      type: 'custom-field',
      name: 'Customer Priority Field',
      slug: 'customer-priority-field',
      description: 'Add a priority field to customer records for better segmentation and routing.',
      category: 'customization',
      tags: ['custom-field', 'customer', 'priority', 'segmentation'],
      isPremium: false,
      rating: 4.2,
      ratingCount: 45,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=priority',
      screenshots: [],
      metadata: {},
      content: {
        entity: 'customer',
        name: 'priority',
        label: 'Priority Level',
        type: 'select',
        options: ['low', 'medium', 'high', 'vip'],
        required: false,
      },
    },
    {
      type: 'workflow',
      name: 'Escalation Workflow',
      slug: 'escalation-workflow',
      description: 'Automatically escalate tickets that exceed response time thresholds or require specialized attention.',
      category: 'workflow',
      tags: ['workflow', 'escalation', 'routing', 'sla'],
      isPremium: false,
      rating: 4.5,
      ratingCount: 178,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=escalation',
      screenshots: [],
      metadata: {},
      content: {
        name: 'Escalation Workflow',
        type: 'n8n',
        triggers: [{ type: 'ticket.sla_at_risk' }, { type: 'ticket.unassigned_duration' }],
        actions: [{ type: 'escalate', target: 'manager' }],
        conditions: [],
        metadata: { category: 'escalation' },
      },
    },
    {
      type: 'channel',
      name: 'Email Channel',
      slug: 'email-channel',
      description: 'Set up email as a support channel with IMAP/POP3 or SMTP integration.',
      category: 'integration',
      tags: ['channel', 'email', 'communication'],
      isPremium: false,
      rating: 4.7,
      ratingCount: 312,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=email',
      screenshots: [],
      metadata: {},
      content: {
        type: 'channel',
        configuration: { provider: 'email', smtp: {}, imap: {} },
      },
    },
    {
      type: 'workflow',
      name: 'Customer Onboarding Automation',
      slug: 'customer-onboarding-automation',
      description: 'Automate welcome emails, setup guides, and initial support interactions for new customers.',
      category: 'workflow',
      tags: ['workflow', 'onboarding', 'automation', 'email'],
      isPremium: true,
      priceCents: 2499,
      rating: 4.8,
      ratingCount: 201,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=onboarding',
      screenshots: [],
      metadata: { premium: true },
      content: {
        name: 'Customer Onboarding Automation',
        type: 'n8n',
        triggers: [{ type: 'customer.created' }],
        actions: [
          { type: 'email.send', template: 'welcome' },
          { type: 'delay', duration: '1d' },
          { type: 'email.send', template: 'setup_guide' },
        ],
        conditions: [],
        metadata: { category: 'onboarding' },
      },
    },
    {
      type: 'widget',
      name: 'Ticket Queue Widget',
      slug: 'ticket-queue-widget',
      description: 'Display your ticket queue with filters, sorting, and quick actions directly on the dashboard.',
      category: 'productivity',
      tags: ['widget', 'dashboard', 'tickets', 'queue'],
      isPremium: false,
      rating: 4.4,
      ratingCount: 134,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=queue',
      screenshots: [],
      metadata: {},
      content: {
        widgetType: 'ticket_queue',
        config: { maxItems: 10, showFilters: true },
      },
    },
    {
      type: 'workflow',
      name: 'Satisfaction Survey Trigger',
      slug: 'satisfaction-survey-trigger',
      description: 'Automatically send satisfaction surveys after ticket resolution with customizable timing.',
      category: 'workflow',
      tags: ['workflow', 'survey', 'csat', 'automation'],
      isPremium: false,
      rating: 4.6,
      ratingCount: 167,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=survey',
      screenshots: [],
      metadata: {},
      content: {
        name: 'Satisfaction Survey Trigger',
        type: 'n8n',
        triggers: [{ type: 'ticket.closed' }],
        actions: [{ type: 'delay', duration: '1h' }, { type: 'survey.send' }],
        conditions: [],
        metadata: { category: 'survey' },
      },
    },
    {
      type: 'custom-field',
      name: 'Ticket Source Field',
      slug: 'ticket-source-field',
      description: 'Track where tickets originate from with a custom source field (website, phone, email, etc.).',
      category: 'customization',
      tags: ['custom-field', 'ticket', 'source', 'tracking'],
      isPremium: false,
      rating: 4.1,
      ratingCount: 56,
      installCount: 0,
      vendorName: 'Glavito',
      vendorUrl: 'https://glavito.com',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=source',
      screenshots: [],
      metadata: {},
      content: {
        entity: 'ticket',
        name: 'source',
        label: 'Ticket Source',
        type: 'select',
        options: ['website', 'phone', 'email', 'chat', 'social', 'other'],
        required: false,
      },
    },
  ]

  for (const item of marketplaceItems) {
    await prisma.marketplaceItem.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        tags: item.tags,
        isPremium: item.isPremium,
        priceCents: item.priceCents,
        rating: item.rating,
        ratingCount: item.ratingCount,
        vendorName: item.vendorName,
        vendorUrl: item.vendorUrl,
        iconUrl: item.iconUrl,
        screenshots: item.screenshots,
        metadata: item.metadata,
        content: item.content,
      },
      create: {
        type: item.type,
        name: item.name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        tags: item.tags,
        isPremium: item.isPremium,
        priceCents: item.priceCents,
        rating: item.rating,
        ratingCount: item.ratingCount,
        installCount: item.installCount,
        vendorName: item.vendorName,
        vendorUrl: item.vendorUrl,
        iconUrl: item.iconUrl,
        screenshots: item.screenshots,
        metadata: item.metadata,
        content: item.content,
      },
    })
  }
  console.log(`✅ Seeded ${marketplaceItems.length} marketplace items`)

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