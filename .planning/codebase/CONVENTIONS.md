# Betali — Coding Conventions

## Language and TypeScript

### Frontend (TypeScript)
- TypeScript strict mode is enabled in `frontend/tsconfig.app.json`:
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"noUncheckedSideEffectImports": true`
- Target: `ES2020`, module resolution: `bundler`
- `jsx`: `react-jsx` (no need to import React for JSX)
- Path alias `@/` maps to `src/` (used throughout imports)

### Backend (JavaScript)
- Backend is **plain JavaScript (CommonJS)**, not TypeScript
- Uses `require/module.exports` everywhere
- JSDoc comments document parameter types on all service and repository methods
- ESLint configured via `eslint-plugin-node` and `eslint-config-prettier`

---

## Naming Conventions

### Files
- **Frontend React components**: PascalCase `.tsx` (e.g., `OrganizationContext.tsx`, `ErrorBoundary.tsx`)
- **Frontend hooks**: camelCase prefixed with `use` (e.g., `useProducts.ts`, `useOrganizations.ts`)
- **Frontend services**: camelCase (e.g., `productsService.ts`, `httpClient.ts`)
- **Frontend pages**: PascalCase in subdirectories (e.g., `pages/Dashboard/Products`)
- **Backend classes**: PascalCase with suffix indicating role (e.g., `ProductController.js`, `ProductService.js`, `ProductRepository.js`)
- **Backend middleware**: camelCase (e.g., `auth.js`, `errorHandler.js`, `rateLimiting.js`)
- **Backend config**: camelCase (e.g., `container.js`, `database.js`)

### Functions and Methods
- **Async handlers** in controllers: descriptive verb + noun (e.g., `getProducts`, `createProduct`, `deleteProduct`)
- **Service methods**: mirror controller names (`getOrganizationProducts`, `createProduct`, `validateProductData`)
- **Repository methods**: CRUD verbs + entity nouns (`findById`, `findAll`, `create`, `update`, `delete`, `count`, `deleteByFilter`)
- **React hooks**: `useSomething` pattern, exported as named exports (e.g., `useProducts`, `useCreateProduct`, `useProductManagement`)
- **Middleware functions**: descriptive camelCase (`authenticateUser`, `optionalAuth`, `errorHandler`, `notFoundHandler`)

### Variables and Constants
- **camelCase** throughout: `organizationId`, `currentOrg`, `mockProductRepository`
- **Boolean flags**: `is` prefix — `isLoading`, `isActive`, `isPending`
- **Test data objects**: named `testData`, `mockData`, or `expected*`
- **HTTP response shape**: consistent keys `data`, `meta`, `message`, `error`

### React Components
- PascalCase functional components
- Props interfaces named `ComponentNameProps` (e.g., `OrganizationProviderProps`)
- Context interfaces use the context name + `State` (e.g., `OrganizationContextState`)
- Context objects named after their domain (e.g., `OrganizationContext`)

---

## Code Organization Patterns

### Backend Structure
```
backend/
  config/         — DI container, DB connection, logger config
  repositories/   — Data access (BaseRepository + entity repos)
  services/       — Business logic
  controllers/    — HTTP handlers (thin, delegate to services)
  routes/         — Express route definitions
  middleware/     — Auth, validation, error handling, rate limiting
  utils/          — Logger, helpers
  tests/          — Jest tests (unit/, integration/, generated/, helpers/)
```

### Frontend Structure
```
frontend/src/
  App.tsx             — Root router with lazy-loaded routes
  context/            — React Contexts (Auth, Organization, GlobalSync)
  contexts/           — Additional contexts (Theme, Language, DateFormat)
  hooks/              — TanStack Query hooks (use*.ts)
  services/
    api/              — Per-entity API service objects (productsService, etc.)
    http/             — httpClient class (fetch-based, token-injecting)
  components/
    features/         — Domain-specific components
    templates/        — Reusable CRUD page templates
    ui/               — Generic UI primitives
    modules/          — Feature modules (dashboard, etc.)
  pages/              — Route-level page components
  types/              — database.ts (Supabase-generated), organization.ts, etc.
