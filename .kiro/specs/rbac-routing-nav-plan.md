### Admin vs Agent: RBAC, Routing, and Navigation Consolidation Plan

#### Verification Snapshot

- Backend
  - `api-gateway/src/app/tickets/tickets.controller.ts`
    - Uses `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` with `@Roles` and `@Permissions` per endpoint.
    - Admin-only: `GET /tickets/stats`, `DELETE /tickets/:id`, `PATCH /tickets/:id/assign/auto`.
    - Admin+Agent: create, list, update, assign, resolve, reopen, similar, timeline, export, ai, tags, notes.
  - `tickets.service.ts`
    - Business logic; no role checks (correct – controller guards enforce RBAC). Publishes events and search indexing.
  - `tickets.module.ts`
    - Composition OK.
  - `tickets.gateway.ts`
    - No authentication/authorization on WebSocket handshake; clients can join arbitrary rooms. Tenant/role scoping not enforced.
  - `tickets-search.service.ts`
    - Search/indexing only; fine.
  - `tickets-routing.service.ts`
    - Agent suggestion logic; no RBAC required here.

- Frontend
  - `apps/admin-dashboard/src/lib/hooks/use-tickets.ts`
    - Single hook for all roles; no role-aware capabilities; mock fallbacks included.
  - `apps/admin-dashboard/src/components/auth/protected-route.tsx`
    - Redirects are not locale-prefixed (`/auth/login`, `/dashboard`, `/tickets`). Uses i18n router but paths lack locale awareness; onboarding redirects also non-locale.
  - `[locale]/` structure
    - Admin area uses `/[locale]/dashboard/*`. Agent area uses `/[locale]/tickets` and `/[locale]/conversations` with section layouts, but there’s no top-level, consistent shell when landing.
  - Navigation
    - `apps/admin-dashboard/src/i18n/navigation.ts` exports i18n-aware `Link`, `useRouter`, `usePathname`.
    - `components/dashboard/sidebar.tsx` imports `Link` from `next/link` and uses hardcoded paths, creating locale mismatch. Sidebar mixes admin and agent items behind runtime checks; structure is monolithic.
  - Styling
    - `apps/admin-dashboard/src/app/globals.css` is fine; no blockers.

#### Goals

- Clear role separation for routes, pages, and actions (Admin vs Agent).
- Locale-aware navigation and redirects everywhere.
- Consistent App Shell (header + sidebar) per role area.
- Harden WebSocket auth and tenant/role scoping.

#### Proposed Architecture & Changes

1) Route Groups and Layouts (Next.js App Router)
   - Introduce route groups per role:
     - `apps/admin-dashboard/src/app/[locale]/(admin)/` → contains existing admin dashboard pages (`dashboard`, `agents`, `teams`, `analytics`, etc.).
     - `apps/admin-dashboard/src/app/[locale]/(agent)/` → contains agent-facing pages (`tickets`, `conversations`, agent-specific analytics if any).
   - Add role-specific layouts:
     - `(admin)/layout.tsx` using `AdminSidebar` and AppShell header.
     - `(agent)/layout.tsx` using `AgentSidebar` and AppShell header.
   - Update existing pages to live under the appropriate group without changing their URLs (route groups don’t alter the URL).

2) Global App Shell and Sidebars
   - Create `components/navigation/AppShell.tsx` (header: brand, locale switch, user menu, search/command palette).
   - Split `components/dashboard/sidebar.tsx` into:
     - `components/navigation/AdminSidebar.tsx`
     - `components/navigation/AgentSidebar.tsx`
   - Use i18n `Link`/router everywhere; remove `next/link` imports in nav.

3) Locale-Aware Protection and Redirects
   - Upgrade `ProtectedRoute` to:
     - Get current locale and prefix all redirects.
     - Accept `requiredRole` and compute default landing per role:
       - Admin → `/[locale]/dashboard`
       - Agent → `/[locale]/tickets`
     - Respect `returnTo` param with locale.
   - Add top-level role-based redirect:
     - In `apps/admin-dashboard/src/app/[locale]/page.tsx`, if authenticated, redirect to the default landing for the user’s role.

4) Role-Aware Tickets UX
   - Extend `use-tickets.ts` with an optional `mode: 'admin' | 'agent'` (or infer from auth store) to expose a `capabilities` map (e.g., `canDelete`, `canAssignAuto`, `canViewStats`).
   - Gate admin-only actions in UI based on `capabilities` (buttons hidden/disabled, routes protected).

5) WebSocket Security and Tenant Scoping
   - In `tickets.gateway.ts`:
     - Validate JWT on handshake, derive `tenantId`, `userId`, `role`.
     - Auto-join rooms: `tenant:{tenantId}`, `user:{userId}`, `role:{role}`; reject if invalid.
     - Ensure `broadcast` helper targets tenant-scoped rooms only by default.

6) Navigation and i18n Consistency
   - Replace all `next/link` in nav with i18n `Link`.
   - Replace direct `router.push('/path')` with i18n router helpers and locale-aware paths.
   - Normalize admin vs agent nav items; avoid mixing both in one array; export constants:
     - `ADMIN_NAV_ITEMS`
     - `AGENT_NAV_ITEMS`

7) Documentation and Acceptance Tests
   - Document role-to-permission-to-UI mapping.
   - Add an acceptance checklist (below) and quick QA script.

#### Acceptance Criteria

- After login:
  - Admin lands on `/[locale]/dashboard`; Agent lands on `/[locale]/tickets`.
  - Global AppShell and role-appropriate sidebar are visible across pages.
  - All navigation uses the current locale; no 404 due to missing locale segment.
- Admin-only features:
  - Tickets: Stats, Auto-assign, Delete are hidden/disabled for agents in UI and blocked by API guards.
- WebSockets:
  - Connection requires a valid JWT; users join tenant-scoped rooms; cross-tenant emissions are not received.
- Onboarding/ProtectedRoute:
  - Locale-aware redirects to `/[locale]/onboarding` when needed; `returnTo` preserved with locale.

#### Step-by-Step Implementation

1) Backend
   - Add handshake auth to `tickets.gateway.ts` and enforce tenant/role scoping.
   - No change to `tickets.controller.ts` RBAC (already correct); confirm `@Permissions` strings match UI gating.

2) Frontend
   - Create `AppShell.tsx`, `AdminSidebar.tsx`, `AgentSidebar.tsx` and wire into `(admin)/layout.tsx` and `(agent)/layout.tsx`.
   - Migrate pages under route groups (admin vs agent) without URL change.
   - Update `ProtectedRoute` to prefix locale on all redirects and apply role-based default paths.
   - Replace nav `Link`/router with i18n variants in sidebars and header.
   - Enhance `use-tickets.ts` to expose capabilities for role-based UI.
   - Update `[locale]/page.tsx` to role-redirect for authenticated users.

3) QA & Docs
   - Add a short guide mapping roles → routes → capabilities.
   - Manual test matrix covering admin/agent across locales (login, redirects, nav, tickets actions, websockets).

#### Open Questions

- Should agents be allowed to create tickets? (Currently allowed.)
- Should agents access analytics/observability pages?
- Any additional roles besides `admin`, `agent` (e.g., `super_admin`) that require distinct areas?

#### Estimated Scope

- Backend: 1 file (gateway) + tests.
- Frontend: 6–8 files (new layouts/shell/sidebars) + 6–10 edits (ProtectedRoute, pages moved, nav updates, hooks).


