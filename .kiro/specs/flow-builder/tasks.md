# No‑Code Flow Builder: Implementation Plan

- [ ] 1. Define flow domain model and storage
  - [x] Create Prisma models: Flow, FlowVersion, FlowNode, FlowEdge, FlowTemplate, FlowExecution, FlowEvent
  - [x] Support channel-aware nodes (WhatsApp, Instagram, Email), logic nodes (conditions, switch, wait), ticket actions (create/update), notifications, and HTTP nodes (assign/close, variables, webhook nodes pending)
  - [x] Add multi-tenant scoping
  - [ ] Soft delete and versioning strategy
  - [x] Seed example templates (Support triage, After-hours responder, CSAT follow-up)
  - _Areas: schema.prisma, database migrations_
  - Next: finalize soft-delete/versioning strategy, add migration + seed starter templates

- [ ] 2. Shared flow types and contracts
  - [x] Define FlowGraph, NodeConfig, EdgeConfig, Port types (TypeScript)
  - [x] Zod schemas for runtime safety
  - [x] Create NodeKind enums (channel_in, send_message, wait, condition, switch, set_variable, http_request, ticket_create, ticket_update, ticket_assign, notification, end)
  - [ ] Add validation errors and normalization utils
  - _Areas: libs/shared-types, libs/shared-flow (new)_
  - Next: add validation/normalization utils

- [ ] 3. Backend core: FlowService and execution engine
  - [x] Implement baseline FlowService CRUD (create/update/publish/list)
  - [x] Clone/version endpoints
  - [x] ExecutionEngine skeleton (basic runner and event logging)
  - [x] Implement ExecutionEngine resumable waits (time) and deterministic stepping (event/message waits pending)
  - [x] Add execution context (tenant, user, channel, ticket, variables)
  - [x] Implement adapters bridge: WhatsApp/Instagram/Email via adapters + EmailService
  - [x] Add event bus hooks: on message received, ticket events; time triggers via scheduler
  - _Areas: api-gateway/src/app/flows (new module), reuse adapters in libs/shared/conversation_
  - Next: add execution context, adapter bridge, event hooks, and waits/resumable
  - Progress: Event bus hooks wired for conversation + ticket events; basic scheduler added (interval-based); 'wait' node persists FlowWait and halts run until resume; resume path implemented (starts after waited node); explicit resume endpoint added; schedule create/disable endpoints
  - Progress: Adapter-backed 'send.message' integrated (whatsapp/instagram/email); added 'ticket.create' and 'ticket.update' execution using TicketsService; notify enqueued

- [ ] 4. Channel triggers integration
  - [x] WhatsApp: inbound webhook → FlowExecution routing; template sends supported
  - [x] Instagram: DM/comments routing; comment/story flags; mention/content filters in router
  - [x] Email: inbound parsing hook; reply threading metadata; baseline correlation
  - [x] Ticket events: created/updated/resolved → trigger flows for automation
  - _Areas: WhatsAppAdapter, InstagramAdapter, EmailAdapter, TicketsService integration points_
  - [x] Inbound adapters wired to FlowRouter and ticket-event triggers
  - [x] Basic event routing: conversation.message.received → flow.run for matching channel triggers
  - Progress: Email webhook endpoint added; FlowRouter honors channel + messageType/subtype; contentIncludes/mentions/hashtags filters; ticket-events routing
  - WhatsApp specifics
    - [ ] WABA template synchronization
      - Progress: list names/category/language/status via API endpoint; in-memory cache; UI picker in Inspector; template language passed from node config; preview body + variable extraction implemented; Inspector shows preview/variables; refresh templates action added
    - [x] Opt-in/out handling, policy-compliant fallbacks when template not approved
      - Progress: execution engine respects per-channel opt-out and skips sends; WhatsApp template approval enforced with safe fallback to text when content provided
    - [ ] Rate limits and templated send quotas; backoff/retry and provider error mapping
      - Progress: basic retry with backoff for WhatsApp (429/5xx) implemented; quotas/error mapping pending
  - Instagram specifics
    - [ ] Comment reply threading (improved routing done; full threading pending)
      - Progress: messageType/subtype routing; content mention filters added in FlowRouter; metadata.isComment
    - [ ] Story reply triggers and quick-reply payload mapping
  - Email specifics
    - [ ] Threading via Message-Id/In-Reply-To, signature trimming, plain/html rendering
      - Progress: Inbound Email webhook wired; In-Reply-To/References mapped; HTML supported via EmailAdapter metadata; subtypes routed (email_reply/email_new/email_bounce/email_auto_reply)
    - [x] Out-of-office detection and bounce handling
      - Progress: auto-reply and bounce detection added in EmailAdapter; FlowRouter maps to email_auto_reply and email_bounce

