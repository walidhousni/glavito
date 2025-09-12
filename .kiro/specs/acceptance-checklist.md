### Admin/Agent RBAC, Navigation, and Ticketing Acceptance Checklist

#### Roles & Navigation
- Admin login shows global AppShell with `Dashboard` and admin sections in `Sidebar` (`/dashboard/*`).
- Agent login shows AppShell with `Conversations` and `Tickets` only (no admin sections).
- Locale-aware links route correctly; returnTo preserved on auth redirects.

#### Tickets (Agent vs Admin)
- Agent can: list, view, comment, resolve/reopen, assign to self (if permitted); cannot bulk delete; no auto-assign action visible.
- Admin can: all agent actions + auto-assign, delete; sees Stats panel; bulk delete visible.
- WebSocket connects with JWT; socket auto-joins tenant/role/user rooms; cannot join arbitrary rooms.

#### Conversations (Unified Inbox)
- Agent can access `/conversations` and see unified inbox; send messages with attachments respecting per-channel constraints.
- WhatsApp/Instagram inbound/outbound work; delivery/read indicators update from status callbacks.

#### Customers (Admin)
- Admin navigates to `/dashboard/customers`; list loads; 360/profile components render; analytics calls succeed.
- Agents do not see customers in sidebar.

#### Configuration & Tenants (Admin-only)
- TenantsController: create/list/get/update/delete and branding update require admin.
- ConfigurationController: organization/branding updates, logo upload, custom fields CRUD, validate, export/import require admin.
- Non-admin receives 403 for the above endpoints.

#### Dashboard Customization (Admin-only)
- `/dashboard/customize` loads current config via store; Save updates tenant `settings.dashboard`; Reset restores loaded state; Reload re-fetches.

#### Search
- Federated search returns tickets/customers/knowledge; respects tenant scoping; accessible to authenticated users.

#### Observability & Ops
- `/health/metrics` exposes Prometheus metrics; Prometheus scrapes; Grafana shows dashboards; alert rules trigger on webhook failures/429 spikes.

#### Security & Multi-tenant
- All data calls include tenant scoping; cross-tenant access is blocked.
- JWT required for protected routes; refresh flow works; logout clears tokens.

#### UI/UX Consistency
- AppShell header + sidebar present across admin and agent areas; active states in sidebar reflect current route; dark mode styles consistent.

#### Regression/Smoke Tests
- Admin: tickets stats, auto-assign, delete; customers page; customize dashboard save; configuration update branding; custom field create.
- Agent: unified inbox send; ticket resolve/reopen; WS real-time updates; cannot access admin routes or actions.


