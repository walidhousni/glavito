Tickets Workspace Redesign – Implementation Tracker

Scope: Redesign the Tickets experience to match the provided UI with a unified workspace: left list/filters, center conversation + composer, right knowledge panel. Support multi-channel (WhatsApp, Instagram, Email, Calls), Kanban view, real-time updates, and inline knowledge.

- [x] Create workspace scaffold (three columns: filters/list, conversation, knowledge)
- [x] Wire dashboard tickets page to new workspace
- [x] Stabilize list fetching and WS listeners to prevent loops

List and Selection
- [x] Expose integrated selection API in list (select ticket without dialog)
- [x] Update list to invoke selection callback and avoid re-renders
- [ ] Virtualize large lists (windowing) for performance

Conversation Panel
- [x] Add inline conversation panel shell (subject, details, timeline placeholder)
- [x] Add composer with channel icons (WhatsApp/IG/Email/Call) – stub send
- [x] Render live messages — real-time updates
- [ ] Paginate conversation history (infinite scroll)
- [x] Optimistic send in composer
- [ ] Reply quoting, attachments, emoji picker
- [ ] Ticket actions (assign/auto-assign, status/priority, add note)

Knowledge Integration
- [x] Knowledge panel with search (semantic) and results list
- [x] Auto-prime KB query from selected ticket context (basic stub)
- [x] Click-to-insert article snippet into composer
- [ ] Auto-suggest KB on new customer message

Kanban and Views
- [x] Add Kanban board toggle inside workspace
- [ ] Drag-and-drop between columns (status changes)
- [ ] Saved views and quick filters

Channels
- [ ] Send via WhatsApp template preview + locale
- [ ] Instagram DM/comment reply routing
- [ ] Email threading + OOO/bounce detection
- [ ] Call controls integration (start/end, mute, screen share, recording)

Real-time & Stability
- [x] WebSocket base for tickets events (join tenant room)
- [x] WebSocket base for conversations events (join conversation room)
- [ ] Optimistic updates + rollback on error
- [ ] Presence/typing indicators (optional)

Observability & Error UX
- [ ] Toasts + inline errors for send/actions
- [ ] Basic metrics for send attempts, failures, latencies

Security & i18n
- [ ] i18n keys for all new labels (en/fr/ar)
- [x] Base i18n for workspace placeholders (select ticket, knowledge search)
- [ ] Role-based control on actions (admin vs agent)

Rollout
- [ ] Feature flag workspace UI (enable per-tenant)
- [ ] Migration and fallback to old page during rollout

Notes
- First milestone delivers the shell: integrated selection, inline panel, KB search, composer stub. Subsequent tasks wire full conversations and actions.


