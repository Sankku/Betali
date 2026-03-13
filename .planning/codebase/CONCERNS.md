# Codebase Concerns — Betali SaaS Platform

> Generated: 2026-03-13
> Branch: develop
> Scope: Full codebase audit of technical debt, security gaps, performance risks, and fragile areas

---

## 1. Security Concerns

### 1.1 Temporary Token Fallback — Critical Auth Bypass Risk
**File:** `backend/middleware/auth.js` (lines 40–68)

The authentication middleware contains a fallback that accepts a home-grown base64-encoded token format when Supabase auth fails. The token is a simple base64 JSON payload validated only by checking `tokenPayload.exp > Date.now() / 1000`. There is no HMAC signature or cryptographic integrity check. Any attacker who knows this format can forge a valid-looking token. This appears to be legacy test scaffolding that was never removed.

### 1.2 Unauthenticated `/api/auth/signup-status/:user_id` Endpoint
**File:** `backend/routes/auth.js` (line 290)

The `GET /api/auth/signup-status/:user_id` endpoint has no authentication middleware applied. Any caller who knows (or guesses) a `user_id` can retrieve the user's email, name, `organization_id`, and `is_active` status without credentials.

### 1.3 Table Config Routes Are Completely Unauthenticated
**File:** `backend/routes/tableConfig.js`

All table configuration CRUD endpoints (`/api/tables/*`) use a `mockAuthMiddleware` that injects a hard-coded fake user (`mock-user-id`, `admin@example.com`) instead of requiring a real JWT. The real auth import is commented out with `// Comentado temporalmente`. This is a fully public, unauthenticated admin surface in production.

### 1.4 Missing Webhook and Cron Secrets in Production Environment
**File:** `backend/.env`, `backend/routes/cron.js`, `backend/middleware/mercadoPagoWebhook.js`

Neither `MERCADOPAGO_WEBHOOK_SECRET` nor `CRON_SECRET` are set in the current `.env` file. The webhook middleware explicitly logs `"This is insecure for production!"` and skips signature verification when the secret is absent. The cron routes also skip authentication when `CRON_SECRET` is not configured, allowing unauthenticated calls to trigger subscription billing jobs.

### 1.5 Organization Access Control Not Applied on Clients and Suppliers Routes
**Files:** `backend/routes/clients.js`, `backend/routes/suppliers.js`

These routes apply `authenticateUser` but do not apply `requireOrganizationContext` middleware (unlike `products.js`, `orders.js`, `warehouse.js`, etc.). Organization scoping is enforced downstream inside the controller by reading `req.user.currentOrganizationId` — a pattern that silently falls back to `null` if the `x-organization-id` header is absent, potentially returning no data instead of a proper 400 error, and creating inconsistency with other route groups.

### 1.6 `getAllOrganizations` Has No Admin Guard
**File:** `backend/controllers/OrganizationController.js` (line 25)

The `GET /api/organizations` endpoint lists all organizations across the entire platform. There is a prominent `// TODO: Add proper system admin check - for now logging access` comment. The only current control is a `requirePermission(PERMISSIONS.ORGANIZATIONS_READ)` check, which any regular `admin` or `manager` role satisfies. Any organization admin can enumerate all other organizations.

### 1.7 `password_hash` Column Stores Plaintext Sentinel Values
**Files:** `backend/middleware/auth.js` (line 205), `backend/scripts/simple-user-insert.js`, `backend/scripts/seed-test-user.js`

The `users` table has a `password_hash` column that stores the string `"managed_by_supabase_auth"` as a placeholder. While passwords are actually managed by Supabase Auth, this creates confusion and schema debt. If any code path ever reads and trusts this field it would be a severe vulnerability.

### 1.8 Sanitization Applied with Generic `search` Rules Globally
**File:** `backend/server.js` (line 160)

