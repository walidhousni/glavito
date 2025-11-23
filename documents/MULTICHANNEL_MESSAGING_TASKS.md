# Multichannel Messaging (WhatsApp + Instagram) — Implementation Tasks

Source: Derived from the WhatsApp automation capabilities showcased by eGrow's WhatsApp Business Platform page: https://www.egrow.com/en/whatsapp

This checklist outlines the work required to deliver a production-grade multichannel ticketing and CRM experience comparable to the referenced feature set, adapted to support both WhatsApp and Instagram. Use this as a living plan; check items off as they’re completed.

---

## 1) Channels & Messaging Infrastructure
- [ ] Set up Meta Business App credentials management (App ID/Secret, Webhook Verify Token) and secure storage/rotation
- [x] Implement webhook verification and request signature validation (X-Hub-Signature-256)
- [ ] WhatsApp Cloud API adapter
  - [x] Send: text, image, video, document, audio
  - [x] Send: location, contacts, sticker
  - [x] Send interactive: quick reply buttons, call-to-action buttons, list messages
  - [x] Receive: all message types + statuses (sent, delivered, read), errors
  - [ ] Handle message categories and pricing-relevant metadata
- [ ] Instagram Messaging API adapter
  - [ ] App review scopes (instagram_manage_messages, pages_messaging, pages_show_list) + IG account linking
  - [x] Send/receive DMs, replies to story mentions, attachments where supported
  - [x] Quick replies/ice-breakers where applicable; enforce IG policy constraints (24-hour window)
- [x] 24-hour service window enforcement for Instagram DMs; use WhatsApp templates outside window
- [ ] WhatsApp Template Messaging
  - [ ] Template CRUD and storage (name, category, language, body/components, variables)
  - [ ] Support interactive templates (buttons, lists), media headers, localization
  - [x] Approval state sync with Meta and validation pre-send
- [x] Rate limiting, retry with exponential backoff, idempotency keys for send operations (WA idempotency added)
- [x] High-availability outbound queue with DLQ for message deliveries (Kafka topics & DLQ wired)
- [x] Unified, channel-agnostic message model (normalized types + raw payload archive)
- [x] Media download/proxy service with signed URLs and retention controls (files proxy endpoint)

## 2) Shared Inbox, Tickets & Collaboration
- [ ] Unified conversation threads across channels (WhatsApp, Instagram)
- [ ] Ticket lifecycle states: Open, Pending, On Hold, Resolved, Closed
- [ ] Assignment to agents/teams, queueing, and auto-assignment rules (round-robin, workload)
- [ ] Internal notes, @mentions, followers/watchers per conversation
- [ ] Labels/tags with color, bulk apply, saved filters & smart folders
- [ ] Presence indicators (agent online/busy), collision detection, typing indicators where supported
- [ ] SLA policies (first response, next response, resolution) with timers and breach alerts
- [ ] Conversation merge/split; duplicate detection by contact identities
- [ ] Message actions: translate, pin, copy link, redact PII
- [ ] Rich composer: attachments, templates picker (WA), snippets, variables, emoji, shortcuts
  - [x] WhatsApp interactive builder (buttons/list) in composer
  - [x] Send location/contact/sticker from composer (WA)
  - [x] IG 24-hour window warning with send disabled outside window
  - [x] WhatsApp templates picker with variables and send

## 3) Automation & Workflow Builder
- [ ] Trigger catalog: inbound message, conversation created/updated, time-based, webhooks, order events
- [ ] Actions: send message (WA template/session, IG session), assign/reassign, add label, set status, call webhook, wait/delay, branch
- [ ] Conditions: channel, message type/keywords, customer attributes, time of day, SLA state
- [ ] Out-of-hours auto-response per channel with schedule configuration
- [ ] Human handoff from bot to agent with transcript preservation
- [ ] Abandoned cart recovery flows (WA templates) with safe re-tries and stop rules
- [ ] Order confirmation/status flows with interactive buttons
- [ ] Post-resolution CSAT survey flow (buttons/quick replies)
- [ ] Versioning, draft vs published, test-run/simulator, execution logs & metrics

## 4) Campaigns & Broadcasts
- [ ] Audience segmentation (rules + static lists) using profile attributes, labels, activity
- [ ] Consent management per channel; opt-in capture and storage; STOP/HELP keywords handling
- [ ] WhatsApp template-based outbound campaigns with personalization variables
- [ ] Scheduling, throttling/rate limits, regional send windows; blackout dates
- [ ] Delivery pipeline with progress tracking, retries, and suppression lists
- [ ] Instagram: limit to session messages (no promotional broadcasts outside 24-hour window); warn in UI
- [ ] Campaign analytics: sent, delivered, read (WA), replies, clicks (if tracked), conversions

## 5) Orders & Commerce Use Cases
- [ ] OMS/eCommerce integration layer (Shopify/WooCommerce/Custom) to fetch orders by customer/contact
- [ ] Order status push (WA templates) with tracking links and interactive actions
- [ ] Order history retrieval within conversation side panel
- [ ] Expedite shipping / modify order / contact support interactive flows
- [ ] Payment/fulfillment event ingestion to update conversations and trigger automations

## 6) Analytics & Reporting
- [ ] Messaging delivery funnel: sent, delivered, read, failed (channel-specific constraints)
- [ ] Agent performance: first response time, resolution time, occupancy, backlog, SLA attainment
- [ ] Conversation analytics: volumes by channel, label distribution, peak hours, deflection to automation
- [ ] Campaign analytics: audience size, send outcomes, replies, CTR, conversions
- [ ] CSAT/NPS capture and reporting; per-agent/per-team breakdowns
- [ ] Export (CSV) and scheduled report emails; role-based access

