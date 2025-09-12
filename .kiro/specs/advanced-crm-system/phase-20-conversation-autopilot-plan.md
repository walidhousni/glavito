### Phase 20: Conversation Workspace Enhancements & AI Autopilot

Purpose: finalize Conversation/Tickets workspace interactions (calls, snooze, resolve, KB, AI Coach, auto-complete) and introduce an AI Autopilot that can classify inbound messages, retrieve context (e.g., invoices), and reply automatically or draft responses for agent review.

---

## 1) Current state and gaps

- TicketsWorkspace (`apps/admin-dashboard/src/components/tickets/TicketsWorkspace.tsx`)
  - ✅ Knowledge base search integrated with insert-to-composer.
  - ✅ Selecting a ticket locates a conversation and passes channel to `ConversationPanel`.
  - ✅ Calls integration entry point present (create/list via `callsApi`).

- ConversationPanel (`apps/admin-dashboard/src/components/tickets/ConversationPanel.tsx`)
  - ✅ Real-time conversation loading + WebSocket updates.
  - ✅ Calls: inline start and panel render.
  - ✅ AI Coach: fetches and renders latest analysis (basic refresh wired).
  - ❌ Snooze: UI button renders, no action handler/endpoints.
  - ❌ Resolve: UI button renders, no action handler/endpoints.
  - ❌ Auto-complete / Suggest response: buttons render, no AI suggestion call-integration.

---

## 2) Goals

1) Make Snooze and Resolve fully functional across backend and UI.
2) Add AI auto-complete/suggestion pipeline in the composer.
3) Implement AI Autopilot:
   - Listen to incoming messages (WhatsApp/Instagram/Email/web) via orchestrator/events.
   - Classify intent, detect entities, consult knowledge base/CRM/Payments (ex: invoices), and decide to draft/send.
   - Safety: tenant-level config, confidence thresholds, rate-limits, audit logging.

---

## 3) Backend design

### 3.1 Models

- Snooze
  - Option A (simple): add `snoozedUntil: DateTime?` and optional `snoozeReason: String?` fields to `Ticket`.
  - Option B (richer): create `TicketSnooze` history table with `until`, `reason`, `createdBy`, `createdAt`. For first iteration: Option A.

- Autopilot settings
  - Add `AISettings` model (tenant-scoped):
    - `tenantId String @unique`
    - `mode String` one of: `off | draft | auto`
    - `minConfidence Float` default 0.7
    - `maxAutoRepliesPerHour Int` default 10
    - `allowedChannels String[]` subset of `['whatsapp','instagram','email','web']`
    - `guardrails JSON` for PII redaction and safe topics
  - Alternatively, embed under `Tenant` as JSON; explicit model is cleaner for admin UI.

### 3.2 Endpoints

- Tickets
  - POST `/tickets/:id/snooze` body: `{ until: string; reason?: string }`
  - POST `/tickets/:id/resolve` (reuse existing service method if present; else add)
  - GET `/tickets/:id/timeline` (already exists) — reflect snooze/resolve events
  - GET `/tickets/stats` (already exists) — no change

- Conversations (optional mirror)
  - POST `/conversations/:id/snooze` → resolve ticket id and forward to ticket snooze
  - POST `/conversations/:id/resolve` → forward

- AI
  - POST `/ai/response-suggestions` body: `{ content: string; context?: any }` → returns 3-5 suggestions with scores (stub exists in `AIController`, wire to `AIIntelligenceService`)
  - GET `/ai/autopilot/config` → tenant config
  - PUT `/ai/autopilot/config` → update config (mode, thresholds, channels)

### 3.3 Services and flow

- EnhancedConversationOrchestratorService
  - On inbound customer message:
    1) Persist message and update conversation context (existing).
    2) If Autopilot is enabled for tenant/channel and message is eligible (customer side, not agent):
       - Call `AutopilotService.handleInbound(message, context)`.

- AutopilotService (new)
  - Consume inbound content/context → call `AIIntelligenceService.analyzeContent`
    - Required analysis types: `intent_classification`, `entity_extraction`, `language_detection`, `knowledge_suggestions`, `response_generation`, `escalation_prediction`
  - Fetch domain context if indicated (invoice/order):
    - From Prisma: `PaymentIntent`, `Deal`, `Ticket`, `Customer` by detected entities (invoice/order numbers, email, phone).
  - Decide action:
    - If `mode=draft` and confidence >= threshold → create a `message` with `senderType='bot'` in DRAFT state, notify agents.
    - If `mode=auto` and confidence >= threshold and under rate-limit → send via orchestrator to channel adapter; log audit event.
    - Else: attach suggestions to conversation context for agent quick-insert.
  - Guardrails: block sensitive topics, redaction, per-tenant limits.

- Eventing and audit
  - Publish `conversation.autopilot.drafted`/`conversation.autopilot.sent` with metadata.
  - Append to `AuditLog` (already in schema) best-effort.

### 3.4 Security & compliance