`sanitizeMiddleware(SANITIZATION_RULES.search)` is applied globally but uses the `search` rules profile, which only targets `query.q`, `limit`, `offset`, `sortBy`, and `sortOrder`. Request bodies and other query params for non-search endpoints are not covered by this global sanitizer — they rely on per-route sanitization being applied consistently, which it is not (e.g., clients and suppliers routes apply no sanitize middleware).

---

## 2. Technical Debt

### 2.1 Dual `/:id/switch` Route Registration
**File:** `backend/routes/organizations.js` (lines 65 and 151)

The route `POST /:id/switch` is registered twice — once at line 65 binding `switchOrganizationContext` and again at line 151 binding `switchContext`. The second registration silently shadows the first. Both methods exist on the controller but have slightly different behavior. The commented-out `updateMemberSchema` block on lines 24–37 is also leftover dead code.

### 2.2 Legacy `DatabaseManager` in `config/supabase.js` Alongside Modern Repositories
**File:** `backend/config/supabase.js`

A legacy `DatabaseManager` class with generic `getAll`, `getById`, `create`, `update`, `softDelete`, `hardDelete` methods coexists with the modern `BaseRepository` pattern used across services. The `Logger` is called as a plain function (`Logger(...)`) instead of as a class instance (`new Logger(...)`), which will fail or produce wrong output. This file is a leftover from the pre-architecture-migration era.

### 2.3 Archived Manual-Billing Code Still Present
**Directory:** `backend/archive/manual-billing/`

Files `SubscriptionController.js`, `SubscriptionService.js`, and `subscriptions.js` are kept in an archive directory. Their presence creates confusion about which billing implementation is canonical. A rollback migration `backend/migrations/rollback_manual_billing.sql` also exists, indicating a partially-completed migration.

### 2.4 Debug Scripts Committed to Repo Root
**Files:** `debug-frontend.js`, `debug-organization-context.js` (project root)

Two debug helper scripts are committed to the repository root. `debug-frontend.js` is intended to be pasted into the browser console and prints localStorage state. These should not be in version control.

### 2.5 `ActionsCell` Dropdown Layout Unimplemented
**File:** `frontend/src/components/table/cells/ActionsCell.tsx` (lines 24–25)

When `layout === 'dropdown'` is configured, the component renders `<div>Dropdown actions (TODO)</div>` — a literal TODO with a broken UI output visible to end users if the layout is ever set to `dropdown`.

### 2.6 Inconsistent Permission Check Style Across Routes
Several routes (`clients.js`, `suppliers.js`, `users.js`) apply `requirePermission` per-handler rather than using `router.use()`. Others (`products.js`, `warehouse.js`) use `router.use(requireOrganizationContext)` globally for the organization check. This inconsistency makes it easy to forget permission guards when adding new endpoints.

### 2.7 `getBranchById` is a Stub Returning `null`
**File:** `backend/controllers/OrganizationController.js` (line 474)

The `getBranchById` method has a comment: `"This would be implemented when we create the BranchService. For now, return null."` The branch system is referenced in `ClientRepository.js`, `SupplierRepository.js`, `UserRepository.js`, and `UserOrganizationRepository.js` (querying a `branches` table) but there is no `BranchService`, no `BranchRepository`, and no branch management routes.

### 2.8 `idempotencyKey` for MercadoPago is Non-Idempotent
**File:** `backend/services/MercadoPagoService.js` (line 41)

The MP client is initialized with `idempotencyKey: 'betali-' + Date.now()`. This creates a new key on every service initialization, which defeats idempotency. For payment operations, idempotency keys should be tied to the specific request (e.g., the subscription ID), not a timestamp on startup.

### 2.9 `Logger` Wrapper Is a Thin Console Wrapper Without Log Levels or Transport
**File:** `backend/utils/Logger.js`

The `Logger` class simply calls `console.log/error/warn`. There is no log rotation, no structured transport (e.g., to a file or external service), no configurable minimum log level, and debug logs fire `console.log` statements in development even at high volume. A proper Winston instance is referenced in `backend/config/logger.js` but is not used by the `Logger` class.

