# ARCHITECTURE.md

## Overall Architecture Pattern

Betali is a **full-stack SaaS monorepo** with two workspaces managed by Bun:

- `frontend/` — React SPA (Vite, port 3000)
- `backend/` — Node.js REST API (Express, port 4000)

Both workspaces share a single `bun.lock`. The application is undergoing a migration from a single-tenant model to a **multi-tenant SaaS** architecture where data is isolated per `organization_id`. The database layer is Supabase (managed PostgreSQL) accessed via the Supabase JS client.

---

## Backend Architecture

### Pattern: Clean Architecture with OOP + Dependency Injection

The backend is structured in strict horizontal layers. Each layer only depends on the layer below it.

```
HTTP Request
    ↓
Middleware chain (auth, org-context, rate-limit, validation, sanitization)
    ↓
Routes (thin Express routers)
    ↓
Controllers (HTTP handlers — no business logic)
    ↓
Services (business logic, orchestration)
    ↓
Repositories (data access — Supabase queries only)
    ↓
Supabase (PostgreSQL)
```

### Entry Point

`backend/server.js` — defines an `Application` class with `initialize()` and `start()` methods. On startup it:
1. Validates env vars
2. Initializes i18n (`backend/utils/i18n.js`)
3. Registers middleware
4. Registers all routes
5. Runs a DB health check
6. Starts the inventory alert background job
7. Sets up graceful shutdown (SIGTERM/SIGINT with 30s timeout)

### Dependency Injection Container

`backend/config/container.js` implements a custom IoC container (`Container` class using a `Map`). All repositories, services, and controllers are registered as **singletons** with lazy factory functions. Dependencies are resolved by name at first access. A `ServiceFactory` static object exposes named factory methods used by route files.

This means:
- All controller/service/repository instances are singletons shared across requests
- Routes pull specific instances via `container.get('orderController')` or `ServiceFactory.createOrderController()`
- No circular dependency issues — registration order is deterministic

### Middleware Stack (ordered)

1. `helmet` — security headers (CSP, etc.)
2. `cors` — allows `localhost:3000/3001/3002` in dev, `FRONTEND_URL` in prod; passes `x-organization-id` header
3. `express.json` — 10 MB limit
4. `sanitizeMiddleware` — global input sanitization
5. `i18n.middleware()` — request-level locale detection
6. Request logger (Winston via `Logger` class)
7. Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
8. Per-route: `authenticateUser` → `requireOrganizationContext` → `validateRequest` (Zod schemas) → `createLimiter`/`searchLimiter`

Rate limiting is deliberately **not** applied globally to avoid IP-keyed limits breaking behind shared proxies. It runs after auth so it can key by user ID.

### Authentication Flow

`backend/middleware/auth.js`:
1. Extracts `Bearer` token from `Authorization` header
2. Validates via `supabase.auth.getUser(token)` (primary)
3. Falls back to a base64-encoded temporary token format (legacy)
4. Fetches user profile from `public.users` table; if missing, self-heals by inserting a default row
5. Fetches all active `user_organizations` rows for the user and attaches them to `req.user`
6. Sets `req.user.currentOrganizationId` from `x-organization-id` header (or defaults to first org)
7. Computes highest role across all orgs as `req.user.role` (backward-compatible uppercase string)

### Multi-Tenancy on the Backend

`backend/middleware/organizationContext.js` — `requireOrganizationContext` middleware:
- Verifies `x-organization-id` header is present
- Confirms the requesting user has an active membership in that organization
- Sets `req.user.currentOrganizationId`, `currentOrganizationRole`, `currentOrganizationPermissions`

All data queries in services/repositories receive `organizationId` as an explicit parameter — there is no implicit tenant filtering at the ORM level. Each repository method scopes queries with `.eq('organization_id', organizationId)`.

Role hierarchy (lowest to highest): `viewer → employee → manager → admin → super_admin → owner`

Permission system (`backend/middleware/permissions.js`): granular `resource:action` strings (e.g. `products:read`, `orders:create`). Permissions can be checked per-org via `req.user.currentOrganizationPermissions`.

