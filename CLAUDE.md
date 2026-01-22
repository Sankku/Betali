# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 AI Assistant Priority Instructions

**CRITICAL**: Betali is currently undergoing a major architecture migration to a SaaS multi-tenant model.

### 📖 Required Reading (in order):

1. **`/docs/architecture/SAAS_ARCHITECTURE.md`** - 🚨 **READ FIRST** - Complete specification for the new SaaS multi-tenant architecture we're implementing. This is the definitive guide for all development decisions during migration.

2. **`/docs/architecture/BETALI_MCP_DOCS.md`** - Original MCP-style documentation with established patterns and best practices.

3. **`/docs/README.md`** - Documentation structure guide for finding specific docs.

### ⚠️ Migration Status
- **Current State**: Hybrid architecture (old + new patterns)
- **Target State**: Self-service SaaS multi-tenant (similar to Discord/Notion)
- **Implementation Rule**: ALL new features must follow the new SaaS architecture
- **Legacy Support**: Existing features being gradually migrated

## Project Overview

This is Betali - a full-stack business inventory management SaaS platform built as a monorepo using Bun workspaces. **Currently transitioning to a SaaS multi-tenant architecture** to serve businesses of all types with comprehensive inventory and business management solutions.

## Development Commands

### Root Level Commands
- `bun run front` - Start frontend development server
- `bun run back` - Start backend server

### Frontend (`/frontend/`)
- `bun run dev` - Start Vite development server (port 3000)
- `bun run build` - Build for production (includes TypeScript compilation)
- `bun run lint` - Run ESLint with TypeScript support
- `bun run preview` - Preview production build

### Backend (`/backend/`)
- `bun run start` - Start production server (port 4000)
- `bun run dev` - Start with watch mode using Bun
- `bun run test` - Run Jest tests
- `bun run lint` - Run ESLint
- `bun run health` - Health check endpoint test
- `bun run db:test` - Test database connection

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + TanStack Query
- **Backend**: Node.js + Express + Supabase (PostgreSQL) + Clean Architecture
- **Package Manager**: Bun (workspaces setup)

### Code Organization

**Backend follows Clean Architecture pattern:**
- `config/` - Database and service configurations
- `repositories/` - Data access layer with BaseRepository pattern
- `services/` - Business logic layer  
- `controllers/` - HTTP handlers
- `routes/` - Express route definitions
- `middleware/` - Authentication, validation, error handling

**Frontend uses feature-based structure:**
- `components/templates/` - Reusable CRUD page templates
- `components/features/` - Domain-specific components
- `services/` - API client with authentication
- `types/database.ts` - Generated Supabase types
- Path alias `@/` maps to `src/`

### Database
- Uses Supabase with TypeScript types in `/frontend/src/types/database.ts`
- Main entities: products, warehouse, stock_movements, orders, clients, users, organizations
- Multi-tenant architecture with organization-based data isolation

### Authentication
- Supabase Auth with JWT tokens
- Protected routes use authentication middleware
- Frontend handles token refresh automatically

## Testing

**Backend**: Jest with custom API testing scripts in `/scripts/`
**Frontend**: ESLint for code quality (no test files currently)

## Important Patterns

- Use BaseRepository pattern for database operations
- Follow existing TypeScript strict typing
- Use TanStack Query for server state management
- Template components in `/frontend/src/components/templates/` for CRUD operations
- Structured logging with Winston in backend
- Error handling with centralized middleware

## Development Notes

- Frontend runs on port 3000, backend on port 4000
- Environment variables required for Supabase connection
- Use `@/` import alias in frontend for cleaner imports
- Backend uses OOP with dependency injection pattern
- All API responses follow consistent format