## 7) Contacts & CRM
- [ ] Unified Contact model with identity linking (phone, WhatsApp ID, Instagram user, email)
- [ ] Profile enrichment (names, avatars where available, locale, timezone)
- [ ] Consent & preferences storage per channel and purpose
- [ ] Segments (dynamic queries + static lists) for campaigns and automations
- [ ] Contact timeline: messages, orders, tickets, notes, campaigns, surveys
- [ ] Merge & deduplicate contacts; survivorship rules
- [ ] Public API & webhooks for contact sync, upsert, and events

## 8) Integrations & Extensibility
- [ ] Webhooks framework (subscribe, test, deliver, retry) for conversation/message/contact/order events
- [ ] Knowledge base connectors (internal CMS/Notion/Confluence) for AI answers and macros
- [ ] eCommerce connectors (Shopify/WooCommerce/Custom) for orders and inventory lookups
- [ ] Shipping/tracking webhook ingestion (carrier events → conversation updates)
- [ ] Workflow nodes for external services (N8N/Zapier)
- [ ] Calendar/task integration for scheduling callbacks and appointments

## 9) AI & Assistance
- [ ] Intent classification for routing, auto-labeling, and workflow branching
- [ ] Suggested replies with context and tone control; quick insert from composer
- [ ] Conversation summarization for handoff and reporting
- [ ] Knowledge-grounded answers with citations; fallbacks when confidence is low
- [ ] Toxicity/PII filters; automatic redaction policies
- [ ] Auto-tagging (topics, sentiment) and insights for analytics

## 10) Compliance, Security & Privacy
- [ ] RBAC with fine-grained permissions (channels, templates, campaigns, data export)
- [ ] Secrets management for Meta tokens; scheduled rotation; per-tenant isolation if multi-tenant
- [ ] GDPR/CCPA workflows: data export, right-to-be-forgotten; deletion propagation to storage and archives
- [ ] Data retention policies per channel and object; configurable and enforced
- [ ] Audit logs for admin actions, template changes, campaign sends, data access
- [ ] Legal disclaimers and terms for campaigns; opt-out capture and enforcement

## 11) Admin & Configuration
- [ ] Channel onboarding UI: WhatsApp phone number linking, webhooks setup, IG account linking and verification
- [ ] Template Manager: create/import, variables preview, localization, approval state sync
- [ ] Business profile configuration (WhatsApp) and display in conversation
- [ ] Working hours & holiday calendars; SLA policy editor; routing rules
- [ ] Teams, roles, skills, queues; agent availability settings
- [ ] Usage/pricing dashboards by message category (WA) and channel

## 12) Infrastructure, Reliability & Observability
- [ ] Message dispatch service with queueing, sharding by tenant/channel, and DLQ
- [ ] Idempotency keys for outbound sends and webhook handling
- [ ] Scheduler for campaigns and time-based automations
- [ ] Horizontal scaling guidelines and autoscaling policies
- [ ] End-to-end tracing (ingress webhook → processing → UI) and structured logging
- [ ] Metrics and alerts for webhook failures, send error rates, SLA breaches
- [ ] Backfill tools for missed webhooks and replayable event logs

## 13) Data Model & Storage
- [ ] Core entities: Channel, Contact, Conversation, Message, Attachment, Template, Campaign, Segment, Order, Event, SLA, Note, Label, Assignment, Team, Agent, Consent, OptOut, WebhookSubscription, AutomationFlow, AutomationRun
- [ ] Efficient indexes for inbox filtering (status, label, assignee, channel) and search
- [ ] Analytics-friendly tables/materialized views for reporting (daily aggregates)
- [ ] Archival strategy for old messages/media with restore capability

## 14) Testing & QA
- [ ] Unit tests for adapters, mappers, and validators
- [ ] Contract tests for WhatsApp/Instagram APIs using mocks/recordings
- [ ] E2E tests for key flows (auto-reply, templates, handoff, CSAT)
- [ ] Load/soak tests for inbox realtime updates and campaign sends
- [ ] Security tests: authZ bypass, injection, PII leaks, webhook spoofing
- [ ] App Review playbooks for Meta scopes with test steps/screenshots

## 15) Rollout & Change Management
- [ ] Internal alpha on sandbox numbers/accounts; dogfood with real workflows
- [ ] Tenant-level feature flags for channels, campaigns, and automation builder
- [ ] Migration plan for legacy tickets → unified conversations
- [ ] Training docs, in-product tips, and demo data
- [ ] Legal & policy reviews for marketing messages and consent capture

## 16) Risks & Constraints (Channel-Specific)
- [ ] WhatsApp: template pre-approval required; message category billing; 24-hour rule
- [ ] Instagram: no promotional broadcast outside 24-hour window; feature limitations differ from WhatsApp (templates not supported the same way)
- [ ] Read/open rate measurement limitations (use delivery/read receipts where available)

## 17) Success Metrics
- [ ] 40%+ reduction in median first response time (target based on automation)
- [ ] 85%+ order confirmation via WA templates for commerce use cases
- [ ] 2–3x improvement in campaign engagement vs email (WA only, where compliant)
- [ ] 90%+ SLA attainment for priority queues
- [ ] CSAT 90%+ on resolved conversations

---

Notes
- WhatsApp features like template messaging (interactive, lists, CTAs) are not directly mirrored on Instagram; plan separate UX and safeguards.
- Always enforce regional regulations and Meta platform policies for both channels.
- This checklist intentionally separates channel adapters (transport) from CRM/ticketing features (domain) to keep the design modular and testable.
