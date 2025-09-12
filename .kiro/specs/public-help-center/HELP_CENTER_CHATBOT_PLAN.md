### Public Help Center Chatbot — Plan & Tasks

- [x] Public knowledge endpoints in backend (search/article/faq) with host-based tenant derive
- [x] Public Help Center page `/[locale]/help-center` (no auth) consuming public endpoints
- [x] Harden frontend against undefined responses (length guards, null-safe HTML)

#### Phase 1 — Web Chat (embedded)
- [x] Backend: PublicChat endpoints (no auth)
  - [x] POST `/public/chat/start` → start anonymous session; resolve tenant via host; optional email/name; returns `sessionId`
  - [x] POST `/public/chat/message` → accept `sessionId`, `text`; return `reply` + KB suggestions
  - [x] GET `/public/chat/history` → optional; return last N messages for `sessionId`
- [x] Service: Use `KnowledgeService.search` and `AIIntelligenceService.analyzeContent` to compose helpful replies (fallback + suggestions)
- [x] (Optional) Persist conversations later; for now in-memory/ephemeral is acceptable; audited in plan
- [x] Frontend: Minimal chat widget on `/[locale]/help-center`
  - [x] Message list, input box, sending state, error state
  - [x] Show suggested KB links below bot replies
  - [x] Session handling in localStorage

#### Phase 2 — WhatsApp CTA
- [x] UI: "Continue on WhatsApp" button → dynamic link with session prefill
- [x] Backend: `/public/chat/whatsapp-link` generates wa.me URL
- [x] Backend: Link public session to WhatsApp sender on first inbound webhook (in-memory map)
- [x] Mirror inbound WA messages into public chat via webhook → session store
- [x] Send via WA from widget: adapter send wired when session linked

#### Phase 3 — Email CTA
- [x] UI: "Ask via Email" (email + message) form on help center page
- [x] Backend: Use `EmailService.sendEmailForTenant` to send confirmation and append chat notice
- [x] Create/Upsert `Customer` if email provided; create `Conversation` (channel: email) and link to session

#### Phase 4 — Persistence & Identity
- [x] In-memory session store for public chat (scoped per tenant)
- [x] Session→Conversation linking in memory for continuity
- [x] Persist public chat to DB on link and forward (MessageAdvanced)
- [x] Add magic-link resume endpoint/token (web)

- [x] Basic rate limiting in public chat (1 msg/sec per session)
- [ ] Optional CAPTCHA toggle
- [ ] Sanitize user-submitted content rendering
- [ ] Track deflection metrics (views → chat → resolution), search analytics using existing KB events

#### Phase 6 — Polish
- [ ] i18n strings for Help Center chat
- [ ] Theming / branding alignment
- [ ] Accessibility pass

Notes:
- DB: `Message` references `User`, so for Phase 1 we avoid DB writes; Phase 4 will add a safe persistence path (new model or adjusted write path through existing services).
- Security: Use strict input validation on public endpoints; rely on existing CORS and middleware headers.