```

### Imports Order (Frontend)
1. React and React ecosystem (`react`, `react-router-dom`)
2. External libraries (`@tanstack/react-query`, `lucide-react`)
3. Internal path aliases (`@/context/...`, `@/services/...`)
4. Relative imports (`../hooks/...`, `./Component`)

### Exports
- **Frontend**: named exports preferred (`export function useProducts`, `export const productsService`)
- **Backend**: named exports via destructuring (`module.exports = { ProductService }` or `module.exports = { ProductController }`)
- Some backend modules export default directly (`module.exports = UserService`)

---

## Error Handling Patterns

### Backend
- All service methods wrap logic in `try/catch`:
  ```js
  try {
    // ...
  } catch (error) {
    this.logger.error(`Error doing X: ${error.message}`);
    throw error;  // re-throw to propagate to controller
  }
  ```
- Controllers delegate errors to Express error middleware via `next(error)`:
  ```js
  } catch (error) {
    next(error);
  }
  ```
- Global error handler (`backend/middleware/errorHandler.js`) maps error messages to HTTP status codes by string pattern:
  - `"not found"` → 404
  - `"Access denied"` / `"Unauthorized"` → 403
  - `"required"` / `"Invalid"` → 400
  - `"already exists"` → 409
  - default → 500
- Stack trace included in response body only in `development` mode

### Frontend
- Service functions (`httpClient.ts`) call `handleResponseError` on non-OK responses
- 401 responses trigger session refresh; on failure, redirect to `/login?error=session_expired`
- Hooks (`useProducts`, etc.) catch errors in `queryFn` and return safe fallbacks (`{ data: [], total: 0 }`)
- Mutation hooks use `onError` callbacks to call `toast.error()`
- `ErrorBoundary` component wraps the app for uncaught render errors

---

## Async Patterns

### Backend
- All database operations are `async/await`
- No callbacks; Supabase client returns `{ data, error }` destructured immediately
- `Promise.all` not commonly used; operations are sequential within services

### Frontend
- All API calls use `async/await` inside service methods
- TanStack Query (`useQuery`, `useMutation`) manages all server state — no direct fetch calls in components
- `enabled` guards prevent queries from running before context is ready:
  ```ts
  enabled: options.enabled !== false && !!currentOrganization
  ```
- Query keys include `organizationId` for cache isolation per org:
  ```ts
  queryKey: ["products", currentOrganization?.organization_id]
  ```
- `staleTime: 5 * 60 * 1000` (5 minutes) on entity queries

---

## React Patterns

### Hooks
- Each entity domain has a set of hooks in `frontend/src/hooks/use<Entity>.ts`:
  - `use<Entity>()` — list query
  - `use<Entity>(id)` — single item query
  - `useCreate<Entity>()` — mutation
  - `useUpdate<Entity>()` — mutation
  - `useDelete<Entity>()` — mutation
  - `use<Entity>Management()` — composite hook bundling all above
- Hooks consume context via `useOrganization()` to scope queries to the current org

### Context
- Contexts are in `frontend/src/context/` and `frontend/src/contexts/`
- Pattern: `createContext` → `useContextName` custom hook (throws if used outside provider) → `ContextNameProvider`
- Organization context reads from `localStorage` synchronously to avoid flicker
- Contexts depend on each other in a hierarchy: `AuthContext` → `OrganizationContext` → domain hooks

### Component Composition
- All dashboard routes are `React.lazy()` in `App.tsx`; only login/auth pages are eagerly loaded
- Lazy routes wrapped in `<Suspense fallback={null}>` — `GlobalLoading` handles visual feedback
- `ProtectedRoute` component guards authenticated pages
- Template components in `components/templates/` used for standardized CRUD pages

### State Management
- Server state: TanStack Query (no Redux)
- Local UI state: `useState`, `useRef`, `useCallback` from React
- Persistent state: `localStorage` for org context, theme, onboarding

---

## Backend OOP and DI Patterns

### BaseRepository
`backend/repositories/BaseRepository.js` provides:
- `findById(id, idColumn)` — single entity lookup
- `findAll(filters, options)` — filtered list with pagination/sorting
- `create(entityData)` — insert with detailed error logging
- `update(id, updates, idColumn)` — auto-sets `updated_at`
- `delete(id, idColumn)` — hard delete
- `count(filters)` — exact count
- `deleteByFilter(filters)` — bulk delete by conditions

Entity repositories extend `BaseRepository` and add domain-specific methods.

### Dependency Injection
- All classes use constructor injection:
  ```js
  class ProductService {
    constructor(productRepository, stockMovementRepository, stockReservationRepository, logger) {
      this.repository = productRepository;
      // ...
    }
  }
  ```
- `backend/config/container.js` (`ServiceFactory`) instantiates and wires the full graph
- Controllers receive services; services receive repositories and logger
- No singleton registries — instances created fresh by the factory

### Logger
`backend/utils/Logger.js` is a lightweight wrapper:
- Instantiated per class: `this.logger = new Logger('ProductController')`
- Methods: `info`, `error`, `warn`, `debug`
- Outputs JSON with `timestamp`, `level`, `service`, `message`, and optional `meta`
- `debug` only logs in `development` mode

### API Response Format
Controllers return consistent shapes:
- Success list: `{ data: [...], meta: { total, organizationId, ...options } }`
- Success single: `{ data: entity }`
- Success create: `{ data: entity, message: "X created successfully" }`
- Error: `{ error: "message", code?: "CODE" }` (from middleware or inline)

---

## Common Utilities and Helpers

### Backend
- `backend/utils/Logger.js` — structured JSON logger
- `backend/middleware/validation.js` — request body validation (Joi-based)
- `backend/middleware/sanitization.js` — input sanitization
- `backend/middleware/permissions.js` — role/permission checks
- `backend/middleware/organizationContext.js` — org ID resolution from header

### Frontend
- `frontend/src/lib/toast.ts` — toast notification wrapper (sonner)
- `frontend/src/services/http/httpClient.ts` — fetch wrapper with auth injection and error handling
- `frontend/src/types/database.ts` — Supabase-generated TypeScript types (source of truth for DB shapes)
- `clsx` + `tailwind-merge` for conditional class composition
- `date-fns` for date formatting