### 2.10 Two Logger Systems Coexist
**Files:** `backend/utils/Logger.js`, `backend/config/logger.js`

The project has both a `Logger` class (`utils/Logger.js`) used throughout controllers/services, and a separate `logger` module in `config/logger.js` used in the auth route. These are not the same instance and produce different log formats, making log aggregation harder.

---

## 3. Performance Issues

### 3.1 Authentication Middleware Makes 2 Database Queries Per Request
**File:** `backend/middleware/auth.js`

Every authenticated request triggers:
1. `SELECT *, is_active FROM users WHERE user_id = ?`
2. `SELECT organization_id, role, permissions, organization:organizations(*) FROM user_organizations WHERE user_id = ?`

These are sequential (not parallelized via `Promise.all`). At high traffic, this is a consistent 2× query overhead on every API call with no caching layer.

### 3.2 N+1 Pattern in `PricingService.calculateLineItemPricing`
**File:** `backend/services/PricingService.js` (line 119)

The pricing calculation iterates over order items with `for (const item of items)` and makes sequential `await` calls to `getApplicablePrice` and `calculateLineDiscounts` per item. For an order with N items, this results in up to 2N sequential database round-trips.

### 3.3 `InventoryAlertChecker` Queries All Organizations Sequentially
**File:** `backend/jobs/inventoryAlertChecker.js`

The background job fetches all active organizations then calls `await this.checkOrganization(...)` in a `for...of` loop, running each check sequentially. As the number of tenants grows, this will cause increasingly delayed checks and potential timeouts.

### 3.4 `SELECT *` in Auth Middleware User Fetch
**File:** `backend/middleware/auth.js` (line 100)

The user profile query uses `SELECT *, is_active` which selects all columns from the `users` table including `password_hash` (then discarded). A targeted column selection would reduce data transfer.

### 3.5 Usage Tracking via Separate `usage_tracking` Table May Diverge
**File:** `backend/middleware/limitEnforcement.js`

The `incrementUsage` function updates a `usage_tracking` table via a database RPC call for monthly resources. However, there is no mechanism ensuring this count stays synchronized if rows are deleted directly or if the RPC fails silently (the error is caught and swallowed). Actual enforcement re-counts from source tables, so the tracking table is used as a cache that could be stale.

---

## 4. Fragile Areas

### 4.1 Signup Flow Has No Transaction Rollback
**File:** `backend/routes/auth.js`

The `POST /api/auth/complete-signup` endpoint performs five sequential operations:
1. Create/verify Supabase Auth user
2. Create user in `public.users`
3. Create organization
4. Update user with `organization_id`
5. Create `user_organizations` relationship

If any step after step 1 fails (e.g., organization creation fails after the user row is created), there is no rollback. The user record remains without an organization, and a subsequent signup attempt is caught with the "already exists" path that only checks `user.organization_id` to determine if setup is complete.

### 4.2 `OrganizationContext` Trusts localStorage for Security-Adjacent State
**File:** `frontend/src/context/OrganizationContext.tsx`

On load, the context reads organization identity, user role, and permissions from `localStorage` (`currentOrganizationContext` key) and uses them immediately before the server confirms them. While the backend re-validates on each API call, the frontend renders UI, shows/hides features, and calculates `canAccessUsersSection` based on cached localStorage data. A corrupted or tampered localStorage can cause inconsistent UI.

### 4.3 `createOrganization` in Context Has Two Different Role Fallbacks
**File:** `frontend/src/context/OrganizationContext.tsx` (lines 318–345)

When creating a new organization, the code has two fallback branches that set `currentUserRole` to `'SUPER_ADMIN'` (uppercase), while the rest of the codebase uses lowercase role strings (`'super_admin'`). The `currentUserRole` type is `UserRole` but the value may not match the type's enum values, breaking role comparisons downstream.

### 4.4 Self-Healing in Auth Middleware Silently Creates Users
**File:** `backend/middleware/auth.js` (lines 196–218)

