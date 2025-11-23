<!-- 2adefe43-337f-43b2-96bd-99cd75ca8b1a d9cacb11-8d8d-4f96-a56a-0291b877986a -->
# Customer 360, Analytics, and Omnichannel Enhancements

## Goals

- Elevate Customer 360 with deeper data (orders, journey, AI insights), segmentation actions, and preferences.
- Expand omnichannel (WhatsApp/Instagram/Email) capability with templates, threading, flows, and in-app surveys.
- Add analytics dashboards, exports/schedules, and real-time KPIs. Ensure privacy/compliance and robust notifications.

## Done
- Preferences/consent APIs and UI implemented (WA/Email/SMS, quiet hours, consent logs via audit).
- CSAT/CLV trends API and dashboard mini-cards integrated.

## Feature Set

- Customer 360 Enhancements
- Add orders summary (existing `deal`-based orders), RFM-like score, VIP flag, churn drivers, and AI insights in the profile.
- Rich journey timeline: SLA breach markers, call transcripts summary, knowledge views, and conversion events.
- Segmentation & Actions
- Segment builder UX: quick filters, saved segments, export, trigger workflows/campaigns from segment cards.
- Real-time segment membership recompute hooks on updates.
- Customer Preferences & Consent
- Channel-level opt-in/out (WhatsApp/Email/SMS), quiet hours, language. Persist in `Customer.customFields.marketingPreferences` or a new table if needed.
- Consent log with reason/timestamp.
- Surveys & CSAT/NPS
- In-app web survey (dialog link) in addition to WhatsApp flow and email. Auto-trigger post-resolution. CSAT trend in analytics.
- Omnichannel UX
- Reply templates/macros in thread (WA/IG/Email). Quick-send assets and snippets. Email threading headers improved; IG comments/stories replies robust.
- Analytics & Reporting
- Customer dashboard KPIs (engagement, CSAT, CLV), cohort/funnel, channel analytics. Scheduled exports (PDF/CSV) with templates.
- Notifications
- In-app toasts and persistent notifications for survey responses, SLA risk, and VIP activity with user preferences.
- AI Assist
- Suggested actions and replies (draft/auto), churn risk explanations, insight cards, and post-call summaries.
- Compliance
- DSR endpoints already present; add retention policies, redaction utilities, and consent exports.

## Backend Changes (NestJS)

- `api-gateway/src/app/customers/`
- `customers.controller.ts`: add endpoints
  - GET `:id/preferences` / POST `:id/preferences` (save channel prefs, quiet hours)
  - GET `:id/consent/logs` / POST `:id/consent` (append consent event)
- `customers.service.ts`: 
  - Normalize `customFields.marketingPreferences` helpers, consent log CRUD (using `auditLog` or new model), `getRecentOrders` used by 360.
  - Hooks to recompute segment memberships on updates (existing helper used)
- `customer-analytics.service.ts`:
  - Add RFM computation, enhance `getCustomer360Profile` with orders summary, SLA risk badges and call summaries.
  - Add CLV trend and CSAT trend calculators; cohort/funnel are present—surface CSAT/CLV trend endpoints.
- `customer-360.controller.ts`:
  - Expose preferences endpoints passthrough and new analytics endpoints: `/health-score`, `/lifetime-value`, `/journey` (existing), `/insights` (existing), plus `/analytics/overview` with trends.
- `customer-satisfaction.service.ts`:
  - Add in-app survey `sendWebSurvey()` + endpoint in controller (optional public link).
- Omnichannel adapters
- `libs/shared/conversation/src/lib/adapters/email-adapter.ts`: ensure `inReplyTo/references` mapping; attachments via `path` (done); add fallback plain-text sanitizer.
- `instagram-adapter.ts`: retries/backoff added for comment replies (done), keep username cache.
- `whatsapp-adapter.ts`: templates validation/backoff/idempotency (done). Add flows trigger helper reuse for surveys.
- Analytics & Exports
- `api-gateway/src/app/analytics/analytics.controller.ts` & `analytics-reporting.service.ts`: add CSAT/CLV trend reports and segment exports; ensure schedules include customer filters.
- Notifications
- `notifications.service.ts`: categories (customer/sla/survey), preference filter, event bus hookups.

## Data Model (Prisma)

