# STRUCTURE.md

## Top-Level Directory Layout

```
/Users/santiagoalaniz/Dev/Personal/SaasRestaurant/
├── backend/              — Node.js + Express API (port 4000)
├── frontend/             — React + Vite SPA (port 3000)
├── docs/                 — Project documentation (architecture, PRDs, roadmaps)
├── scripts/              — Root-level tooling scripts (AI agents, QA gates, smoke tests)
├── supabase/             — Supabase local config (config.toml)
├── .planning/            — AI planning documents (this directory)
├── package.json          — Bun workspace root; defines all run scripts
├── bun.lock              — Lockfile for all workspaces
├── CLAUDE.md             — AI assistant instructions
├── database.types.ts     — Shared Supabase generated types (root-level copy)
└── agent-loop-output/    — Output from AI agent loop runs
```

---

## Backend Structure (`backend/`)

```
backend/
├── server.js             — Entry point; Application class; Express bootstrap
├── package.json          — Backend dependencies (Express, Supabase, Helmet, Winston, Jest, etc.)
├── jest.config.js        — Jest test configuration
├── database.types.ts     — Supabase-generated TypeScript types for DB schema
├── DATABASE_SCHEMA.md    — Human-readable schema documentation
│
├── config/
│   ├── container.js      — IoC dependency injection container + ServiceFactory
│   ├── database.js       — DatabaseConfig class (Supabase client init + healthCheck)
│   ├── logger.js         — Logger config
│   ├── supabase.js       — Supabase client factory
│   └── migration-status.json
│
├── middleware/
│   ├── auth.js           — authenticateUser, optionalAuth (JWT → req.user)
│   ├── organizationContext.js — requireOrganizationContext, optionalOrganizationContext
│   ├── permissions.js    — PERMISSIONS constants + checkPermission middleware
│   ├── rateLimiting.js   — generalLimiter, searchLimiter, createLimiter (per-route)
│   ├── sanitization.js   — sanitizeMiddleware, SANITIZATION_RULES
│   ├── validation.js     — validateRequest (wraps Zod schemas)
│   ├── errorHandler.js   — centralized error handler + notFoundHandler
│   ├── fileUpload.js     — multer-based file upload handling
│   ├── limitEnforcement.js — plan-based feature limit enforcement
│   └── mercadoPagoWebhook.js — MercadoPago webhook signature verification
│
├── repositories/
│   ├── BaseRepository.js — Generic CRUD: findById, findAll, create, update, delete, count
│   ├── ProductRepository.js
│   ├── WarehouseRepository.js
│   ├── StockMovementRepository.js
│   ├── StockReservationRepository.js
│   ├── OrderRepository.js
│   ├── OrderDetailRepository.js
│   ├── PurchaseOrderRepository.js
│   ├── PurchaseOrderDetailRepository.js
│   ├── ClientRepository.js
│   ├── SupplierRepository.js
│   ├── UserRepository.js
│   ├── OrganizationRepository.js
│   ├── UserOrganizationRepository.js
│   ├── PricingTierRepository.js
│   ├── CustomerPricingRepository.js
│   ├── TaxRateRepository.js
│   ├── ProductTaxGroupRepository.js
│   ├── DiscountRuleRepository.js
│   ├── AppliedDiscountRepository.js
│   ├── InventoryAlertRepository.js
│   ├── SubscriptionRepository.js
│   ├── SubscriptionPlanRepository.js
│   └── TableConfigRepository.js
│
├── services/
│   ├── ProductService.js
│   ├── WarehouseService.js
│   ├── StockMovementService.js
│   ├── DashboardService.js
│   ├── OrderService.js
│   ├── PurchaseOrderService.js
│   ├── PricingService.js
│   ├── ClientService.js
│   ├── SupplierService.js
│   ├── UserService.js
│   ├── OrganizationService.js
│   ├── TaxRateService.js
│   ├── DiscountRuleService.js
│   ├── InventoryAlertService.js
│   ├── SubscriptionService.js
│   ├── SubscriptionPlanService.js
│   ├── SubscriptionCronService.js
│   ├── TableConfigService.js
│   ├── MercadoPagoService.js
│   ├── EmailService.js
│   ├── OrderPdfService.js
│   ├── ReceiptService.js
│   └── WebhookRetryService.js
│
├── controllers/
│   ├── ProductController.js
│   ├── WarehouseController.js
│   ├── StockMovementController.js
│   ├── DashboardController.js
│   ├── OrderController.js
│   ├── PurchaseOrderController.js
│   ├── PricingController.js
│   ├── ClientController.js
│   ├── SupplierController.js
│   ├── UserController.js
│   ├── OrganizationController.js
│   ├── TaxRateController.js
│   ├── DiscountRuleController.js
│   ├── InventoryAlertController.js
│   ├── SubscriptionController.js
│   ├── SubscriptionPlanController.js
│   ├── MercadoPagoController.js
│   ├── TableConfigController.js
│   └── DebugController.js
│
├── routes/
│   ├── products.js
│   ├── warehouse.js
│   ├── stockMovements.js
│   ├── dashboard.js
│   ├── orders.js           — uses createOrderRoutes(container) factory
│   ├── purchase-orders.js
│   ├── pricing.js          — uses createPricingRoutes(container) factory
│   ├── clients.js
│   ├── suppliers.js
│   ├── users.js
│   ├── organizations.js    — uses createOrganizationRoutes(container) factory
│   ├── taxRates.js
│   ├── discountRules.js
│   ├── subscriptions.js
│   ├── subscriptionPlans.js
│   ├── mercadopago.js
│   ├── inventoryAlerts.js
│   ├── tableConfig.js
│   ├── auth.js
│   ├── health.js
│   ├── cron.js
│   └── debug.js            — development only
│
├── validations/
│   ├── authValidation.js
│   ├── productValidation.js
│   ├── warehouseValidation.js
│   ├── stockMovementValidation.js
│   ├── orderValidation.js
│   ├── organizationValidation.js
│   ├── userValidation.js
│   ├── discountRuleValidation.js
│   ├── pricingValidation.js
│   └── taxRateValidation.js
│
├── utils/
│   ├── Logger.js           — Winston-based structured logger
│   ├── i18n.js             — Internationalization utility
│   ├── roleValidation.js   — Role check helpers
│   └── transactionManager.js
│
├── jobs/
│   └── inventoryAlertChecker.js — Background job: periodic stock threshold checks
│
├── lib/
│   └── supabaseClient.js   — Singleton Supabase client (service key)
│
├── locales/
│   ├── en.json
│   └── es.json
│
├── migrations/             — SQL migration files
├── scripts/                — One-off migration/seed/debug scripts
├── tests/                  — Jest test files
│   └── integration/
└── logs/                   — Winston log output
```