If a user authenticates successfully via Supabase but has no matching record in `public.users`, the middleware attempts to create one with `role: 'employee'`. This "self-heal" fires silently on every request until it succeeds, creates records with default values the user never configured, and could mask a real data integrity issue (e.g., a failed signup).

### 4.5 Webhook Log Always Records `signature_verified: true`
**File:** `backend/controllers/MercadoPagoController.js` (line 264)

The `logWebhook` method always inserts `signature_verified: true` into `webhook_logs` regardless of whether verification actually occurred. This means the audit log is unreliable for security forensics.

### 4.6 `processPayment` — Subscription Billing Is Monthly Fixed (30 days), Ignores `billing_cycle`
**File:** `backend/controllers/MercadoPagoController.js` (lines 550–557)

When a payment is approved, `periodEnd` is always calculated as `now + 30 days` even though the system accepts `billingCycle: 'yearly'`. Yearly subscribers will have their subscription expire in 30 days instead of 365 days.

### 4.7 `getMonthlyResourceCount` Silently Returns 0 on Error
**File:** `backend/middleware/limitEnforcement.js` (line 192)

When querying `usage_tracking` fails with any error other than "no record found" (`PGRST116`), the function returns `0` instead of throwing. This means a database outage would silently disable all monthly usage limits.

### 4.8 Graceful Shutdown References `this.db` Which Is Never Assigned
**File:** `backend/server.js` (line 317)

The `setupGracefulShutdown` method checks `if (this.db && this.db.close)` to close database connections. The `Application` class never assigns `this.db`, so this branch is dead code and database connections are never explicitly closed during shutdown.

---

## 5. Migration / Architecture Concerns

### 5.1 Hybrid Role System — Two Parallel Permission Frameworks
**Files:** `backend/middleware/permissions.js`, `backend/middleware/organizationContext.js`

The codebase has two overlapping permission systems:
- **Global role-based** (`permissions.js`): checks `req.user.role` (the "highest role" across all orgs, computed at auth time)
- **Org-scoped permissions** (`req.user.currentOrganizationPermissions`): per-organization granular permissions array

The `requirePermission` middleware uses the global highest role, not the org-scoped permissions. A user who is `owner` in one org and `viewer` in another will get `owner`-level access when operating in the viewer org context.

### 5.2 `users` Table Has Legacy `organization_id` Column Alongside `user_organizations`
**File:** `backend/routes/auth.js` (lines 188–191)

The signup flow still writes `organization_id` directly to the `users` table (Step 4), even though the SaaS architecture uses the `user_organizations` join table for multi-org membership. This dual-write to both `users.organization_id` and `user_organizations` is a migration remnant that could cause confusion if the two ever diverge.

### 5.3 `OWNER` Role Not in `ROLES` Enum
**File:** `backend/middleware/permissions.js`

The role hierarchy in `auth.js` includes `'owner'` (`roleHierarchy = ['viewer', 'employee', 'manager', 'admin', 'super_admin', 'owner']`), but the `ROLES` constant in `permissions.js` has no `OWNER` entry. A user with `owner` role calling `requirePermission` would fall through with `VIEWER` permissions (the default when the role is not found).

### 5.4 Frontend Routes Without Server-Side Authorization Guard
**File:** `frontend/src/App.tsx`

All dashboard routes are wrapped in `<ProtectedRoute>` which checks for authentication but does not validate that the user has an active subscription or any specific role. Routes like `/dashboard/pricing` and `/dashboard/subscription-management` are accessible to any authenticated user regardless of subscription status.

### 5.5 No Validation Schemas for Clients, Suppliers, or Purchase Orders
**Directory:** `backend/validations/`

Validation schemas exist for `products`, `orders`, `organizations`, `users`, `stockMovements`, `taxRates`, `discountRules`, `pricing`, and `warehouses`, but there are no schemas for:
- `clients` (no `clientValidation.js`)
- `suppliers` (no `supplierValidation.js`)
- `purchase-orders` (no `purchaseOrderValidation.js`)

