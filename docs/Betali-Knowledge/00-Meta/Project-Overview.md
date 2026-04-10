---
tags: [meta, overview, documentation]
project: betali
type: meta
created: 2026-04-09
updated: 2026-04-09
---
# Betali - Proyecto Overview

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind v4 + TanStack Query
- **Backend**: Node.js + Express + Supabase + Clean Architecture
- **Package Manager**: Bun (workspaces)

## Commands
- `bun run front` - Iniciar frontend (puerto 3000)
- `bun run back` - Iniciar backend (puerto 4000)

## Arquitectura
- Multi-tenant SaaS (organización = tenant)
- Auth con Supabase JWT
- Clean Architecture en backend

## Estructura
- `/frontend` - React app
- `/backend` - Express API
- `/docs` - Documentación

## QA & Auditorías
- [[05-QA/PRD-QA-001-Bugs-Performance-2026-04-10]] — Auditoría de bugs y performance (2026-04-10)