---

## Frontend Structure (`frontend/src/`)

```
frontend/src/
├── main.tsx              — ReactDOM.createRoot entry point
├── App.tsx               — Provider stack + BrowserRouter + all route definitions
├── index.css             — Global base styles (Tailwind imports)
├── output.css            — Tailwind generated output
├── vite-env.d.ts         — Vite env type declarations
│
├── pages/                — Route-level page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── Welcome.tsx
│   ├── NotFound.tsx
│   ├── TermsOfService.tsx
│   ├── PrivacyPolicy.tsx
│   └── Dashboard/        — All dashboard pages (lazily loaded)
│       ├── index.tsx     — /dashboard (stats overview)
│       ├── Products.tsx
│       ├── Warehouse.tsx
│       ├── StockMovements.tsx
│       ├── Orders.tsx
│       ├── PurchaseOrders.tsx
│       ├── Clients.tsx
│       ├── Suppliers.tsx
│       ├── Users.tsx
│       ├── Organizations.tsx
│       ├── TaxManagement.tsx
│       ├── Pricing.tsx
│       ├── Settings.tsx
│       ├── Help.tsx
│       ├── SubscriptionManagement.tsx
│       ├── PaymentHistory.tsx
│       ├── PaymentSuccess.tsx
│       ├── PaymentFailure.tsx
│       └── PaymentPending.tsx
│
├── components/
│   ├── ProtectedRoute.tsx  — Auth guard; redirects to /login if no session
│   ├── ErrorBoundary.tsx   — React error boundary
│   ├── layout/
│   │   ├── Dashboard/      — DashboardLayout wrapper (shell with sidebar)
│   │   └── Sidebar/        — Navigation sidebar
│   ├── templates/          — Reusable page-level scaffolding
│   │   ├── crud-page.tsx   — Generic list-page with header, table, error state
│   │   ├── modal-form.tsx  — Generic create/edit modal
│   │   ├── form-section.tsx
│   │   ├── stats-section.tsx
│   │   └── index.ts
│   ├── features/           — Domain feature components (by entity)
│   │   ├── products/
│   │   ├── orders/
│   │   ├── warehouse/
│   │   ├── stock-movements/
│   │   ├── clients/
│   │   ├── suppliers/
│   │   ├── purchase-orders/
│   │   ├── organizations/
│   │   ├── users/
│   │   ├── taxes/
│   │   ├── alerts/
│   │   ├── billing/
│   │   ├── settings/
│   │   └── help/
│   ├── modules/
│   │   └── dashboard/      — DashboardStats and related assembled modules
│   ├── table/              — Table-specific shared components
│   ├── ui/                 — Primitive UI components
│   │   ├── button.tsx, badge.tsx, card.tsx, dialog.tsx, dropdown-menu.tsx
│   │   ├── data-table.tsx  — TanStack Table wrapper
│   │   ├── toast.tsx / ToastContainer
│   │   ├── global-loading.tsx
│   │   └── (many more primitives)
│   └── common/             — Shared utility components
│
├── context/                — Primary React contexts
│   ├── AuthContext.tsx     — Supabase session + auth actions
│   ├── OrganizationContext.tsx — Current org, switching, permissions
│   ├── GlobalSyncContext.tsx   — Global loading state
│   └── UserContextSwitcher.tsx
│
├── contexts/               — Secondary/UI contexts
│   ├── DateFormatContext.tsx
│   ├── LanguageContext.tsx
│   ├── ThemeContext.tsx
│   └── OnboardingContext.tsx
│
├── hooks/                  — TanStack Query + mutation hooks by domain
│   ├── useAuthStateChange.ts
│   ├── useProducts.ts
│   ├── useOrders.ts
│   ├── useWarehouse.ts
│   ├── useWarehouseForm.ts
│   ├── useStockMovement.ts
│   ├── useStockMovementForm.ts
│   ├── useClients.ts
│   ├── useSuppliers.ts
│   ├── usePurchaseOrders.ts
│   ├── useOrganizations.ts
│   ├── useUsers.ts
│   ├── usePricing.ts
│   ├── useTaxRates.ts
│   ├── useDiscountRules.ts
│   ├── useSubscriptionPlans.ts
│   ├── useAvailableStock.ts
│   ├── useFeatureAccess.ts
│   ├── usePermissions.ts
│   ├── useTableConfig.ts
│   ├── useConfirmDialog.ts
│   ├── useDateTranslations.ts
│   └── useToast.ts
│
├── services/
│   ├── api.ts              — Central apiService aggregator
│   ├── authService.ts      — Auth-specific API calls
│   ├── alertService.ts     — Alert API calls
│   ├── http/
│   │   └── httpClient.ts   — HttpClient class (auth + org headers)
│   └── api/                — Domain service modules
│       ├── productsService.ts
│       ├── warehouseService.ts
│       ├── stockMovementService.ts
│       ├── orderService.ts
│       ├── clientService.ts
│       ├── supplierService.ts
│       ├── purchaseOrdersService.ts
│       ├── organizationService.ts
│       ├── userService.ts
│       ├── subscriptionService.ts
│       ├── mercadoPagoService.ts
│       ├── tableConfigService.ts
│       └── index.ts
│
├── types/
│   ├── database.ts         — Supabase-generated TypeScript types
│   ├── database-tables.ts  — Supplemental DB table types
│   ├── organization.ts     — Organization / UserRole / UserOrganizationWithDetails types
│   ├── purchaseOrders.ts
│   └── table.ts            — Table configuration types
│
├── lib/
│   ├── supabase.ts         — Supabase client (anon key) for frontend auth
│   ├── utils.ts            — `cn()` classname utility (clsx + tailwind-merge)
│   └── providers/
│       └── query-provider.tsx — TanStack QueryClient config + QueryClientProvider
│
├── config/                 — Frontend config constants
├── constants/              — Shared constant values
├── locales/                — Frontend i18n strings
├── styles/                 — Additional CSS
├── utils/                  — Frontend utility functions
├── assets/                 — Static assets
└── validations/            — Zod schemas for frontend form validation
```