These routes accept arbitrary user input without schema validation.

### 5.6 Branch System Partially Built But Not Functional
Multiple repositories (`ClientRepository.js`, `SupplierRepository.js`, `UserRepository.js`, `UserOrganizationRepository.js`) include branch filtering logic and query a `branches` table. There is no `BranchService`, no branch routes, and `OrganizationController.getBranchById` returns `null`. The branch system is in a permanently partial state.

---

## 6. Missing Expected Features

### 6.1 No Audit Log for Destructive Operations
There are no audit trail writes when users are hard-deleted (`DELETE /api/users/:id/hard-delete`), organizations are deleted, or member roles are changed. The subscription cancellation flow does write to `subscription_history`, but this pattern is not applied elsewhere.

### 6.2 No Pagination on `getAllOrganizations`
**File:** `backend/controllers/OrganizationController.js` (line 36)

The controller calls `getAllOrganizations(options)` and returns `organizations.length` as the total, but the result set is not paginated server-side — all organizations are loaded into memory.

### 6.3 Email Delivery Has No Fallback or Retry
**File:** `backend/services/EmailService.js`

Email sending is fire-and-forget in most paths (welcome email, payment confirmation). If `RESEND_API_KEY` is not configured, the service logs a warning and silently does nothing. There is no queue, no retry, and no alerting when emails fail.

### 6.4 Frontend Has No Error Boundary Per Feature
**File:** `frontend/src/App.tsx`

There is a single top-level `<ErrorBoundary>` wrapping all routes. A crash in one lazy-loaded page brings down the entire dashboard. Feature-level error boundaries would allow graceful degradation.

### 6.5 No E2E Test Coverage for Billing / Subscription Flows
**Directory:** `frontend/tests/e2e/`

E2E tests cover `auth`, `orders`, `products`, `warehouse`, and `dashboard` but there are no tests for the subscription management, payment, or billing flows — the highest-risk area of the application.

---

## 7. TODO / FIXME Markers

| Location | Comment | Implication |
|---|---|---|
| `backend/controllers/OrganizationController.js:25` | `TODO: Add proper system admin check` | Any admin-role user can list all organizations platform-wide |
| `backend/services/WebhookRetryService.js:213` | `TODO: Could also send email notification here` | Permanent webhook failures are silent to operators |
| `frontend/src/components/table/cells/ActionsCell.tsx:24-25` | `TODO: Implementar dropdown` | Dropdown layout renders broken placeholder text to users |
| `backend/middleware/fileUpload.js:3` | `TODO: Use when implementing MIME type validation` | MIME types are not validated on file uploads |
| `backend/middleware/fileUpload.js:112` | `TODO: Use when implementing custom upload destinations` | Upload destination is hardcoded/default |
| `backend/controllers/OrganizationController.js:474` | `BranchService` stub returning null | Branch context in `switchContext` always resolves to null |

---

## 8. Architecture Inconsistencies

### 8.1 Mixed Controller Instantiation Patterns
Some controllers are singletons exported directly (`module.exports = new MercadoPagoController()`), others are constructed by `ServiceFactory`, and some are constructed by a dependency injection `container`. This makes understanding the dependency graph difficult.

### 8.2 `container.js` and `ServiceFactory` Are Separate DI Systems
**File:** `backend/config/container.js`

The `container` object and the `ServiceFactory` class both exist and are used in parallel across different routes. `products.js` uses `ServiceFactory`, `clients.js` uses `container.get('clientController')`, and `users.js` uses `ServiceFactory.createUserController()`.

### 8.3 Frontend Service Layer Has Inconsistent API Client Usage
**File:** `frontend/src/services/api/index.ts`

The `index.ts` barrel exports only 7 of the 13 service files (missing `mercadoPagoService`, `purchaseOrdersService`, `subscriptionService`, `supplierService`, `tableConfigService`). Consumers must import these directly from their individual files, breaking the single-import API surface pattern.