- Enforce RBAC on config endpoints: `admin` (view/update), `manager` (view), `agent` (none).
- 2FA required for enabling `auto` mode.
- Rate limits per-tenant and per-conversation.
- PII redaction in AI prompts; encryption-at-rest already added for PII via Prisma middleware.

---

## 4) Frontend design

### 4.1 ConversationPanel

- Snooze
  - Add popover dialog on Snooze with presets: 1h, 4h, Tomorrow, Next week, Custom date-time, Reason.
  - POST `/tickets/:id/snooze` → reflect in UI as a small badge (Snoozed until …) and mute new-activity indicators until wake.

- Resolve
  - POST `/tickets/:id/resolve` → reflect in header badge and disable composer (or keep with a “Reopen” action).

- Auto-complete / Suggest
  - On click “Suggest response”: call `/ai/response-suggestions` with `{ content: composerText, context: { conversationId, previousMessages } }` and render top 3; actions: Insert, Copy.
  - On “Auto-complete”: same endpoint with mode focusing on single best-response; insert directly into composer with faint styling until edited.
  - [done] Endpoint returns `knowledgeArticles` and `faqs` alongside responses; fetched in UI when needed.
  - [done] Render suggested KB articles/FAQs inline as quick insert links near composer.

- Autopilot draft indicator
  - If backend produced a draft bot message, surface a small banner with: “Autopilot drafted a reply • Insert • Send”.

### 4.2 TicketsWorkspace

- [done] Knowledge sidebar with search and insert-to-composer.
- [done] Keep current KB UX; works with click-to-insert signals.
- Ensure Snooze/Resolve status propagates to list item badges and stats panel.

### 4.3 Admin Settings (later)

- Add Autopilot settings under Admin → AI & Automation:
  - Mode (Off/Draft/Auto), min confidence slider, rate-limit, allowed channels, safe-topics.

---

## 5) Observability

- Metrics: total autopilot decisions, drafted vs sent, acceptance rate of drafts, suggestion usage, block rates by guardrails.
- Logs: decision traces (intent, confidence), data access (e.g., invoice lookup), errors.
- Alerts: high error rates or consecutive low-confidence sequences.

---

## 6) Rollout plan

1) Backend
   - [done] Add `Ticket.snoozedUntil` (+ `snoozeReason`).
   - [done] Add snooze/resolve endpoints in Tickets controller/service.
   - [done] Implement `/ai/suggestions/response` via `AIController`.
   - [done] Add `AISettings` model + GET/POST config endpoints.
   - [done] Implement Autopilot hook in orchestrator to publish `conversation.autopilot.request` events.

2) Frontend
   - [done] Wire Snooze/Resolve in `ConversationPanel` (quick snooze preset).
   - [done] Add Suggest/Auto-complete calls; insert best suggestion.
   - [next] Surface Autopilot drafts.

4) Safety & Metrics
   - [done] Guardrails/thresholds via `AISettings` (mode/allowedChannels/minConfidence).
   - [done] Per-conversation/hour rate-limit check before publish.
   - [done] Emit `conversation.autopilot.request` and persist `ConversationEventLog`.
   - [done] Orchestrator publishes requests, logs events.
   - [done] Worker subscribes to requests, emits drafted/sent; UI handles `autopilot.drafted/sent`.

3) Safety/QA
   - Unit tests for Autopilot decisions (thresholds, rate-limit, guardrails).
   - E2E flows: inbound WhatsApp → draft/send; snooze/resolve lifecycle; suggestion insertion.

---

## 7) API contracts (concise)

- POST `/tickets/:id/snooze`
  - req: `{ until: string (ISO), reason?: string }`
  - res: `{ id, snoozedUntil, status }`

- POST `/tickets/:id/resolve`
  - req: `{}`
  - res: `{ id, status: 'resolved' }`

- POST `/ai/response-suggestions`
  - req: `{ content: string; context?: { conversationId?: string; customerId?: string; previousMessages?: string[] } }`
  - res: `{ suggestions: Array<{ response: string; confidence: number; tone: string; reasoning?: string }> }`

- GET `/ai/autopilot/config` → `{ mode, minConfidence, maxAutoRepliesPerHour, allowedChannels, guardrails }`
- POST `/ai/autopilot/config` → upsert config with same shape as body

---

## 8) Risks & mitigations

- Over-eager auto replies → default to Draft mode; high thresholds; require 2FA to enable Auto.
- PII leakage in prompts → redact entities before sending to model; never echo secrets in responses.
- Model hallucination → require knowledge grounding; only answer with verified data for “invoice/order” intents; otherwise draft.
- Rate limiting → per-tenant and per-conversation caps.

---

## 9) Deliverables

- Backend: migrations, services, endpoints, orchestrator hook, tests.
- Frontend: ConversationPanel actions (Snooze/Resolve), suggestion UI, autopilot draft banner.
- Admin: Autopilot settings UI (follow-up).
- Docs: Admin guide and runbook.