---

## Key File Locations

| Purpose | Path |
|---|---|
| Backend entry point | `backend/server.js` |
| DI container | `backend/config/container.js` |
| Supabase client (backend, service key) | `backend/lib/supabaseClient.js` |
| Auth middleware | `backend/middleware/auth.js` |
| Org context middleware | `backend/middleware/organizationContext.js` |
| BaseRepository | `backend/repositories/BaseRepository.js` |
| Backend env vars | `backend/.env` |
| Frontend entry point | `frontend/src/main.tsx` |
| App root + routing | `frontend/src/App.tsx` |
| TanStack Query config | `frontend/src/lib/providers/query-provider.tsx` |
| HTTP client | `frontend/src/services/http/httpClient.ts` |
| API service aggregator | `frontend/src/services/api.ts` |
| Auth context | `frontend/src/context/AuthContext.tsx` |
| Organization context | `frontend/src/context/OrganizationContext.tsx` |
| Supabase client (frontend, anon key) | `frontend/src/lib/supabase.ts` |
| Supabase DB types | `frontend/src/types/database.ts` |
| Organization types | `frontend/src/types/organization.ts` |
| Vite config | `frontend/vite.config.ts` |
| Workspace root scripts | `package.json` |
| Architecture docs | `docs/architecture/SAAS_ARCHITECTURE.md` |