### Repository Layer

`backend/repositories/BaseRepository.js` — base class providing:
- `findById(id, idColumn?)`
- `findAll(filters?, options?)`
- `create(entityData)`
- `update(id, updates, idColumn?)`
- `delete(id, idColumn?)`
- `count(filters?)`
- `deleteByFilter(filters?)`

All methods wrap Supabase client calls and throw normalized `Error` objects. Concrete repositories extend `BaseRepository` and add domain-specific methods (e.g., `OrderRepository.findWithDetails()`).

### Service Layer

Services contain all business logic and orchestration:
- Accept repository instances via constructor (injected by container)
- Are not aware of HTTP (no `req`/`res`)
- Call multiple repositories when needed (e.g., `OrderService` depends on 8 repositories + `PricingService`)
- Always receive `organizationId` as an explicit argument for multi-tenant data isolation

### Background Jobs

`backend/jobs/inventoryAlertChecker.js` — runs on a timer, checks stock levels across all active orgs and generates alerts. Started by `alertChecker.start()` in `server.js`.

---

## Frontend Architecture

### Pattern: Feature-based React SPA with Context + TanStack Query

#### Entry Points

- `frontend/src/main.tsx` — mounts `<App />` into `#root`
- `frontend/src/App.tsx` — root component tree

#### Provider Stack (outer to inner)

```
QueryProvider          (TanStack Query client — global cache)
  ErrorBoundary
    AuthProvider       (Supabase session, user state)
      GlobalSyncProvider  (loading indicators for cross-cutting async)
        OrganizationProvider  (current org, org switching, permissions)
          UserContextSwitcherProvider
            LanguageProvider / ThemeProvider / DateFormatProvider
              OnboardingProvider
                BrowserRouter
                  Routes (protected + public)
```

#### Routing

`frontend/src/App.tsx` uses `react-router-dom` v6 flat route declarations.

- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`
- Protected routes: all `/dashboard/*` and `/payment/*` paths, wrapped in `<ProtectedRoute>`
- All dashboard pages are **lazily loaded** via `React.lazy()` — only `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `TermsOfService`, `PrivacyPolicy`, `NotFound`, `Welcome` are eagerly imported
- `<Suspense fallback={null}>` wraps lazy routes; `<GlobalLoading>` provides the visual loading indicator independently

#### State Management

Two layers:

1. **Server state**: TanStack Query (`@tanstack/react-query`)
   - Global config in `frontend/src/lib/providers/query-provider.tsx`: `staleTime=5min`, `gcTime=10min`, `refetchOnWindowFocus=false`, `retry=1`, `refetchOnMount=false`
   - Query keys are namespaced by domain (e.g., `['products', orgId]`)
   - `enabled: !!orgId` guards prevent queries from firing before org context is set
   - On org switch: targeted `invalidateQueries` with a predicate that preserves auth/user queries

2. **Client state**: React Context
   - `AuthContext` — Supabase session, signIn/signOut/signUp, token refresh
   - `OrganizationContext` — current organization, role, permissions, org switching, org creation
   - `GlobalSyncContext` — global loading state
   - `ThemeContext`, `LanguageContext`, `DateFormatContext` — UI preferences
   - `OnboardingContext` — onboarding wizard state

#### HTTP Client

`frontend/src/services/http/httpClient.ts` — `HttpClient` class:
- Reads Supabase session token from `supabase.auth.getSession()`
- Reads `currentOrganizationId` from `localStorage` and injects as `x-organization-id` header on every request
- Methods: `get<T>`, `post<T>`, `postFormData<T>`, `put<T>`, `patch<T>`, `delete<T>`

`frontend/src/services/api.ts` — aggregates domain service modules:
```
apiService.products     → productsService
apiService.warehouses   → warehouseService
apiService.stockMovements → stockMovementService
apiService.users        → userService
apiService.organizations → organizationService
```

Additional service modules exist in `frontend/src/services/api/` (orders, clients, suppliers, pricing, etc.) and are imported directly by hooks.

#### Hooks

Domain hooks in `frontend/src/hooks/use*.ts` encapsulate TanStack Query calls + mutations for each entity:
- `useProducts`, `useOrders`, `useClients`, `useWarehouse`, `useStockMovement`, etc.
- Each hook returns `{ data, isLoading, error, createMutation, updateMutation, deleteMutation }`
- `useOrganizations` / `useFeatureAccess` / `usePermissions` — SaaS-tier and permission utilities

#### Component Architecture

```
components/
  layout/           — DashboardLayout, Sidebar
  templates/        — CRUDPage, ModalForm, FormSection, StatsSection (reusable CRUD scaffolding)
  features/         — domain-specific UI grouped by entity (products, orders, warehouse, billing, etc.)
  modules/          — larger assembled modules (dashboard stats, etc.)
  ui/               — primitives (Button, Badge, Card, DataTable, Dialog, etc.)
  common/           — shared utility components
  table/            — table-specific components
  ProtectedRoute.tsx
  ErrorBoundary.tsx
```

`CRUDPage<TEntity>` template (`frontend/src/components/templates/crud-page.tsx`) is the primary pattern for list views: accepts `data`, `columns`, `isLoading`, `error`, `onCreateClick`, optional `headerActions`, `beforeTable`, `afterTable`, `customTable` slots. Wraps `<DashboardLayout>` and `<DataTable>`.

#### Multi-Tenancy on the Frontend

- `OrganizationContext` stores `currentOrganization`, `currentUserRole`, `currentPermissions`
- On cold start: reads `currentOrganizationContext` from `localStorage` synchronously so the `x-organization-id` header is available before the first fetch completes
- `switchOrganization()` calls the API, updates context, persists to `localStorage`, invalidates org-scoped queries
- `hasPermission(permission)` checks against `currentPermissions`; `'*'` grants all
- `canAccessUsersSection` computed from role (`admin`, `manager`, `super_admin`)

---

## Data Flow (End-to-End Example: List Orders)

1. User navigates to `/dashboard/orders` → `Orders` page lazily loaded
2. Page renders; `useOrders(orgId)` hook fires TanStack Query with key `['orders', orgId]`
3. Query calls `orderService.getOrders()` → `httpClient.get('/api/orders')`
4. `HttpClient.getHeaders()` attaches `Authorization: Bearer <token>` + `x-organization-id: <orgId>`
5. Express receives request on `POST /api/orders`
6. `authenticateUser` middleware validates token, attaches `req.user` with org roles
7. `requireOrganizationContext` verifies org membership, sets `req.user.currentOrganizationId`
8. `OrderController.getOrders(req, res)` extracts query params, calls `OrderService.getOrders(orgId, filters)`
9. `OrderService` calls `OrderRepository.findAll({ organization_id: orgId }, options)`
10. `BaseRepository.findAll()` executes Supabase query scoped to `organization_id`
11. Response flows back: repository → service → controller → JSON response
12. TanStack Query stores result in cache; React re-renders with data

---

## Key Abstractions Summary

| Abstraction | Location | Purpose |
|---|---|---|
| `Application` class | `backend/server.js` | Express app lifecycle management |
| `Container` class | `backend/config/container.js` | IoC/DI container, singleton registry |
| `BaseRepository` | `backend/repositories/BaseRepository.js` | Generic Supabase CRUD operations |
| `authenticateUser` | `backend/middleware/auth.js` | JWT validation + org context hydration |
| `requireOrganizationContext` | `backend/middleware/organizationContext.js` | Per-request org scoping |
| `OrganizationProvider` | `frontend/src/context/OrganizationContext.tsx` | Client-side org state + switching |
| `HttpClient` | `frontend/src/services/http/httpClient.ts` | Auth + org headers on all API calls |
| `CRUDPage<T>` | `frontend/src/components/templates/crud-page.tsx` | Reusable list-page scaffold |
| `QueryProvider` | `frontend/src/lib/providers/query-provider.tsx` | TanStack Query global config |