- [ ] 5. Notifications and actions
  - Implement NotificationService (in-app, email) for node action
  - Ticket actions: create, update fields, assign/auto-assign, add note, close
  - HTTP node: signed requests, retries, error mapping
  - _Areas: api-gateway services (notifications, tickets), shared HTTP client util_
  - Progress: Notifications module/service/controller added; notify node wired (agent/team/webhook)
  - Escalation & routing
    - [ ] Add escalation node (to team/role/seniority) with rules
    - [ ] SLA breach trigger node and notify/escalate action
    - [ ] Round-robin/skills-based assignment action

- [ ] 6. Permissions and auditing
  - Roles: admin can manage all flows; agent can manage team-scoped flows if allowed
  - Add audit logs on publish, run, and changes
  - _Areas: auth, audit modules_

- [ ] 7. REST API and WebSocket
  - [x] REST: flows CRUD, publish, run
  - [x] REST: versions, executions list, logs
  - [x] REST: test-run endpoint
  - [x] REST: templates list/create/seed
  - [x] WS: basic gateway and run subscription
  - [x] WS: live preview/test run streaming (node-by-node)
  - [ ] Pagination, filtering, and search for flows and executions
  - _Areas: api-gateway/src/app/flows/flows.controller.ts, gateway (ws)_
  - Done: enriched run events with per-node step logs (durationMs)

- [ ] 8. Frontend: XYFlow-based visual builder (latest)
  - [x] Bootstrap flows list and builder pages; API client, store, hook
  - [x] Load and render current flow graph in XYFlow; Test Run wired with WS events
  - [x] Build node palette with categories: Channels, Logic, Actions, Integrations, Tickets, Notifications
  - [ ] Implement draggable nodes, ports, edge snapping, mini-map, zoom, grid, undo/redo
    - Progress: drag/drop/connect, mini-map, grid + zoom controls, and undo/redo are done; ports done via custom nodes/handles; edge snapping improved
  - [ ] Node inspectors with typed forms and validation
    - Progress: Trigger Channel, Send Message, Condition done; added Switch, Wait, HTTP, Ticket Create/Update, Notify basic fields
    - Progress: WhatsApp Send Message: basic template picker wired (names). Pending: category/language filtering and variable mapping UI
    - [ ] Instagram actions: reply to DM/comment with thread context
    - [ ] Email actions: subject/body templates with variable helpers
  - [ ] Sidebar for variables, test data, and environment
    - Progress: Test Input/Context (JSON) added; pending: environment panel
  - [x] Top bar: Save, Validate, Publish, Test Run, Version selector
  - [ ] Execution debugger: step-through with live logs and variable watch
  - _Areas: apps/admin-dashboard/src/app/[locale]/dashboard/flows (new pages + components)_
  - Progress: XYFlow canvas basics implemented (palette, drag/drop, connect, inspector, Save/Validate/Publish/Test Run, Undo/Redo, Version selector). Node inspectors added for Trigger Channel, Send Message, and Condition; palette grouped by categories; Test Input/Context JSON fields added. Next: extend inspectors (Switch, Wait, HTTP, Ticket, Notify), add ports/edge snapping, environment sidebar, and execution debugger.

