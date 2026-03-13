# STACK.md — Betali Technology Stack

## Languages and Runtimes

| Layer | Language | Version |
|-------|----------|---------|
| Frontend | TypeScript | ^5.9.3 |
| Backend | JavaScript (Node.js) | >=18.0.0 (required) |
| Package Manager | Bun | workspace orchestrator |
| Backend runtime | Node.js (started via `node server.js` or `bun --watch`) | >=18.0.0 |
| Frontend build | TypeScript compiled to ESNext via Vite | ES2020 target |

Bun is used as the package manager and workspace runner at the monorepo root. The backend runs under Node.js (not Bun runtime), as confirmed by `"start": "node server.js"` in `backend/package.json`. Dev mode uses `bun --watch run server.js` for hot reload.

## Monorepo Structure

```
/                         # Root workspace (Bun workspaces)
├── frontend/             # React SPA (TypeScript)
├── backend/              # Express API (JavaScript/Node.js)
├── project-docs-mcp/     # MCP server for documentation
└── scripts/              # AI tooling and quality gate scripts
```

Root workspace config: `/package.json`

## Frontend Framework and Libraries

**Framework:** React 19 (`^19.2.3`) with Vite 7 (`^7.3.1`)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `react` / `react-dom` | ^19.2.3 | UI framework |
| `react-router-dom` | ^7.12.0 | Client-side routing |
| `@tanstack/react-query` | ^5.90.19 | Server state management / data fetching |
| `@tanstack/react-table` | ^8.21.3 | Headless table primitives |
| `tailwindcss` | ^4.1.18 | Utility-first CSS (v4) |
| `@tailwindcss/vite` | ^4.1.18 | Tailwind Vite plugin |
| `lucide-react` | ^0.562.0 | Icon library |
| `recharts` | ^3.7.0 | Chart/data visualization |
| `sonner` | ^2.0.7 | Toast notifications |
| `date-fns` | ^4.1.0 | Date utilities |
| `react-hook-form` | ^7.58.0 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Form validation adapters |
| `yup` | ^1.7.1 | Schema validation (used with react-hook-form) |
| `zod` | ^3.25.64 | Schema validation (root-level) |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.4.0 | Conditional class utilities |
| `@supabase/supabase-js` | ^2.91.0 | Supabase client |
| `@supabase/auth-ui-react` | ^0.4.7 | Pre-built auth UI components |
| `@vercel/analytics` | ^2.0.0 | Vercel analytics |

Config files:
- `frontend/vite.config.ts` — Vite config with `@/` path alias to `src/`
- `frontend/tsconfig.app.json` — Strict TypeScript, ES2020 target, bundler moduleResolution
- `frontend/postcss.config.mjs` — PostCSS for Tailwind
- `frontend/eslint.config.js` — ESLint with TypeScript rules

## Backend Framework and Libraries

**Framework:** Express 5 (`^5.2.1`) on Node.js

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `express` | ^5.2.1 | HTTP framework |
| `@supabase/supabase-js` | ^2.39.7 | Supabase client (service role) |
| `mercadopago` | ^2.3.0 | MercadoPago payment SDK |
| `resend` | ^6.9.1 | Email delivery SDK |
| `winston` | ^3.11.0 | Structured logging |
| `express-rate-limit` | ^8.0.1 | API rate limiting |
| `express-slow-down` | ^2.1.0 | Progressive request slowdown |
| `helmet` | ^8.1.0 | Security HTTP headers |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^16.4.7 | Environment variable loading |
| `joi` | ^17.13.3 | Request validation |
| `bcryptjs` | ^3.0.2 | Password hashing |
| `multer` | ^2.0.2 | Multipart file uploads |
| `pdfkit` | ^0.17.2 | PDF generation (receipts/orders) |
| `uuid` | ^9.0.1 | UUID generation |
| `validator` | ^13.15.26 | String validation |
| `xss` + `dompurify` | ^1.0.15 / ^3.2.6 | XSS sanitization |
| `i18next` | ^25.3.2 | Internationalization |
| `i18next-fs-backend` | ^2.6.0 | i18n file system backend |
| `axios` | ^1.8.3 | HTTP client for external calls |
| `pg` | ^8.14.0 | Direct PostgreSQL client |
| `body-parser` | ^2.2.2 | Request body parsing |
| `@modelcontextprotocol/sdk` | ^1.25.3 | MCP server SDK |
| `esbuild` | ^0.27.2 | JS bundler/minifier |

Dev dependencies:
| Dependency | Version | Purpose |
|-----------|---------|---------|
| `jest` | ^29.7.0 | Unit/integration test runner |
| `supertest` | ^6.3.3 | HTTP assertion for Jest tests |
| `nodemon` | ^3.0.2 | Dev file watcher (alternative) |
| `prettier` | ^3.1.1 | Code formatting |
| `eslint` | ^8.56.0 | Linting |

Config files:
- `backend/jest.config.js` — Jest config, sequential workers (maxWorkers: 1), coverage on controllers/services/repositories/middleware
- `backend/.env` / `backend/.env.example` — Environment configuration

## Build Tools

| Tool | Version | Role |
|------|---------|------|
| Vite | ^7.3.1 | Frontend dev server and bundler |
| `tsc` | ^5.9.3 | TypeScript type checking (frontend) |
| esbuild | ^0.27.2 | Fast JS bundling (backend) |
| Bun | (monorepo default) | Workspace runner, install, scripts |

Build commands:
- Frontend: `tsc && vite build` (`frontend/package.json`)
- Backend: runs directly via `node server.js` (no separate build step required in production)

## Testing

| Tool | Scope | Config |
|------|-------|--------|
| Jest | Backend unit/integration | `backend/jest.config.js` |
| Playwright | Frontend E2E | `frontend/playwright.config.ts` |
| supertest | Backend API testing | Used within Jest tests |

Playwright targets Chromium by default (`frontend/playwright.config.ts`), with retries=2 on CI. Tests live under `frontend/tests/e2e/`.

## Security Middleware

Applied in backend (`backend/middleware/`):
- `helmet` — Security headers
- `express-rate-limit` — Tiered rate limiting (general/auth/create/search)
- `express-slow-down` — Progressive slowdown after 300 req/15min
- `sanitization.js` — XSS scrubbing via `xss` + `dompurify`
- `validation.js` — Joi schema validation
- Rate limiters are no-ops in non-production to avoid E2E test interference

## AI/Automation Scripts

Located in `scripts/`:
- `ai-review.js`, `ai-test-gen.js`, `ai-fix.js`, `ai-auto-qa.js`, `ai-explorer.js`, `ai-agent-loop.js`
- Local LLM support via Ollama (`qwen2.5-coder:7b`)
- Quality gate: `scripts/quality-gate.sh`
- Git hooks setup: `scripts/setup-hooks.sh`

## Configuration Files Summary

| File | Purpose |
|------|---------|
| `/package.json` | Monorepo root, Bun workspaces |
| `/frontend/vite.config.ts` | Vite dev server (port 3000) and build |
| `/frontend/tsconfig.app.json` | Strict TS, ES2020, `@/` alias |
| `/frontend/playwright.config.ts` | E2E test config |
| `/frontend/postcss.config.mjs` | PostCSS/Tailwind pipeline |
| `/frontend/eslint.config.js` | ESLint for TypeScript |
| `/backend/jest.config.js` | Jest for backend tests |
| `/backend/.env.example` | Canonical env var documentation |
