# INTEGRATIONS.md — Betali External Integrations

## Database

### Supabase (PostgreSQL)
- **Type:** Managed PostgreSQL via Supabase
- **Project URL:** configured via `SUPABASE_URL` env var
- **Backend client:** `backend/lib/supabaseClient.js` — singleton using `@supabase/supabase-js` with the service role key (`SUPABASE_SERVICE_KEY`). Bypasses Row Level Security.
- **Frontend client:** `frontend/src/lib/supabase.ts` — typed client (`Database` type from `frontend/src/types/database.ts`) using the anon/public key (`VITE_SUPABASE_ANON_KEY`). Respects RLS.
- **Direct pg:** `pg` package (`^8.14.0`) is also installed on the backend for raw SQL when needed.

#### Key Tables (inferred from codebase)
- `users`, `organizations`, `user_organizations` — multi-tenant auth/membership
- `products`, `warehouse`, `stock_movements` — inventory
- `orders`, `clients`, `suppliers` — commerce
- `subscriptions`, `subscription_plans`, `payments` — SaaS billing
- `webhook_logs` — audit log for failed webhook verifications
- `inventory_alerts`, `purchase_orders`, `discount_rules`, `tax_rates` — business rules

#### Multi-tenant Pattern
Organization context is passed via `x-organization-id` request header. The auth middleware (`backend/middleware/auth.js`) queries `user_organizations` on every authenticated request to resolve org roles and inject `req.user.currentOrganizationId`.

---

## Auth Provider

### Supabase Auth
- **Type:** JWT-based authentication managed by Supabase
- **Backend verification:** `supabase.auth.getUser(token)` called in `backend/middleware/auth.js` on every protected request
- **Frontend session:** `supabase.auth.getSession()` used in `frontend/src/services/http/httpClient.ts` to attach `Authorization: Bearer <token>` headers
- **Auth UI:** `@supabase/auth-ui-react` and `@supabase/auth-ui-shared` provide pre-built login/signup components
- **Fallback token format:** The auth middleware also supports a Base64-encoded temporary token format (for testing/dev)
- **Self-healing:** If a valid Supabase user has no `public.users` profile, the middleware auto-creates one

#### Role Hierarchy (per-organization)
`viewer` → `employee` → `manager` → `admin` → `super_admin` → `owner`

---

## Payment Processor

### MercadoPago
- **SDK:** `mercadopago` npm package (`^2.3.0`)
- **Backend service:** `backend/services/MercadoPagoService.js`
- **Backend controller:** `backend/controllers/MercadoPagoController.js`
- **Frontend service:** `frontend/src/services/api/mercadoPagoService.ts`
- **Env vars:**
  - `MERCADOPAGO_ACCESS_TOKEN` (backend, secret) — `TEST-xxx` for sandbox, `APP_USR-xxx` for production
  - `MERCADOPAGO_WEBHOOK_SECRET` (backend, secret) — HMAC-SHA256 webhook verification
  - `VITE_MERCADOPAGO_PUBLIC_KEY` (frontend, public) — used with MercadoPago Payment Brick

#### Supported Operations
- Create checkout preferences (`POST /api/mercadopago/create-checkout`)
- Process Payment Brick payments (`POST /api/mercadopago/process-payment`)
- Get payment status (`GET /api/mercadopago/payment/:paymentId`)
- Get subscription payment history
- Cancel subscriptions
- Download payment receipts as PDF (via `pdfkit`)
- Fetch supported payment methods by country code

#### Supported Currencies
`ARS`, `USD`, `BRL`, `MXN`, `CLP`, `COP`, `PEN`, `UYU` (Latin American markets)

---

## Webhooks