- [ ] 9. Templates and wizards
  - Starter templates: Support triage, After-hours responder, CSAT follow-up, SLA reminders
  - Template gallery with search/tags; one-click create
  - Import/export JSON with schema versioning
  - _Areas: FlowTemplateService, UI gallery_
  - Progress: Backend endpoints added (list/create/seed); UI supports one‑click create from template; templates gallery with search/tag filter; seed uses tenantId via query params
  - Next: add template categories and localized descriptions; import/export JSON; tag chips UI
  - WhatsApp message templates (provider-managed)
    - [ ] Provider sync (list, preview body/variables, status)
      - Progress: list/status/language/category fetched; preview body/variables implemented; Inspector shows preview; language passed
    - [ ] Store metadata cache per-tenant; refresh on demand
      - Progress: in-memory cache at adapter level; per-tenant store pending
    - [ ] Validation: ensure only approved templates sent with correct locale
      - Progress: enforced in ExecutionEngine with approved-status check and safe text fallback

- [ ] 10. Runtime safeguards & resilience
  - Circuit breakers on external calls, retries with backoff
  - Max depth/loop protection; per-tenant rate limits
  - Idempotency keys for message sends
  - _Areas: execution engine, HTTP node, adapters_
  - Channel safety
    - [ ] WhatsApp/Instagram send rate management and jitter
    - [ ] Email SMTP transient failure classification and retry policy

- [ ] 11. Observability
  - Metrics: runs, node errors, success rate, latency per node type
  - Logs: execution logs with correlation IDs
  - Tracing hooks for critical paths
  - _Areas: prom-client metrics, logger, tracing_
  - Channel metrics
    - [ ] Per-channel deliverability, provider error codes, template send acceptance
    - [ ] Escalation events count, SLA breach rates

- [ ] 12. i18n & accessibility
  - Full i18n for builder UI and validation messages (en/fr/ar)
  - Keyboard navigation, focus management, ARIA roles in canvas and inspectors
  - _Areas: messages/*.json, builder components_

- [ ] 13. Security & multi-tenant isolation
  - Validate channel ownership and template access before execution
  - Sanitize variables and template inputs
  - _Areas: guards, validators_
  - Compliance
    - [ ] WhatsApp opt-in/opt-out policy and data retention windows
    - [ ] Instagram platform policy checks on automated replies
    - [ ] Email DMARC/SPF/DKIM alignment for outbound

- [ ] 14. Testing strategy
  - Unit tests: FlowService, ExecutionEngine, each node executor
  - Integration tests: end-to-end flow run with mock adapters
  - UI tests: node drag, connect, validate, publish
  - _Areas: backend e2e, frontend playwright/cypress_
  - Channel tests
    - [ ] WhatsApp template send with variable mapping
    - [ ] Instagram comment reply threading
    - [ ] Email thread detection and reply

---

- [ ] 17. AI & Agent Assist (routing, escalation, suggestions)
  - Routing & escalation
    - [ ] Intent classification → route to team/flow
    - [ ] Sentiment detection → priority boost/escalation node input
    - [ ] Language detection → locale-specific flows/templates
  - Agent assist
    - [ ] Auto-summarize conversation for ticket creation/hand-off
    - [ ] Suggested replies with variables pulled from customer context
    - [ ] Auto-tagging and category suggestions
  - Feedback loop
    - [ ] Capture agent feedback on suggestions to improve models
  - _Areas: ai services, adapters bridge (features are optional/feature-flagged)_

- [ ] 15. Rollout plan
  - Feature flag per-tenant
  - Data migration for templates
  - Backward-compatible adapter hooks
  - _Areas: flags, migrations_

- [ ] 16. Documentation
  - Authoring guide, node reference, templates cookbook
  - API reference for import/export and test-run
  - _Areas: docs/