---

## Naming Conventions

### Backend (JavaScript / CommonJS)

- Files: `PascalCase` for classes (`OrderService.js`, `BaseRepository.js`), `camelCase` for utilities (`logger.js`, `i18n.js`)
- Classes: `PascalCase` (`OrderService`, `Container`, `Application`)
- Methods: `camelCase` (`createOrder`, `findById`, `setupMiddleware`)
- Route factories: `createXxxRoutes(container)` pattern for routes needing DI
- Container registration keys: `camelCase` matching the class (e.g., `'orderController'`, `'orderService'`)
- Routes: kebab-case filenames matching URL paths (`purchase-orders.js` → `/api/purchase-orders`)

### Frontend (TypeScript / ESM)

- Files: `PascalCase` for components/pages (`OrderController.tsx`, `CRUDPage.tsx`), `camelCase` for hooks/services (`useOrders.ts`, `orderService.ts`), `kebab-case` for UI primitives (`data-table.tsx`, `crud-page.tsx`)
- Hooks: `use` prefix (`useOrders`, `usePermissions`)
- Contexts: `XxxContext` / `XxxProvider` / `useXxx` triple
- Service modules: `xxxService` (camelCase with `Service` suffix)
- Path alias: `@/` maps to `frontend/src/` (configured in `vite.config.ts`)
- Query keys: array form `['resource-name', orgId?, ...filters]`
- Context files live in two directories: primary business contexts in `context/`, UI preference contexts in `contexts/`