### MercadoPago Webhooks
- **Inbound endpoint:** `POST /api/webhooks/mercadopago`
- **Verification endpoint:** `GET /api/webhooks/mercadopago` (URL reachability check required by MP)
- **Middleware:** `backend/middleware/mercadoPagoWebhook.js`
- **Signature algorithm:** HMAC-SHA256 over `"id:[data.id];request-id:[x-request-id];ts:[timestamp];"` manifest
- **Replay protection:** 5-minute timestamp tolerance enforced
- **Failed attempt logging:** Logs to `webhook_logs` Supabase table

#### Webhook Retry System
- **Service:** `backend/services/WebhookRetryService.js`
- **Trigger:** `POST /api/cron/webhooks/retry` (protected by `CRON_SECRET`)
- **Status check:** `GET /api/cron/webhooks/status`

---

## Email

### Resend
- **SDK:** `resend` npm package (`^6.9.1`)
- **Service:** `backend/services/EmailService.js`
- **Env vars:**
  - `RESEND_API_KEY` — API key from resend.com dashboard
  - `EMAIL_FROM` — Verified sender address (e.g., `Betali <noreply@betali.space>`)
- **Domain:** `betali.space` (development), `betali.app` (referenced in templates as fallback)
- **Usage:** Transactional emails — subscription reminders, trial expiry notifications, plan change confirmations

---

## Cron / Scheduled Jobs

Cron tasks are triggered externally via HTTP endpoints protected by `CRON_SECRET` header (`x-cron-secret`).

- **Endpoint base:** `POST /api/cron/`
- **Service:** `backend/services/SubscriptionCronService.js`
- **Tasks:**
  | Task | Endpoint |
  |------|----------|
  | All subscription tasks | `POST /api/cron/subscriptions/process` |
  | Trial expiring reminders | `POST /api/cron/subscriptions/trial-expiring` |
  | Process expired trials | `POST /api/cron/subscriptions/trial-expired` |
  | Subscription expiring reminders | `POST /api/cron/subscriptions/subscriptions-expiring` |
  | Process expired subscriptions | `POST /api/cron/subscriptions/subscriptions-expired` |
  | Apply scheduled plan changes | `POST /api/cron/subscriptions/plan-changes` |
  | Webhook retry queue | `POST /api/cron/webhooks/retry` |
  | Run all tasks | `POST /api/cron/all` |

No internal scheduler (e.g., node-cron) is present; the platform expects an external cron caller (e.g., Vercel Cron, GitHub Actions, or a managed cron service).

---

## Analytics

### Vercel Analytics
- **Package:** `@vercel/analytics` (`^2.0.0`)
- **Scope:** Frontend only
- **Purpose:** Page view and web vitals tracking (implies deployment on Vercel)

---

## MCP (Model Context Protocol)

### project-docs-mcp
- **Location:** `/project-docs-mcp/`
- **SDK:** `@modelcontextprotocol/sdk` (installed in both root and backend)
- **Purpose:** Exposes project documentation as an MCP server for AI assistant tooling (Claude, etc.)
- **Backend SDK version:** `^1.25.3`
- **Root SDK version:** `^1.17.4`

---

## AI / LLM Tooling (Dev-time)

Not a runtime integration — used in local development automation scripts (`scripts/`):
- **Ollama** — local LLM runner (`qwen2.5-coder:7b` model, set up via `bun run ollama:setup`)
- **Scripts:** `ai-review.js`, `ai-test-gen.js`, `ai-fix.js`, `ai-auto-qa.js`, `ai-agent-loop.js`, `ai-explorer.js`

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (backend only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Alias for `SUPABASE_SERVICE_KEY` |
| `MERCADOPAGO_ACCESS_TOKEN` | MP payment access token |
| `MERCADOPAGO_WEBHOOK_SECRET` | MP webhook HMAC secret |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender address (must be verified domain) |
| `FRONTEND_URL` | Used for CORS and email redirect links |
| `CRON_SECRET` | Protects `/api/cron/*` endpoints |
| `PORT` | Backend port (default: 4000) |
| `NODE_ENV` | Environment (`development` / `production`) |

### Frontend (`frontend/.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:4000`) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | MP public key for Payment Brick |