- Prefer existing `customFields` for preferences to avoid migrations now.
- If needed later: add `ConsentLog` model and `CustomerPreference` model (deferred).

## Frontend (Admin Dashboard)

- Customers Area
- `apps/admin-dashboard/src/app/[locale]/dashboard/customers/page.tsx`:
  - Add Preferences section (toggle WA/Email/SMS, quiet hours). Show CSAT trend and CLV trend mini cards.
- `customer-360-profile.tsx`:
  - Orders summary widget, RFM score, SLA markers, call summary chip, insight cards.
- `customer-journey-timeline.tsx`:
  - Add SLA breach and purchase icons; group by stage; tooltips with sentiment.
- `customer-analytics-dashboard.tsx`:
  - Add CSAT trend, CLV trend, cohort heatmap; export/schedule buttons.
- `customer-health-score.tsx`:
  - Show contributing factors with mini bars; rescore CTA (exists in page).
- `customers-client.ts`:
  - Methods: `getPreferences`, `updatePreferences`, `getConsentLogs`, `appendConsent`, `getCohorts`, `getTrends`.
- Thread Enhancements
- Templates/macros dropdown and favorites in `ConversationThread.tsx`.
- i18n
- Update `apps/admin-dashboard/messages/{en,fr,ar}.json` with new strings.

## Workflow & Automation

- Add workflow triggers for: `customer.health_score_updated`, `customer.vip_detected`, `csat.low_rating_received`, `customer.churn_risk_high` with default playbooks.

## Security & Compliance

- Add consent export API, retention utility, redaction helper. Respect quiet hours in outbound sends.

## Observability & Perf

- Add indexes for common queries (customers by tenant, segment membership, payments by customer). Cache segment counts. Log slow queries.

## Testing

- Unit tests for analytics calculators (CSAT/CLV/RFM), preferences/consent, and adapters.
- E2E tests for customers 360 endpoints and UI flows (create customer, rescore health, toggle WA opt-out, send survey).

## Execution Order & Acceptance

1) Preferences/consent APIs + UI (+ CSAT/CLV trend endpoints). Accept: prefs toggle works; consent log persists; trends render in dashboard. [Done]
2) Customer 360 widgets (orders, RFM, SLA, call summary) + journey markers. Accept: widgets visible with data; SLA/purchase markers render. [In Progress]
3) Segment actions (export JSON/CSV, schedule report, trigger workflow). Accept: exports downloadable; schedule created; workflow trigger logged.
4) Thread reply templates/macros. Accept: templates list loads; insert into composer; send via WA/IG/Email.
5) In‑app survey + notifications. Accept: survey link works; responses stored; notifications arrive respecting prefs.

## Constraints

- No DB migrations in this pass (use customFields/auditLog). Safe fallbacks and feature flags.
- Respect quiet hours and opt‑out in all outbound.

## Rollback

- Feature flags per tenant for each step; revert by toggling flags.

## ETA

- Steps 1‑2: 2–3 days; Steps 3‑5: 3–5 days depending on QA.

## Key Files to Update

- Backend: `customers.controller.ts`, `customers.service.ts`, `customer-analytics.service.ts`, `customer-360.controller.ts`, `customer-satisfaction.service.ts`, `analytics.controller.ts`, `analytics-reporting.service.ts`
- Frontend: `customers/page.tsx`, `customers-client.ts`, `customer-360-profile.tsx`, `customer-analytics-dashboard.tsx`, `customer-journey-timeline.tsx`, `customer-health-score.tsx`, `messages/*.json`
- Adapters (already improved): `instagram-adapter.ts`, `email-adapter.ts`, `whatsapp-adapter.ts`

### To-dos

- [x] Add customer preferences/consent endpoints and service helpers
- [x] Add CSAT/CLV trend endpoints and integrate into dashboard
- [ ] Enhance Customer 360 with orders, RFM, SLA, call summary
- [x] Add SLA breach and purchase markers to timeline
- [x] Add export, schedule, workflow actions to segment cards
- [x] Add reply templates/macros to ConversationThread UI
- [ ] Implement in-app survey endpoint+UI with analytics
- [ ] Extend notifications with categories and user prefs
- [ ] Add indexes, caching, slow query logs for customer analytics
- [ ] Add unit/E2E tests for customers/analytics/adapters
